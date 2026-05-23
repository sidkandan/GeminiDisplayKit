const DIRECTIONAL_LANES = ["up", "down", "left", "right"];
const LANES = [...DIRECTIONAL_LANES, "shield"];
const WORLD_DIRECTIONS = [
  { angle: 0, approach: "front" },
  { angle: 90, approach: "right" },
  { angle: 180, approach: "behind" },
  { angle: 270, approach: "left" },
];
const DIFFICULTY = {
  easy: { stepBeats: 3, density: 0.95, shieldEvery: 0, windowMs: 450, minGapMs: 1850, maxNotes: 16, defaultBpm: 92 },
  normal: { stepBeats: 3, density: 0.9, shieldEvery: 0, windowMs: 380, minGapMs: 1500, maxNotes: 22, defaultBpm: 104 },
  hard: { stepBeats: 2, density: 0.82, shieldEvery: 10, windowMs: 300, minGapMs: 1050, maxNotes: 34, defaultBpm: 124 },
  expert: { stepBeats: 1, density: 0.74, shieldEvery: 8, windowMs: 240, minGapMs: 720, maxNotes: 48, defaultBpm: 140 },
};

export function hashSeed(value = "pulseblade") {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function cleanText(value, fallback, maxLength = 80) {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, maxLength);
}

function normalizeAngle(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return ((numeric % 360) + 360) % 360;
}

function worldDirectionForIndex(index) {
  return WORLD_DIRECTIONS[index % WORLD_DIRECTIONS.length];
}

function worldDirectionFromNote(note, index) {
  const rawApproach = String(note?.approach || "").toLowerCase();
  const approachMatch = WORLD_DIRECTIONS.find((item) => item.approach === rawApproach);
  const fallback = approachMatch || worldDirectionForIndex(index);
  return {
    angle: Math.round(normalizeAngle(note?.worldAngleDeg ?? note?.worldAngle ?? note?.angle, fallback.angle)),
    approach: approachMatch?.approach || fallback.approach,
  };
}

export function normalizeDifficulty(value = "easy") {
  const key = String(value || "easy").toLowerCase();
  return DIFFICULTY[key] ? key : "easy";
}

export function buildFallbackLevel(options = {}) {
  const theme = cleanText(options.theme, "neon launch tunnel", 64);
  const difficulty = normalizeDifficulty(options.difficulty);
  const settings = DIFFICULTY[difficulty];
  const bpm = Math.round(clampNumber(options.bpm, settings.defaultBpm, 72, 190));
  const durationMs = Math.round(clampNumber(options.durationMs, 30000, 12000, 45000));
  const seed = hashSeed(`${options.seed || theme}:${bpm}:${difficulty}`);
  const notes = buildRawFallbackNotes({ bpm, durationMs, difficulty, seed });

  return normalizeLevel({
    title: "PulseBlade",
    theme,
    bpm,
    difficulty,
    durationMs,
    lanes: LANES,
    hitWindowMs: settings.windowMs,
    notes,
    recovery: [
      "Breathe. Recenter on the next downbeat.",
      "Use Enter to parry shield beats.",
      "Drop combo risk; hit clean arrows first.",
    ],
    agentProof: {
      source: "deterministic-fallback",
      seed,
      createdAt: Date.now(),
    },
  });
}

export function firstJsonObject(text = "") {
  const source = String(text || "");
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

export function parseAgentLevel(text) {
  const jsonText = firstJsonObject(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText);
    return parsed?.level && typeof parsed.level === "object" ? parsed.level : parsed;
  } catch {
    return null;
  }
}

export function normalizeLevel(level = {}) {
  const fallbackTheme = cleanText(level.theme, "neon launch tunnel", 64);
  const fallbackDifficulty = normalizeDifficulty(level.difficulty);
  const difficulty = normalizeDifficulty(level.difficulty || fallbackDifficulty);
  const settings = DIFFICULTY[difficulty];
  const fallbackBpm = Math.round(clampNumber(level.bpm, settings.defaultBpm, 72, 190));
  const bpm = Math.round(clampNumber(level.bpm, fallbackBpm, 72, 190));
  const durationMs = Math.round(clampNumber(level.durationMs, 30000, 12000, 45000));
  const notes = Array.isArray(level.notes) ? level.notes : [];
  const normalizedNotes = notes
    .map((note, index) => {
      const rawLane = String(note?.lane || "").toLowerCase();
      const rawKind = String(note?.kind || "").toLowerCase();
      const fallbackLane = DIRECTIONAL_LANES[index % DIRECTIONAL_LANES.length];
      let lane = LANES.includes(rawLane) ? rawLane : fallbackLane;
      let kind = ["slice", "hold", "shield", "mine"].includes(rawKind) ? rawKind : lane === "shield" ? "shield" : "slice";
      if (difficulty === "easy" || kind === "mine") {
        if (lane === "shield") lane = fallbackLane;
        kind = difficulty === "easy" || kind === "mine" ? "slice" : kind;
      }
      const world = worldDirectionFromNote(note, index);
      return {
        id: cleanText(note?.id, `pb-${index}-${note?.t || index}`, 36),
        t: Math.round(clampNumber(note?.t, 1800 + index * (60000 / bpm), 800, durationMs - 250)),
        lane,
        kind,
        worldAngleDeg: world.angle,
        approach: world.approach,
        points: Math.round(clampNumber(note?.points, kind === "shield" ? 160 : 100, 25, 300)),
      };
    })
    .sort((a, b) => a.t - b.t);
  let safeNotes = normalizedNotes.length
    ? enforceReadableTimeline(normalizedNotes, { difficulty, bpm, durationMs })
    : buildRawFallbackNotes({ bpm, durationMs, difficulty, seed: hashSeed(`${fallbackTheme}:${bpm}:${difficulty}:raw`) });

  return {
    title: cleanText(level.title, "PulseBlade", 42),
    theme: fallbackTheme,
    bpm,
    difficulty,
    durationMs,
    lanes: LANES,
    hitWindowMs: Math.round(clampNumber(level.hitWindowMs, settings.windowMs, 180, 500)),
    notes: safeNotes,
    recovery: normalizeRecovery(level.recovery),
    agentProof: {
      ...(typeof level.agentProof === "object" && level.agentProof ? level.agentProof : {}),
    },
  };
}

