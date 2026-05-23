/**
 * src/tools/scene-gen.mjs — Nano Banana (gemini-3.1-flash-image-preview).
 *
 * Pure text->image generation. No camera, no analyzing input photos —
 * this is the creative path, deliberately distinct from "image analyzer"
 * anti-projects.
 */
import { getClient } from "./client.mjs";

export const imageModel = process.env.IMAGE_MODEL || "gemini-3.1-flash-image-preview";

/**
 * Wrap a raw scene description in a consistent illustrated style so
 * generated worlds feel like one game.
 */
export function scenePrompt(
  description,
  style = "vibrant fantasy trading-card-game illustration, cinematic, dramatic rim light, ultra detailed, no text, no words"
) {
  return `${style}. Scene: ${description}`;
}

/**
 * Generate an image from a text prompt.
 *
 * @param {string} prompt
 * @param {{ timeoutMs?: number, model?: string }} [options]
 * @returns {Promise<{ b64: string, mime: string } | null>} null on timeout/failure
 */
export async function generateScene(prompt, options = {}) {
  const client = getClient();
  const model = options.model || imageModel;
  const timeoutMs = options.timeoutMs ?? 45_000;
  try {
    const gen = client.models.generateContent({
      model,
      contents: prompt,
      config: { responseModalities: ["IMAGE"] },
    });
    const result = await Promise.race([
      gen,
      new Promise((res) => setTimeout(() => res(null), timeoutMs)),
    ]);
    if (!result) return null;
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return { b64: part.inlineData.data, mime: part.inlineData.mimeType || "image/jpeg" };
      }
    }
    return null;
  } catch (error) {
    if (process.env.OMNI_DEBUG) console.error("[scene-gen]", error.message);
    return null;
  }
}

/**
 * Generate plain text from a prompt — for fast Gemini Flash narration in
 * interactive loops. Returns null on timeout/failure so callers can fall
 * back to a deterministic line.
 *
 * @param {string} prompt
 * @param {{ model?: string, timeoutMs?: number }} [options]
 * @returns {Promise<string | null>}
 */
export async function generateText(prompt, options = {}) {
  if (!prompt) return null;
  const client = getClient();
  const model = options.model || process.env.GEMINI_MODEL || "gemini-flash-latest";
  const timeoutMs = options.timeoutMs ?? 20_000;
  try {
    const gen = client.models.generateContent({ model, contents: prompt });
    const result = await Promise.race([
      gen,
      new Promise((res) => setTimeout(() => res(null), timeoutMs)),
    ]);
    return result?.text || null;
  } catch (error) {
    if (process.env.OMNI_DEBUG) console.error("[scene-gen.generateText]", error.message);
    return null;
  }
}
