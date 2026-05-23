/**
 * OMNI-ODYSSEY — the lead demo for Gemini Flash Meta Displays.
 *
 * Mechanic:
 *   - Cinematic intro plays (pre-generated Veo clip with audio)
 *   - Player sees a painted scene + 3 glowing choice doors
 *   - Pinch a door → Nano Banana paints the next world (~16s)
 *   - Optional: a Director (managed agent) re-designs the choice set
 *     based on the journey so far
 *
 * Built today at the Google I/O hackathon. The orchestrator pattern came
 * from a single-file prototype (~340 lines); this version is ~110 lines
 * because the framework owns the bridge, SSE, static serving, tool wiring,
 * tunnel, and QR.
 */
import { defineGame } from "gemini-flash-meta-displays";
import { generateScene, scenePrompt, runManagedAgent } from "gemini-flash-meta-displays/tools";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CINEMATIC_PATH = process.env.CINEMATIC_PATH || path.join(__dirname, "assets/intro.mp4");
const OPENING_IMG = path.join(__dirname, "assets/opening-scene.jpg");

// Game state — in-memory, single-judge demo model. For multi-user you'd
// swap this for a per-session store.
const state = {
  seq: 0,
  chapter: 1,
  image: null,            // { b64, mime } | null
  caption: "You stand before a humming rune-portal in a glowing forest. The air tastes of ozone and possibility.",
  choices: [
    { label: "Step through the rune-portal" },
    { label: "Follow the bioluminescent path" },
    { label: "Climb toward the floating lights" },
  ],
  generating: false,
};

// Load the pre-generated opening scene so first paint is instant.
async function loadOpening() {
  try {
    const buf = await readFile(OPENING_IMG);
    state.image = { b64: buf.toString("base64"), mime: "image/jpeg" };
    state.seq = 1;
  } catch {
    // No opening image yet; HUD will show the forming state.
  }
}

export default defineGame({
  name: "OmniOdyssey",
  display: "./display",

  async onStart({ hud }) {
    await loadOpening();
    hud.broadcast({ type: "status", state: "ready", message: "Odyssey ready. Pinch / Enter to begin.", ts: Date.now() });
  },

  routes: {
    "GET /scene-data": async () => ({
      seq: state.seq,
      chapter: state.chapter,
      caption: state.caption,
      choices: state.choices,
      generating: state.generating,
      hasImage: Boolean(state.image),
    }),

    "GET /scene-image": async () => {
      if (!state.image) return { __status: 404, error: "no scene yet" };
      const buf = Buffer.from(state.image.b64, "base64");
      return Object.assign(buf, { __status: 200 });
    },

    "GET /scene-video": async () => {
      try {
        const buf = await readFile(CINEMATIC_PATH);
        return Object.assign(buf, { __status: 200 });
      } catch {
        return { __status: 404, error: "no cinematic clip on disk" };
      }
    },

    "POST /choose": async ({ body, hud }) => {
      if (state.generating) return { __status: 202, ok: false, message: "still painting…" };
      const choice = state.choices[body.index] || state.choices[0];
      state.generating = true;
      hud.broadcast({ type: "status", state: "agent", message: "the agents are painting your world…", ts: Date.now() });

      (async () => {
        try {
          const prompt = scenePrompt(
            `Next chapter of a fantasy odyssey. The hero just chose to: ${choice.label}. ` +
            `Reveal where that leads — a brand-new, awe-inspiring location, full of wonder and a hint of danger.`
          );
          const scene = await generateScene(prompt);
          if (scene) state.image = scene;
          state.seq += 1;
          state.chapter += 1;
          state.caption = `${choice.label}… and a new world opens before you.`;
          state.choices = [
            { label: "Press deeper into the unknown" },
            { label: "Investigate the strange glow" },
            { label: "Call out — and see who answers" },
          ];
          hud.broadcast({ type: "scene", seq: state.seq, chapter: state.chapter, caption: state.caption, choices: state.choices, ts: Date.now() });
        } catch (error) {
          hud.broadcast({ type: "error", message: error.message, ts: Date.now() });
        } finally {
          state.generating = false;
        }
      })();

      return { __status: 202, ok: true, generating: true };
    },

    /**
     * Optional director route — a managed agent re-imagines the choice set
     * based on the journey so far. Demonstrates the Director use pattern.
     * Not called by the default display; available to the director-view.html
     * judge console for live mid-game commentary.
     */
    "POST /director": async ({ body, hud }) => {
      const result = await runManagedAgent({
        prompt:
          `Player journey so far: ${JSON.stringify(body.journey || [])}. ` +
          `Propose 3 new SAFE, fun choice labels for the next scene as JSON: ` +
          `{"choices":[{"label":"..."},{"label":"..."},{"label":"..."}]}`,
        systemInstruction:
          "You are the Director of an on-glasses fantasy adventure. Keep labels under 36 characters. " +
          "Never propose anything unsafe, private, or that targets a specific named person.",
        threadKey: "director",
      });
      hud.broadcast({ type: "agent", title: "Director", text: result.text, trace: result.trace, ts: Date.now() });
      return { ok: true, text: result.text, trace: result.trace };
    },
  },
});
