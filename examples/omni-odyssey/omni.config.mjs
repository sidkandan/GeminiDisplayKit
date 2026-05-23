/**
 * OMNI-ODYSSEY — the lead demo for Gemini Flash Meta Displays.
 *
 * "A coherent, consequential illustrated adventure narrated by Gemini Flash,
 *  painted live by Nano Banana, with audience-conjured monsters woven in as
 *  encounters."
 *
 * Architecture:
 *   - Flash narrates each beat (~2–4s/turn) — returns {narration, choices[3], image_prompt, tag}
 *   - Nano Banana paints THIS beat's image in parallel
 *   - A worker queue paints audience-submitted monsters; ready ones appear as encounters
 *   - PROMPT ARENA's 8 trained monsters can be auto-seeded (`SEED_TRAINED=1`)
 *   - Veo cinematic intro plays auto (muted) on load
 *
 * Built today at the Google I/O hackathon. The original single-file
 * orchestrator (~490 lines) becomes this ~230-line file because the
 * framework owns the bridge / SSE / static / tunnel / QR.
 */
import { defineGame } from "gemini-flash-meta-displays";
import {
  generateScene,
  scenePrompt,
  generateText,
  runManagedAgent,
} from "gemini-flash-meta-displays/tools";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { firstJsonObject } from "gemini-flash-meta-displays/tools";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CINEMATIC_PATH = process.env.CINEMATIC_PATH || path.join(__dirname, "assets/intro.mp4");

const PREMISE =
  "You stepped through a rune-portal into the LIVING REALMS — a world where the imaginations of onlookers " +
  "take form as wandering creatures. Your quest: reach the Heart of the Aurora at the world's edge. Every " +
  "creature you meet may become an ally or an obstacle, depending on what you do.";

const STORY_STYLE =
  "vibrant fantasy storybook illustration, cinematic, dramatic light, ultra detailed, no text, no words";

const CREATURE_STYLE =
  "vibrant fantasy trading-card creature illustration, cinematic, dramatic rim light, ultra detailed, no text, no words";

// ---------- odyssey (the live story) ----------
const odyssey = {
  seq: 0,
  index: 0,
  status: "idle",          // idle | live
  generating: false,
  image: null,             // { b64, mime }
  caption: "The world is forming…",
  choices: [{ label: "Begin" }],
  log: [],                 // memory of beats (tags) — drives coherence
  beatCount: 0,
  encounterBy: null,       // who dreamed up this beat's creature (if any)
};

async function loadFallbackOpeningScene() {
  // Allow a pre-generated still as instant first paint (see scripts/prewarm-odyssey.mjs)
  for (const p of [
    path.join(__dirname, "assets/opening-scene.jpg"),
    "/tmp/omni-scene-test.png",
  ]) {
    try {
      const buf = await readFile(p);
      odyssey.image = { b64: buf.toString("base64"), mime: "image/jpeg" };
      odyssey.seq += 1;
      return;
    } catch { /* try next */ }
  }
}

// ---------- the narrator ----------
async function narrate({ choice, monster, opening }) {
  const parts = [
    "You are the narrator of OMNI-ODYSSEY, a short illustrated fantasy adventure on smart glasses. Be vivid and coherent, and make every choice MATTER.",
    `PREMISE: ${PREMISE}`,
    `STORY SO FAR: ${odyssey.log.slice(-6).join(" → ") || "(the adventure is just beginning)"}`,
    opening
      ? "Open the adventure at the rune-portal: establish the world and quest, then offer the first paths."
      : `The player just chose: "${choice}". Narrate the IMMEDIATE CONSEQUENCE — a real, specific outcome that changes the situation. Never generic.`,
    monster
      ? `A creature named "${monster.name}" (dreamed into being by ${monster.by}) is here — ${monster.description}. Feature it in this beat: if the player befriends it, it JOINS the party; if they fight, RESOLVE the clash; if they flee, show the escape AND a cost.`
      : "",
    "Continue coherently; call back to earlier beats when natural; keep momentum toward the Heart of the Aurora.",
    `Return JSON ONLY: {"narration":"1-2 vivid sentences","choices":["three distinct next actions, each <=6 words"],"image_prompt":"one vivid line describing THIS scene","tag":"<=5 word memory of what just changed"}`,
  ].filter(Boolean);
  const raw = await generateText(parts.join("\n"));
  const parsed = raw ? safeJson(raw) : null;
  if (parsed?.narration && Array.isArray(parsed.choices) && parsed.choices.length) return parsed;
  return {
    narration: opening
      ? "You step from the portal onto a cliff of glowing moss; the Aurora pulses on the far horizon, and something stirs in the mist below."
      : `You ${String(choice || "press on").toLowerCase()} — and the realm answers, a new way opening ahead.`,
    choices: ["Press toward the Aurora", "Search the mist", "Look for a companion"],
    image_prompt: "a lone explorer on a glowing moss cliff beneath a vast aurora, mist below",
    tag: opening ? "the journey begins" : (choice || "onward"),
  };
}

