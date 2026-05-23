/**
 * src/tools/lyria.mjs — Lyria 3 short clip generator.
 *
 * Returns a base64 audio blob suitable for inline playback on the display
 * (the display SDK plays anything that comes through SSE as `payload.audioData`).
 */
import { getClient } from "./client.mjs";

const LYRIA_MODEL = process.env.LYRIA_MODEL || "lyria-3-clip-preview";

/**
 * @param {string} prompt    text describing the clip (theme, BPM, instrumentation)
 * @param {{ model?: string }} [options]
 * @returns {Promise<{ audioData: string, mimeType: string, text: string }>}
 *          throws if no audio is returned
 */
export async function runLyriaClip(prompt, options = {}) {
  if (!prompt) throw new Error("runLyriaClip: prompt is required");
  const client = getClient();
  const model = options.model || LYRIA_MODEL;
  const response = await client.models.generateContent({ model, contents: prompt });
  const parts = [
    ...(Array.isArray(response.parts) ? response.parts : []),
    ...((response.candidates?.[0]?.content?.parts) || []),
  ];
  const text = [];
  let audioData = null;
  let mimeType = "audio/mpeg";
  for (const part of parts) {
    if (part.text) text.push(part.text);
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      audioData = inline.data;
      mimeType = inline.mimeType || inline.mime_type || mimeType;
    }
  }
  if (!audioData) throw new Error("Lyria returned no inline audio");
  return { audioData, mimeType, text: text.join("\n").slice(0, 1200) };
}

/**
 * Helper for rhythm/adventure games — turn theme/bpm/difficulty into a
 * consistent prompt that Lyria handles well.
 */
export function makeLyriaPrompt({ theme, bpm = 104, difficulty = "normal", seconds = 30 } = {}) {
  const intensity = difficulty === "expert" ? "high intensity" : difficulty === "hard" ? "driving" : "focused, sparse, and playable";
  return [
    `Create a ${seconds}-second original instrumental ${intensity} smart-glasses loop at exactly ${bpm} BPM.`,
    theme ? `Theme: ${theme}.` : "",
    "Strict 4/4 timing, clear bar downbeats, crisp percussion transients, no vocals.",
    "No copyrighted references, artist names, or recognizable melodies.",
  ].filter(Boolean).join(" ");
}
