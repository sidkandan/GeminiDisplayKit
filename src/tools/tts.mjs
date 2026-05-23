/**
 * src/tools/tts.mjs — Gemini TTS (gemini-3.1-flash-tts-preview).
 *
 * Returns raw PCM bytes wrapped in a WAV container so any HTML5 Audio
 * element can play it. If you need MP3 specifically, run the result
 * through ffmpeg yourself — the model returns PCM.
 */
import { getClient } from "./client.mjs";

const TTS_MODEL = process.env.TTS_MODEL || "gemini-3.1-flash-tts-preview";

/**
 * @param {string} text
 * @param {{ voice?: string, model?: string }} [options]
 * @returns {Promise<{ wavBuffer: Buffer, mimeType: string }>}
 */
export async function generateTTS(text, options = {}) {
  if (!text) throw new Error("generateTTS: text is required");
  const client = getClient();
  const model = options.model || TTS_MODEL;
  const voice = options.voice || "Charon";

  // Inline-import types lazily so a project that doesn't use TTS doesn't pay
  // the parse cost.
  const { types } = await import("@google/genai");

  const config = types
    ? new types.GenerateContentConfig({
        responseModalities: ["AUDIO"],
        speechConfig: new types.SpeechConfig({
          voiceConfig: new types.VoiceConfig({
            prebuiltVoiceConfig: new types.PrebuiltVoiceConfig({ voiceName: voice }),
          }),
        }),
      })
    : {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      };

  const response = await client.models.generateContent({ model, contents: text, config });
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const pcm = Buffer.from(part.inlineData.data, "base64");
      return { wavBuffer: wrapPcmAsWav(pcm), mimeType: "audio/wav" };
    }
  }
  throw new Error("Gemini TTS returned no inline audio");
}

/**
 * Wrap raw 24 kHz / mono / 16-bit PCM in a minimal WAV header so HTML5
 * Audio can play it directly. (The TTS model returns un-headered PCM.)
 */
function wrapPcmAsWav(pcm, { channels = 1, rate = 24000, sampleWidth = 2 } = {}) {
  const byteRate = rate * channels * sampleWidth;
  const blockAlign = channels * sampleWidth;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);          // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(sampleWidth * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