function safeJson(text) {
  try { return JSON.parse(firstJsonObject(text) || text); }
  catch { return null; }
}

async function startOdyssey(hud) {
  odyssey.status = "live";
  odyssey.generating = true;
  odyssey.seq += 1;
  odyssey.log = [];
  odyssey.beatCount = 0;
  odyssey.index = 1;
  odyssey.encounterBy = null;
  usedMonsterIds.clear();
  hud?.broadcast({ type: "status", state: "designing", message: "Opening the Odyssey…", ts: Date.now() });
  try {
    const out = await narrate({ opening: true });
    odyssey.caption = out.narration;
    odyssey.choices = out.choices.map((label) => ({ label }));
    odyssey.log.push(out.tag || "the journey begins");
    const scene = await generateScene(scenePrompt(out.image_prompt, STORY_STYLE));
    if (scene) odyssey.image = scene;
    else if (!odyssey.image) await loadFallbackOpeningScene();
    hud?.broadcast({ type: "scene", seq: odyssey.seq, caption: odyssey.caption, choices: odyssey.choices, ts: Date.now() });
  } finally {
    odyssey.generating = false;
    odyssey.seq += 1;
  }
}

async function advanceOdyssey(choiceLabel, hud) {
  odyssey.generating = true;
  odyssey.seq += 1;
  hud?.broadcast({ type: "status", state: "agent", message: "the agents are painting your world…", ts: Date.now() });
  try {
    odyssey.beatCount += 1;
    const mon = (odyssey.beatCount % 2 === 1) ? nextReadyMonster() : null;
    if (mon) usedMonsterIds.add(mon.id);
    const out = await narrate({ choice: choiceLabel, monster: mon });
    odyssey.caption = out.narration;
    odyssey.choices = out.choices.map((label) => ({ label }));
    odyssey.log.push(out.tag || String(choiceLabel).slice(0, 40));
    odyssey.index += 1;
    if (mon?.image_b64) {
      odyssey.image = { b64: mon.image_b64, mime: mon.mime || "image/jpeg" };
      odyssey.encounterBy = mon.by;
    } else {
      odyssey.encounterBy = null;
      const scene = await generateScene(scenePrompt(out.image_prompt, STORY_STYLE));
      if (scene) odyssey.image = scene;
    }
    hud?.broadcast({
      type: "scene",
      seq: odyssey.seq,
      caption: odyssey.caption,
      choices: odyssey.choices,
      encounterBy: odyssey.encounterBy,
      ts: Date.now(),
    });
  } finally {
    odyssey.generating = false;
    odyssey.seq += 1;
  }
}

// ---------- audience-conjured monsters (worker queue) ----------
const monsters = [];                  // {id, description, by, name, image_b64, mime, status, ts}
const usedMonsterIds = new Set();
let monsterSeq = 0;
let monsterWorkerRunning = false;

function publicMonster(m) {
  const { image_b64, _prompt, ...rest } = m;
  return { ...rest, hasImage: Boolean(image_b64) };
}

function nextReadyMonster() {
  return monsters.find((m) => m.status === "ready" && m.image_b64 && !usedMonsterIds.has(m.id)) || null;
}

function enqueueMonster({ description, by, name, sourcePrompt }) {
  const id = "mon_" + (++monsterSeq) + "_" + Date.now().toString(36);
  const displayName = name || (description.length > 38 ? description.slice(0, 38).trim() + "…" : description);
  const mon = {
    id, description, by: by || "anon", name: displayName,
    image_b64: null, mime: "image/jpeg", status: "queued", ts: Date.now(), _prompt: sourcePrompt || null,
  };
  monsters.push(mon);
  runMonsterWorker();
  return mon;
}

async function runMonsterWorker() {
  if (monsterWorkerRunning) return;
  monsterWorkerRunning = true;
  try {
    while (true) {
      const mon = monsters.find((m) => m.status === "queued");
      if (!mon) break;
      mon.status = "painting";
      const prompt = mon._prompt || scenePrompt(
        `a single original creature — ${mon.description} — revealed dramatically, full creature in frame, awe-inspiring and a little dangerous`,
        CREATURE_STYLE
      );
      const scene = await generateScene(prompt);
      if (scene) { mon.image_b64 = scene.b64; mon.mime = scene.mime; mon.status = "ready"; }
      else { mon.status = "failed"; }
    }
  } finally {
    monsterWorkerRunning = false;
  }
}

