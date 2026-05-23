#!/usr/bin/env node
/**
 * scripts/prewarm-odyssey.mjs — pre-generate the OMNI-ODYSSEY assets so
 * the live demo's first paint is instant.
 *
 * Generates:
 *   examples/omni-odyssey/assets/opening-scene.jpg   (Nano Banana, ~16s)
 *   examples/omni-odyssey/assets/intro.mp4           (Veo, ~30-60s)
 *
 * Requires GEMINI_API_KEY in env (or .env at the repo root or in
 * examples/omni-odyssey/.env).
 *
 * Usage:
 *   node scripts/prewarm-odyssey.mjs                 # generates both
 *   node scripts/prewarm-odyssey.mjs --skip-veo      # skip the slow Veo step
 *   node scripts/prewarm-odyssey.mjs --skip-scene    # skip the scene
 */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateScene, scenePrompt } from "../src/tools/scene-gen.mjs";
import { generateCinematic } from "../src/tools/veo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const odysseyDir = path.join(root, "examples/omni-odyssey");
const assetsDir = path.join(odysseyDir, "assets");

const args = new Set(process.argv.slice(2));
const skipScene = args.has("--skip-scene");
const skipVeo = args.has("--skip-veo");

// Best-effort .env loading from the repo root and the example dir
for (const envPath of [path.join(root, ".env"), path.join(odysseyDir, ".env")]) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.error("GEMINI_API_KEY is not set. Add it to .env at the repo root or examples/omni-odyssey/.env.");
  process.exit(1);
}

const OPENING_PROMPT = scenePrompt(
  "A humming rune-portal in a glowing forest. Bioluminescent moss carpets the ground. " +
  "Floating lights drift overhead. The air looks like it tastes of ozone. A hero in shadow stands at the threshold."
);

const VEO_PROMPT =
  "Cinematic slow push-in toward the rune-portal. The world stirs to life — leaves quiver, fireflies pulse, " +
  "the portal's light deepens. Atmospheric fantasy film quality. Soft strings + a low hum.";

async function makeScene() {
  const out = path.join(assetsDir, "opening-scene.jpg");
  if (existsSync(out)) {
    console.log(`[scene] already exists: ${out}`);
    return out;
  }
  console.log("[scene] generating with Nano Banana (~16s)…");
  const scene = await generateScene(OPENING_PROMPT, { timeoutMs: 60_000 });
  if (!scene) {
    console.error("[scene] generation returned null — aborting Veo step");
    return null;
  }
  writeFileSync(out, Buffer.from(scene.b64, "base64"));
  console.log(`[scene] saved: ${out}`);
  return out;
}

async function makeVeo(sceneB64) {
  const out = path.join(assetsDir, "intro.mp4");
  if (existsSync(out)) {
    console.log(`[veo] already exists: ${out}`);
    return out;
  }
  console.log("[veo] generating with Veo (~30-60s)…");
  const result = await generateCinematic(sceneB64, "image/jpeg", VEO_PROMPT, out, { maxMs: 360_000 });
  if (!result) {
    console.error("[veo] generation returned null — leaving HUD without cinematic (it falls back gracefully)");
    return null;
  }
  console.log(`[veo] saved: ${result}`);
  return result;
}

async function main() {
  console.log(`prewarming OMNI-ODYSSEY assets into ${assetsDir}\n`);

  let sceneB64 = null;
  if (!skipScene) {
    const scenePath = await makeScene();
    if (scenePath) {
      sceneB64 = readFileSync(scenePath).toString("base64");
    }
  } else {
    console.log("[scene] skipped (--skip-scene)");
    const scenePath = path.join(assetsDir, "opening-scene.jpg");
    if (existsSync(scenePath)) sceneB64 = readFileSync(scenePath).toString("base64");
  }

  if (!skipVeo && sceneB64) {
    await makeVeo(sceneB64);
  } else if (skipVeo) {
    console.log("[veo] skipped (--skip-veo)");
  } else {
    console.log("[veo] skipped — no scene available to animate");
  }

  console.log("\n✅ prewarm complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
