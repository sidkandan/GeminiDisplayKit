/**
 * src/tools/structured.mjs — Gemini Flash with strict structured output.
 *
 * Used by the `arena` template (strategy schema), the `rhythm` template
 * (level designer), and any game that wants JSON back instead of prose.
 */
import { getClient } from "./client.mjs";

const FLASH_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

/**
 * @param {object} options
 * @param {string} options.prompt           required
 * @param {object} [options.schema]         JSON schema or example object;
 *                                          included verbatim in the prompt as guidance
 * @param {string} [options.model]
 * @param {{data: string, mimeType?: string}} [options.imageContext]
 * @returns {Promise<{ parsed: object|null, raw: string, model: string }>}
 */
export async function requestStructured(options) {
  if (!options?.prompt) throw new Error("requestStructured: options.prompt is required");
  const client = getClient();
  const model = options.model || FLASH_MODEL;

  const contents = [];
  if (options.imageContext?.data) {
    contents.push({
      inlineData: {
        mimeType: options.imageContext.mimeType || "image/jpeg",
        data: options.imageContext.data,
      },
    });
  }
  const schemaHint = options.schema
    ? `\n\nReturn JSON only, matching this shape exactly:\n${JSON.stringify(options.schema, null, 2)}`
    : "\n\nReturn JSON only. No prose, no code fences, no explanation.";
  contents.push({ text: options.prompt + schemaHint });

  const response = await client.models.generateContent({ model, contents });
  const raw = response.text || "";
  const jsonText = firstJsonObject(raw);
  let parsed = null;
  if (jsonText) {
    try { parsed = JSON.parse(jsonText); } catch { parsed = null; }
  }
  return { parsed, raw, model };
}

/** Scan a string for the first complete JSON object. Handles fenced ```json``` blocks. */
export function firstJsonObject(text = "") {
  const source = String(text);
  const fenced = source.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced) return fenced[1];
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}
