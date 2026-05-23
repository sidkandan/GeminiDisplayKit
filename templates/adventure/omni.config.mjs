/**
 * {{NAME}} — adventure template
 *
 * "Pick a door → Nano Banana paints the next world."
 *
 * This config declares the game's surface. The framework (gdk) takes
 * care of the HTTP server, SSE, static serving, tool wiring, tunnel, QR.
 */
import { defineGame } from "gemini-display-kit";
import { generateScene, scenePrompt, runManagedAgent } from "gemini-display-kit/tools";

/** In-memory game state. For a single-tunnel demo this is fine. */
const state = {
  seq: 1,
  caption: "You stand before a humming rune-portal in a glowing forest. The air tastes of ozone and possibility.",
  choices: [
    { label: "Step through the rune-portal" },
    { label: "Follow the bioluminescent path" },
    { label: "Climb toward the floating lights" },
  ],
  image: null,        // { b64, mime } | null
  generating: false,
};

export default defineGame({
  name: "{{NAME}}",
  display: "./display",

  // Lifecycle hook fires once after the bridge is listening but before any
  // request comes in. Use it to seed initial state (e.g. paint the opening
  // scene so the HUD has something to render on first paint).
  async onStart({ hud }) {
    hud.broadcast({ type: "status", state: "ready", message: "Adventure ready. Pinch / Enter to begin.", ts: Date.now() });
  },

  routes: {
    /**
     * Light poll endpoint — the HUD hits this every ~1.4s to detect new
     * scenes without re-downloading the image bytes.
     */
    "GET /scene-data": async () => ({
      seq: state.seq,
      caption: state.caption,
      choices: state.choices,
      generating: state.generating,
      hasImage: Boolean(state.image),
    }),

    /** Serves the current scene image (cached by the HUD with ?seq=N). */
    "GET /scene-image": async ({}) => {
      if (!state.image) return { __status: 404, error: "no scene yet" };
      // Direct response — bypass JSON shaping.
      const buf = Buffer.from(state.image.b64, "base64");
      return Object.assign(buf, { __status: 200 });
    },

    /**
     * Player commits to a choice. Fire-and-forget: kick off the Nano Banana
     * call, return immediately, broadcast progress through SSE.
     */
    "POST /choose": async ({ body, hud }) => {
      if (state.generating) return { __status: 202, ok: false, message: "already generating" };
      const choice = state.choices[body.index] || state.choices[0];
      state.generating = true;
      hud.broadcast({ type: "status", state: "agent", message: "the agents are painting your world…", ts: Date.now() });

      // Fire-and-forget — caller doesn't await
      (async () => {
        try {
          const prompt = scenePrompt(
            `Next chapter of a fantasy odyssey. The hero just chose to: ${choice.label}. ` +
            `Reveal where that leads — a brand-new, awe-inspiring location, full of wonder and a hint of danger.`
          );
          const scene = await generateScene(prompt);
          if (scene) state.image = scene;
          state.seq += 1;
          state.caption = `${choice.label}… and a new world opens before you.`;
          state.choices = [
            { label: "Press deeper into the unknown" },
            { label: "Investigate the strange glow" },
            { label: "Call out — and see who answers" },
          ];
          hud.broadcast({
            type: "scene",
            seq: state.seq,
            caption: state.caption,
            choices: state.choices,
            ts: Date.now(),
          });
        } catch (error) {
          hud.broadcast({ type: "error", message: error.message, ts: Date.now() });
        } finally {
          state.generating = false;
        }
      })();

      return { __status: 202, ok: true, generating: true };
    },

    /**
     * Optional: ask a managed-agent Director to redesign the next 3 choices
     * given the journey so far. Demonstrates the "Director" use pattern
     * (one-shot, structured-ish output, trace surfaced to UI).
     */
    "POST /director": async ({ body, hud }) => {
      const result = await runManagedAgent({
        prompt: `Player journey so far: ${JSON.stringify(body.journey || [])}. ` +
                `Propose 3 new SAFE, fun, completable choice labels for the next scene as JSON: ` +
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
