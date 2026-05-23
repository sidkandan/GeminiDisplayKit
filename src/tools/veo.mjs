/**
 * src/tools/veo.mjs — Veo image-to-video for cinematic moments.
 *
 * Veo is async (11s–6min). For interactive games, PRE-GENERATE the moments
 * you want and store them on disk; serve them as static MP4. The display
 * SDK has a gesture-gated intro slot for exactly this — see the `adventure`
 * template.
 */
import { getClient } from "./client.mjs";

const VEO_MODEL = process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";

/**
 * Animate a still scene into a short clip (with native audio).
 *
 * @param {string} imageB64                base64 of the source image
 * @param {string} mime                    image MIME type
 * @param {string} prompt                  motion / mood description
 * @param {string} downloadPath            local path to write the .mp4
 * @param {{ maxMs?: number, pollMs?: number, model?: string }} [options]
 * @returns {Promise<string|null>}         downloadPath on success, null on timeout/failure
 */
export async function generateCinematic(imageB64, mime, prompt, downloadPath, options = {}) {
  const client = getClient();
  const model = options.model || VEO_MODEL;
  const maxMs = options.maxMs ?? 360_000;
  const pollMs = options.pollMs ?? 10_000;

  try {
    let op = await client.models.generateVideos({
      model,
      prompt,
      image: { imageBytes: imageB64, mimeType: mime || "image/jpeg" },
    });
    const t0 = Date.now();
    while (!op.done) {
      if (Date.now() - t0 > maxMs) return null;
      await new Promise((r) => setTimeout(r, pollMs));
      op = await client.operations.getVideosOperation({ operation: op });
    }
    const vid = op.response?.generatedVideos?.[0]?.video;
    if (!vid) return null;
    await client.files.download({ file: vid, downloadPath });
    return downloadPath;
  } catch (error) {
    if (process.env.OMNI_DEBUG) console.error("[veo]", error.message);
    return null;
  }
}