// Optional: seed PROMPT ARENA's trained monsters into the bestiary, repainted by Nano Banana.
// Gated by env so a cold clone doesn't fire 8 image-gen calls on launch.
async function seedTrainedMonsters() {
  const seedPath = process.env.SEED_MONSTERS_PATH
    || path.resolve(__dirname, "../prompt-arena/data/monsters.json");
  const lore = {
    pyro: "molten fire and ember", flora: "verdant overgrowth and thorns",
    aqua: "tidal water and coral", gale: "storm-wind and racing clouds",
    volt: "crackling lightning", terra: "living stone and crystal",
  };
  try {
    const raw = JSON.parse(await readFile(seedPath, "utf8"));
    for (const t of raw.monsters || []) {
      enqueueMonster({
        name: t.name,
        by: t.coach_name || "the Arena",
        description: `${t.name}, a creature of ${lore[t.element] || t.element} ("${t.catchphrase || ""}")`,
        sourcePrompt: scenePrompt(
          `an awe-inspiring original ${t.element}-element creature named ${t.name}, embodying ${lore[t.element] || t.element}, full creature in frame, heroic dramatic pose`,
          CREATURE_STYLE
        ),
      });
    }
    console.log(`[odyssey] seeded ${(raw.monsters || []).length} trained monsters from PROMPT ARENA`);
  } catch (error) {
    console.warn("[odyssey] seedTrainedMonsters skipped:", error.message);
  }
}

// ---------- game definition ----------
export default defineGame({
  name: "OmniOdyssey",
  display: "./display",

  async onStart({ hud }) {
    // Auto-start the story so first scene-data poll gets real content.
    await startOdyssey(hud);
    if (process.env.SEED_TRAINED === "1") {
      seedTrainedMonsters();  // fire-and-forget; the worker queue handles painting
    }
  },

  routes: {
    // Light poll endpoint — HUD hits this every ~1.4s without redownloading the image bytes.
    "GET /scene-data": async () => ({
      seq: odyssey.seq,
      chapter: odyssey.index,
      status: odyssey.status,
      caption: odyssey.caption,
      choices: odyssey.choices,
      generating: odyssey.generating,
      hasImage: Boolean(odyssey.image),
      encounterBy: odyssey.encounterBy,
    }),

    "GET /scene-image": async () => {
      if (!odyssey.image) return { __status: 404, error: "no scene yet" };
      const buf = Buffer.from(odyssey.image.b64, "base64");
      return Object.assign(buf, { __status: 200, __contentType: odyssey.image.mime || "image/jpeg" });
    },

    "GET /scene-video": async () => {
      try {
        const buf = await readFile(CINEMATIC_PATH);
        return Object.assign(buf, { __status: 200, __contentType: "video/mp4" });
      } catch {
        return { __status: 404, error: "no cinematic clip on disk" };
      }
    },

    "POST /choose": async ({ body, hud }) => {
      if (odyssey.generating) return { __status: 202, ok: false, message: "still painting" };
      const choice = odyssey.choices[body.index] || odyssey.choices[0] || { label: "onward" };
      advanceOdyssey(choice.label, hud);  // fire-and-forget; HUD polls /scene-data
      return { __status: 202, ok: true, generating: true };
    },

    "POST /reset": async ({ hud }) => {
      startOdyssey(hud);
      return { __status: 202, ok: true };
    },

    // ----- audience monster conjuring -----
    "GET /conjure": async () => {
      // Serve the audience-submission page (HTML in display/conjure.html)
      const html = await readFile(path.join(__dirname, "display/conjure.html"), "utf8");
      const buf = Buffer.from(html);
      return Object.assign(buf, { __status: 200, __contentType: "text/html; charset=utf-8" });
    },

    "POST /conjure": async ({ body }) => {
      const description = String(body.description || "").trim().slice(0, 300);
      if (!description) return { __status: 400, error: "describe your monster" };
      const mon = enqueueMonster({ description, by: String(body.by || "").trim().slice(0, 40) });
      return { __status: 202, ok: true, id: mon.id, name: mon.name };
    },

    "GET /monsters": async () => ({
      monsters: monsters.map(publicMonster),
      pending: monsters.filter((m) => m.status === "queued").length,
    }),

    "GET /monster-image": async ({ url }) => {
      const id = url.searchParams.get("id");
      const m = monsters.find((x) => x.id === id);
      if (!m?.image_b64) return { __status: 404, error: "not found" };
      const buf = Buffer.from(m.image_b64, "base64");
      return Object.assign(buf, { __status: 200, __contentType: m.mime || "image/jpeg" });
    },

    /**
     * Optional director route — a managed agent re-imagines the choice set.
     * Demonstrates the Director use pattern with persistent thread state.
     */
    "POST /director": async ({ body, hud }) => {
      const result = await runManagedAgent({
        prompt:
          `Player journey: ${JSON.stringify(odyssey.log.slice(-10))}. ` +
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