function buildRawFallbackNotes({ bpm, durationMs, difficulty, seed }) {
  const random = rng(seed);
  const settings = DIFFICULTY[difficulty];
  const beatMs = 60000 / bpm;
  const stepMs = beatMs * settings.stepBeats;
  const notes = [];
  const laneCycle = ["left", "up", "right", "down", "up", "left", "down", "right"];
  let index = 0;
  let lastNoteT = -9999;

  for (let t = 1800; t < durationMs - 900 && notes.length < settings.maxNotes; t += stepMs) {
    const phase = index / Math.max(1, durationMs / stepMs);
    const density = settings.density - (phase < 0.18 ? 0.08 : 0) + (phase > 0.78 ? 0.04 : 0);
    if (t - lastNoteT < settings.minGapMs || (difficulty !== "easy" && random() > density)) {
      index += 1;
      continue;
    }
    const shield = settings.shieldEvery > 0 && notes.length > 5 && notes.length % settings.shieldEvery === 0;
    const lane = shield ? "shield" : laneCycle[(index + Math.floor(random() * laneCycle.length)) % laneCycle.length];
    const kind = shield ? "shield" : difficulty !== "easy" && random() > 0.88 ? "hold" : "slice";
    const world = worldDirectionForIndex(notes.length);
    notes.push({
      id: `pb-${index}-${Math.round(t)}`,
      t: Math.round(t),
      lane,
      kind,
      worldAngleDeg: world.angle,
      approach: world.approach,
      points: kind === "hold" ? 140 : shield ? 160 : 100,
    });
    lastNoteT = t;
    index += 1;
  }

  return notes;
}

function enforceReadableTimeline(notes, { difficulty, bpm, durationMs }) {
  const settings = DIFFICULTY[difficulty];
  const output = [];
  let lastNoteT = -9999;
  for (const note of notes) {
    if (output.length >= settings.maxNotes) break;
    if (note.t - lastNoteT < settings.minGapMs) continue;
    const fallbackLane = DIRECTIONAL_LANES[output.length % DIRECTIONAL_LANES.length];
    const lane = difficulty === "easy" && note.lane === "shield" ? fallbackLane : note.lane;
    const kind = difficulty === "easy" || note.kind === "mine" ? "slice" : note.kind;
    const world = worldDirectionFromNote(note, output.length);
    output.push({
      ...note,
      id: cleanText(note.id, `pb-${output.length}-${note.t}`, 36),
      lane: LANES.includes(lane) ? lane : fallbackLane,
      kind: kind === "mine" ? "slice" : kind,
      worldAngleDeg: world.angle,
      approach: world.approach,
      t: Math.round(clampNumber(note.t, 1800 + output.length * (60000 / bpm), 800, durationMs - 250)),
    });
    lastNoteT = note.t;
  }
  return output.length
    ? output
    : buildRawFallbackNotes({ bpm, durationMs, difficulty, seed: hashSeed(`${difficulty}:${bpm}:readable`) });
}

function normalizeRecovery(value) {
  const source = Array.isArray(value) ? value : [value].filter(Boolean);
  const cleaned = source.map((item) => cleanText(item, "", 62)).filter(Boolean).slice(0, 4);
  return cleaned.length ? cleaned : [
    "Breathe. Recenter on the next downbeat.",
    "Use Enter for shield beats.",
    "Focus on clean arrows.",
  ];
}

export function makeLyriaPrompt(options = {}) {
  const theme = cleanText(options.theme, "neon launch tunnel", 64);
  const difficulty = normalizeDifficulty(options.difficulty);
  const settings = DIFFICULTY[difficulty];
  const bpm = Math.round(clampNumber(options.bpm, settings.defaultBpm, 72, 190));
  const intensity = difficulty === "expert" ? "high intensity" : difficulty === "hard" ? "driving" : "focused, sparse, and playable";
  return [
    `Create a 30-second original instrumental ${intensity} smart-glasses rhythm-game loop at exactly ${bpm} BPM.`,
    `Theme: ${theme}.`,
    "Use strict 4/4 timing, clear bar downbeats, crisp percussion transients, short synth stabs, and no tempo drift.",
    "Arrange it like a sparse foundation bed: leave clear space for player-triggered chord stabs, arpeggios, pads, and shimmer layers that stack when directional swipes land.",
    "Use strong downbeats but avoid dense lead melodies, so the browser can add new instruments as the player's combo grows.",
    "The chart will rotate around front, right, behind, and left; keep the music spacious enough for head-turn moments.",
    "No vocals, copyrighted references, artist names, or recognizable melodies.",
  ].join(" ");
}

export function pulsebladeSchema() {
  return {
    title: "string",
    theme: "string",
    bpm: "number 72-190",
    difficulty: "easy|normal|hard|expert",
    durationMs: "12000-45000",
    lanes: LANES,
    hitWindowMs: "180-500",
    notes: [{ t: "milliseconds", lane: LANES.join("|"), kind: "slice|hold|shield", worldAngleDeg: "0|90|180|270", approach: "front|right|behind|left", points: "number" }],
    recovery: ["short HUD recovery text"],
    agentProof: { source: "gemini|managed-agent|fallback", seed: "string|number" },
  };
}
