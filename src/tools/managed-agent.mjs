/**
 * src/tools/managed-agent.mjs — the headline wrapper.
 *
 * One call covers the four use patterns documented in docs/managed-agents.md:
 *   - Director       (one-shot quest arc design, returns trace[])
 *   - Hatchery       (per-entity training with code execution; pass `sources`)
 *   - World-balancer (non-blocking; caller broadcasts the trace as it returns)
 *   - Hint-giver     (turn-side, image-grounded; pass `imageContext`)
 *
 * Threading: callers can pass `threadKey` to maintain a per-surface
 * conversation. The bridge's single global `lastInteractionId` was the
 * source of cross-contamination in the prototypes — this fixes it.
 */
import { getClient } from "./client.mjs";

const DEFAULT_AGENT = process.env.MANAGED_AGENT_ID || "antigravity-preview-05-2026";
const DEFAULT_TIMEOUT_MS = Number(process.env.MANAGED_AGENT_TIMEOUT_MS || 300_000);

/** Per-thread last-interaction-id state. Keys are arbitrary strings ("director", "hatchery:m_aqualisk", etc.). */
const threadState = new Map();

/**
 * @param {object} options
 * @param {string} options.prompt              required — the user-facing prompt
 * @param {string} [options.systemInstruction] persona / rules for this thread
 * @param {string} [options.agent]             override agent id
 * @param {string} [options.threadKey]         maintain previous_interaction_id under this key
 * @param {{data: string, mimeType?: string}} [options.imageContext]   pass an inline image
 * @param {Array<{type: "inline", target: string, content: string}>} [options.sources]
 *                                              extra files to inject into the remote env
 * @param {Array<object>} [options.tools]      extra agent tools (default: google_search)
 * @param {number} [options.timeoutMs]
 * @param {object} [options.environment]       custom environment override
 *
 * @returns {Promise<{
 *   text: string,
 *   trace: Array<{type: string, text?: string, query?: string}>,
 *   agent: string,
 *   interactionId: string|null,
 *   environmentId: string|null,
 *   raw: object,
 * }>}
 */
export async function runManagedAgent(options) {
  if (!options?.prompt) throw new Error("runManagedAgent: options.prompt is required");
  const client = getClient();
  const agent = options.agent || DEFAULT_AGENT;
  const timeout = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const tools = options.tools || [{ type: "google_search" }];
  const previousId = options.threadKey ? threadState.get(options.threadKey) : undefined;

  // Build input payload — multimodal if imageContext present.
  let input;
  if (options.imageContext?.data) {
    input = [
      { type: "text", text: options.prompt },
      { type: "image", data: options.imageContext.data, mime_type: options.imageContext.mimeType || "image/jpeg" },
    ];
  } else {
    input = options.prompt;
  }

  const environment = options.environment || {
    type: "remote",
    sources: options.sources || [
      {
        type: "inline",
        target: ".agents/AGENTS.md",
        content:
          options.systemInstruction ||
          "You are a managed agent invoked from an Gemini Display Kit game running on Meta Ray-Ban Display. Be concise, executable, never include secrets.",
      },
    ],
  };

  const interaction = await client.interactions.create(
    {
      agent,
      input,
      ...(previousId ? { previous_interaction_id: previousId } : {}),
      ...(options.systemInstruction ? { system_instruction: options.systemInstruction } : {}),
      environment,
      tools,
    },
    { timeout }
  );

  if (options.threadKey && interaction.id) {
    threadState.set(options.threadKey, interaction.id);
  }

  return {
    text: extractText(interaction),
    trace: extractTrace(interaction),
    agent,
    interactionId: interaction.id || null,
    environmentId: interaction.environment_id || null,
    raw: interaction,
  };
}

/** Clear the previous_interaction_id for a thread (start a fresh conversation). */
export function resetThread(threadKey) {
  threadState.delete(threadKey);
}

function extractText(interaction) {
  if (typeof interaction?.output_text === "string") return interaction.output_text;
  if (typeof interaction?.outputText === "string") return interaction.outputText;
  if (!Array.isArray(interaction?.outputs)) return "";
  return interaction.outputs
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function extractTrace(interaction) {
  const trace = [];
  if (Array.isArray(interaction?.steps)) {
    for (const step of interaction.steps.slice(-12)) {
      trace.push({
        type: step.type || step.kind || "step",
        text: compact(step.output || step.content || step.text || step, 260),
        name: step.name,
      });
    }
  }
  if (Array.isArray(interaction?.outputs)) {
    for (const part of interaction.outputs.slice(-12)) {
      if (part.type === "thought" && part.summary) {
        trace.push({ type: "thought", text: compact(part.summary, 260) });
      } else if (part.type === "google_search_call" && part.arguments?.queries) {
        trace.push({ type: "search", query: part.arguments.queries.join(", ").slice(0, 260) });
      } else if (part.type && part !== part.text) {
        const text = compact(part, 260);
        if (text) trace.push({ type: part.type, text });
      }
    }
  }
  return trace.slice(-12);
}

function compact(value, maxLength = 220) {
  if (value === null || value === undefined) return "";
  let text;
  if (typeof value === "string") text = value;
  else if (typeof value.text === "string") text = value.text;
  else if (Array.isArray(value)) text = value.map((item) => compact(item, maxLength)).filter(Boolean).join(" ");
  else {
    try { text = JSON.stringify(value); } catch { text = String(value); }
  }
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
