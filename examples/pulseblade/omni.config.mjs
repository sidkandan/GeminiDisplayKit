/**
 * PULSEBLADE — original wearable rhythm game.
 *
 * Mechanic:
 *   - Gemini Flash designs a 30s level (lane sequence, BPM, timing)
 *   - Lyria 3 generates the matching backing track
 *   - Player swipes ◀ ▶ ▲ ▼ on the Neural Band to hit notes
 *   - A managed-agent director surfaces a judge-visible balancing note
 *
 * NOT Beat Saber. Original mechanic, original level designer, original
 * audio generation path.
 */
import { defineGame } from "gemini-flash-meta-displays";
import { runLyriaClip, makeLyriaPrompt, runManagedAgent, requestStructured } from "gemini-flash-meta-displays/tools";
import {
  buildFallbackLevel,
  makeLyriaPrompt as makeLyriaPromptFromLib,
  normalizeLevel,
  parseAgentLevel,
  pulsebladeSchema,
} from "./level.mjs";

let lastSession = null;        // { level, track, agentTrace, ts }

function pulsebladeOptions(raw = {}) {
  const theme = (raw.theme || "neon launch tunnel").slice(0, 64);
  const difficulty = String(raw.difficulty || "easy").toLowerCase();
  const bpm = Math.max(72, Math.min(190, Number(raw.bpm) || (difficulty === "expert" ? 140 : difficulty === "hard" ? 124 : difficulty === "normal" ? 104 : 92)));
  const seed = String(raw.seed || `${theme}:${Date.now()}`).slice(0, 80);
  return { theme, difficulty, bpm, seed };
}

function designerPrompt(options) {
  return [
    "Create JSON only for an original Meta Display smart-glasses rhythm game called PulseBlade.",
    "This is NOT Beat Saber. No copyrighted franchise names.",
    "Player inputs: Neural Band swipes mapped to up, down, left, right.",
    `Theme: ${options.theme}. BPM: ${options.bpm}. Difficulty: ${options.difficulty}. Duration: 30000ms.`,
    "Return exactly this shape:",
    JSON.stringify(pulsebladeSchema()),
    "Notes must be playable, sorted by t milliseconds, gap ≥ 1400ms apart on easy.",
  ].join("\n");
}

async function buildLevel(options) {
  // Always have a fallback in hand
  const fallback = normalizeLevel(buildFallbackLevel(options));
  try {
    const { parsed, raw } = await requestStructured({
      prompt: designerPrompt(options),
      schema: pulsebladeSchema(),
    });
    if (!parsed) return fallback;
    const level = normalizeLevel({
      ...parsed,
      theme: parsed.theme || options.theme,
      bpm: parsed.bpm || options.bpm,
      difficulty: parsed.difficulty || options.difficulty,
      agentProof: { source: "gemini-flash", text: String(raw).slice(0, 500), createdAt: Date.now() },
    });
    return level;
  } catch {
    return fallback;
  }
}

export default defineGame({
  name: "PulseBlade",
  display: "./display",

  async onStart({ hud }) {
    hud.broadcast({ type: "status", state: "ready", message: "PulseBlade ready. POST /api/pulseblade/start to compose a level.", ts: Date.now() });
  },

  routes: {
    /**
     * Compose a level + track + (async) agent director note.
     * The HUD calls this once on Play; the response carries the level and
     * the audio, and the director's commentary streams through SSE later.
     */
    "POST /api/pulseblade/start": async ({ body, hud, tools }) => {
      const options = pulsebladeOptions(body);
      hud.broadcast({ type: "pulseblade_status", state: "composing", bpm: options.bpm, difficulty: options.difficulty, ts: Date.now() });

      // 1) Level (Flash structured output, with deterministic fallback)
      const level = await buildLevel(options);

      // 2) Track (Lyria — caller can opt out with body.music===false)
      let track = { source: "webaudio-fallback", audioData: null, mimeType: null, text: "Browser click track fallback." };
      if (body.music !== false) {
        try {
          track = await runLyriaClip(makeLyriaPromptFromLib({ theme: level.theme, bpm: level.bpm, difficulty: level.difficulty }));
          track.source = "lyria-3-clip-preview";
        } catch (error) {
          track.error = error.message;
        }
      }

      // 3) Managed-agent director — non-blocking, returns its note via SSE
      if (body.agent !== false) {
        tools.runManagedAgent({
          prompt:
            "You are the judge-visible director for PulseBlade, an original wearable rhythm game. " +
            "Explain in concise terms why this is a managed-agent game, not an image analyzer. " +
            `Level JSON: ${JSON.stringify(level)}. ` +
            "Return: one balancing note, one live-demo talking point, one risk guardrail.",
          systemInstruction:
            "You are a Google hackathon managed-agent director. Concise, practical, never include secrets.",
          threadKey: "pulseblade-director",
        })
          .then((r) => hud.broadcast({ type: "pulseblade_agent", state: "ready", title: "Managed director", text: r.text, trace: r.trace, ts: Date.now() }))
          .catch((e) => hud.broadcast({ type: "pulseblade_agent", state: "fallback", message: e.message, ts: Date.now() }));
      }

      const payload = {
        type: "pulseblade_start",
        title: level.title || "PulseBlade",
        message: track.audioData ? "Lyria track ready." : "Fallback beat ready.",
        level,
        track,
        ts: Date.now(),
      };
      lastSession = payload;
      hud.broadcast(payload);
      return payload;
    },

    "GET /api/pulseblade/latest": async () => ({ ok: true, session: lastSession }),
  },
});
