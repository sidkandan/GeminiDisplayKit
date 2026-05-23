/**
 * src/tools/index.mjs — re-exports every Gemini surface wrapper.
 *
 * Game projects can either:
 *   import * as tools from "gemini-display-kit/tools";
 *   await tools.runManagedAgent({ ... });
 *
 * Or destructure:
 *   import { runManagedAgent, generateScene } from "gemini-display-kit/tools";
 *
 * Inside route handlers, the bridge passes `tools` in the context:
 *   "POST /api/director": async ({ body, tools, hud }) => {
 *     const r = await tools.runManagedAgent({ prompt: body.prompt });
 *     hud.broadcast({ type: "agent", text: r.text, trace: r.trace });
 *   }
 */
export { runManagedAgent } from "./managed-agent.mjs";
export { generateScene, scenePrompt, generateText } from "./scene-gen.mjs";
export { runLyriaClip } from "./lyria.mjs";
export { generateTTS } from "./tts.mjs";
export { generateCinematic } from "./veo.mjs";
export { requestStructured, firstJsonObject } from "./structured.mjs";
export { getClient } from "./client.mjs";
