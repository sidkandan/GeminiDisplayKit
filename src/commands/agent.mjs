/**
 * `gdk agent run --prompt "..."` —
 *
 * One-shot managed-agent invocation from the terminal. Handy for testing
 * prompts in isolation before wiring them into a game's route.
 */
import { runManagedAgent } from "../tools/managed-agent.mjs";

export async function run({ positional, flags }) {
  const sub = positional[0];
  if (sub !== "run") {
    throw new Error("usage: gdk agent run --prompt \"<text>\" [--agent <id>]");
  }
  const prompt = flags.prompt;
  if (!prompt) throw new Error("--prompt is required");

  const result = await runManagedAgent({
    prompt,
    agent: flags.agent || undefined,
    systemInstruction: flags.system || undefined,
  });

  console.log(`---\nagent:       ${result.agent}`);
  console.log(`interaction: ${result.interactionId || "(none)"}`);
  console.log(`environment: ${result.environmentId || "(none)"}`);
  console.log(`---\n${result.text}\n---`);
  if (result.trace.length) {
    console.log("trace:");
    for (const step of result.trace) {
      console.log(`  [${step.type}] ${step.text || step.query || ""}`);
    }
  }
}
