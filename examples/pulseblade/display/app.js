// PulseBlade Rhythm Game Controller

// State variables
let gameState = 'START'; // START, PLAYING, PAUSED, RESULTS
let score = 0;
let combo = 0;
let maxCombo = 0;
let health = 100;
let notesHit = 0;
let notesMissed = 0;
let parriesCount = 0;
let activeNotes = [];
let gameTimeStart = 0;
let pausedTimeStart = 0;
let totalPausedDuration = 0;
let elapsedGameTime = 0; // seconds

// Game parameters
let bpm = 92;
let beatDuration = 60 / bpm;
let levelDurationSeconds = 30;
const noteTravelTime = 1.8; // seconds from center to target ring; keeps trainer notes readable
const targetDepth = 0.83; // depth where hit zone is centered (radius = 200px)
const maxRadius = 240; // max radius of the tunnel
let perfectRange = 0.22; // +/- seconds from perfect time (wide trainer window)
let goodRange = 0.45; // +/- seconds from perfect time (wide trainer window)
let recoveryActiveUntil = 0; // recovery indicator timestamp
let targetFlashes = { up: 0, down: 0, left: 0, right: 0 }; // hit flash decay states
const trainerMinGapSeconds = 1.85;
const trainerMaxNotes = 16;
const previewTravelTime = 6.0;
const viewConeDeg = 118;
const hitConeDeg = 58;
const worldAngles = [0, 90, 180, 270];
const worldApproaches = ['front', 'right', 'behind', 'left'];
let headYawDeg = 0;
let headPitchDeg = 0;
let headYawZero = null;
let simYawDeg = 0;
let poseMode = 'SIM';
let depthNudge = 0;
let lastOrientationAt = 0;

// Web Audio API variables
let audioCtx = null;
let backingTrackPlaying = false;
let nextSynthBeatTime = 0.0;
let synthBeatIndex = 0;
const lookahead = 25.0; // ms
const scheduleAheadTime = 0.1; // seconds

// Remote API & EventSource state
let sseConnection = null;
let externalLevel = null;
let externalAudioUrl = null;
let useExternalAudio = false;
let externalAudioBuffer = null;
let externalAudioSource = null;

// Visual particles for hits
let particles = [];

// Parry / Shield state
let parryActive = false;
let parryTime = 0; // timestamp when activated
const parryDuration = 200; // ms

// Canvas elements
let canvas = null;
let ctx = null;
let animationFrameId = null;
let synthTimerId = null;

// DOM elements
const els = {
  score: document.getElementById('score-val'),
  status: document.getElementById('status-pill'),
  healthBar: document.getElementById('health-bar-fill'),
  comboDisplay: document.getElementById('combo-display'),
  comboCount: document.getElementById('combo-count'),
  feedback: document.getElementById('feedback-toast'),
  overlayStart: document.getElementById('overlay-start'),
  overlayPause: document.getElementById('overlay-pause'),
  overlayResults: document.getElementById('overlay-results'),
  resultsTitle: document.getElementById('results-title'),
  resScore: document.getElementById('res-score'),
  resCombo: document.getElementById('res-combo'),
  resAccuracy: document.getElementById('res-accuracy'),
  resGrade: document.getElementById('res-grade'),
  syncState: document.getElementById('sync-state'),
  audioState: document.getElementById('audio-state'),
  btnStart: document.getElementById('btn-start'),
  btnResume: document.getElementById('btn-resume'),
  btnRestart: document.getElementById('btn-restart'),
};

// Colors for lanes
const laneColors = {
  up: { H: 45, S: 100, L: 50, hex: '#ffaa00' }, // Amber
  down: { H: 280, S: 100, L: 65, hex: '#9d00ff' }, // Purple
  left: { H: 340, S: 100, L: 60, hex: '#ff007f' }, // Magenta
  right: { H: 190, S: 100, L: 50, hex: '#00f0ff' }, // Cyan
  shield: { H: 120, S: 100, L: 55, hex: '#39ff14' }, // Green
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDeg(value) {
  return ((Number(value || 0) % 360) + 360) % 360;
}

function angleDeltaDeg(target, current) {
  return ((normalizeDeg(target) - normalizeDeg(current) + 540) % 360) - 180;
}

function approachForAngle(angle) {
  const snapped = Math.round(normalizeDeg(angle) / 90) * 90 % 360;
  const index = worldAngles.indexOf(snapped);
  return index >= 0 ? worldApproaches[index] : 'front';
}

function bearingLabel(note) {
  const delta = angleDeltaDeg(note.worldAngleDeg || 0, headYawDeg);
  if (Math.abs(delta) <= hitConeDeg / 2) return `${note.lane.toUpperCase()} IN ZONE`;
  const turn = delta > 0 ? 'RIGHT' : 'LEFT';
  return `${turn} ${Math.round(Math.abs(delta))}`;
}

function noteIsFacing(note, cone = hitConeDeg) {
  return Math.abs(angleDeltaDeg(note.worldAngleDeg || 0, headYawDeg)) <= cone / 2;
}

function setupHeadTracking() {
  if (typeof DeviceOrientationEvent !== 'undefined') {
    window.addEventListener('deviceorientation', (event) => {
      if (typeof event.alpha !== 'number') return;
      if (headYawZero === null) headYawZero = event.alpha;
      headYawDeg = normalizeDeg(event.alpha - headYawZero + simYawDeg);
      headPitchDeg = typeof event.beta === 'number' ? event.beta : headPitchDeg;
      poseMode = 'HEAD';
      lastOrientationAt = Date.now();
    }, true);
  }

  if (typeof DeviceMotionEvent !== 'undefined') {
    window.addEventListener('devicemotion', (event) => {
      const accel = event.acceleration || event.accelerationIncludingGravity || {};
      const forward = Number(accel.z || 0);
      if (Number.isFinite(forward)) {
        depthNudge = clamp((depthNudge * 0.88) + (forward / 90), -0.14, 0.14);
      }
    }, true);
  }
}

async function requestMotionAccess() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined'
        && typeof DeviceOrientationEvent.requestPermission === 'function') {
      await DeviceOrientationEvent.requestPermission();
    }
    if (typeof DeviceMotionEvent !== 'undefined'
        && typeof DeviceMotionEvent.requestPermission === 'function') {
      await DeviceMotionEvent.requestPermission();
    }
  } catch (err) {
    poseMode = 'SIM';
  }
}

function rotateSimHeading(delta) {
  if (Date.now() - lastOrientationAt <= 1200) return;
  simYawDeg = normalizeDeg(simYawDeg + delta);
  headYawDeg = normalizeDeg(headYawDeg + delta);
  poseMode = 'SIM';
}

// Deterministic seed-based trainer chart.
function generateLevel(durationSeconds = 30) {
  const notes = [];
  const laneCycle = ['left', 'up', 'right', 'down', 'up', 'left', 'down', 'right'];
  
  let lastNoteTime = -999;
  const totalBeats = Math.floor(durationSeconds / beatDuration);
  let laneIndex = 0;

  for (let beat = 3; beat < totalBeats && notes.length < trainerMaxNotes; beat += 3) {
    const time = beat * beatDuration;
    if (time - lastNoteTime < trainerMinGapSeconds) continue;
    notes.push({
      time,
      lane: laneCycle[laneIndex % laneCycle.length],
      type: 'normal',
      worldAngleDeg: worldAngles[laneIndex % worldAngles.length],
      approach: worldApproaches[laneIndex % worldApproaches.length],
      spawned: false,
      hit: false,
      missed: false
    });
    laneIndex += 1;
    lastNoteTime = time;
  }
  return notes;
}

let levelTimeline = generateLevel(30);

// Initialize game environment
function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  // Event Listeners for buttons
  els.btnStart.addEventListener('click', () => startGame());
  els.btnResume.addEventListener('click', () => resumeGame());
  els.btnRestart.addEventListener('click', () => startGame());

  // Set up EventSource and API Fetching
  setupHeadTracking();
  setupSSE();
  fetchStartAPI();
  
  // Initial draw
  drawTunnelBackground(0);
}

// Fetch track from backend API
async function fetchStartAPI() {
  try {
    const response = await fetch('/api/pulseblade/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        theme: 'neon launch tunnel',
        bpm: 92,
        difficulty: 'easy',
        agent: true,
        music: true,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[PulseBlade] Loaded external track configuration:', data);
      applyServerPayload(data);
    }
  } catch (err) {
    console.warn('[PulseBlade] Start API unavailable, using WebAudio metronome fallback');
  }
}

function mapServerNote(n) {
  const rawTime = Number(n.t ?? n.time ?? 0);
  const time = rawTime > 100 ? rawTime / 1000 : rawTime;
  const lane = String(n.lane || 'up').toLowerCase();
  const kind = String(n.kind || n.type || 'slice').toLowerCase();
  const worldAngleDeg = normalizeDeg(n.worldAngleDeg ?? n.worldAngle ?? n.angle ?? 0);
  return {
    time,
    lane: ['up', 'down', 'left', 'right', 'shield'].includes(lane) ? lane : 'up',
    type: kind === 'shield' ? 'shield' : kind === 'mine' ? 'hazard' : 'normal',
    worldAngleDeg,
    approach: String(n.approach || approachForAngle(worldAngleDeg)).toLowerCase(),
    spawned: false,
    hit: false,
    missed: false
  };
}

function makePlayableTimeline(notes) {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const playable = [];
  let lastTime = -999;
  sorted.forEach((note, index) => {
    if (playable.length >= trainerMaxNotes) return;
    if (note.time - lastTime < trainerMinGapSeconds) return;
    const laneCycle = ['left', 'up', 'right', 'down'];
    const lane = ['up', 'down', 'left', 'right'].includes(note.lane)
      ? note.lane
      : laneCycle[index % laneCycle.length];
    playable.push({
      ...note,
      lane,
      type: 'normal',
      worldAngleDeg: normalizeDeg(note.worldAngleDeg ?? worldAngles[playable.length % worldAngles.length]),
      approach: note.approach || approachForAngle(note.worldAngleDeg ?? worldAngles[playable.length % worldAngles.length]),
      spawned: false,
      hit: false,
      missed: false,
    });
    lastTime = note.time;
  });
  return playable.length ? playable : generateLevel(levelDurationSeconds);
}

function applyServerPayload(data) {
  if (!data || typeof data !== 'object') return;
  if (data.level && Array.isArray(data.level.notes)) {
    externalLevel = data.level;
    bpm = Number(data.level.bpm) || bpm;
    beatDuration = 60 / bpm;
    levelDurationSeconds = Math.max(10, (Number(data.level.durationMs) || 30000) / 1000);
    
    // Trainer mode: force wide timing and readable single-action charting.
    const hitWindowSeconds = Number(data.level.hitWindowMs) ? Number(data.level.hitWindowMs) / 1000 : 0.45;
    goodRange = Math.max(0.42, Math.min(0.5, hitWindowSeconds));
    perfectRange = Math.min(0.24, Math.max(0.18, goodRange * 0.5));

    const rawNotes = data.level.notes.map(mapServerNote);
    levelTimeline = makePlayableTimeline(rawNotes);
    els.audioState.textContent = 'AGENT LEVEL (EASY)';
  }
  const track = data.track || data;
  if (track.audioData) {
    const mimeType = track.mimeType || 'audio/mpeg';
    externalAudioUrl = `data:${mimeType};base64,${track.audioData}`;
    useExternalAudio = true;
    els.audioState.textContent = 'LYRIA READY';
  } else if (track.audioUrl) {
    externalAudioUrl = track.audioUrl;
    useExternalAudio = true;
    els.audioState.textContent = 'AUDIO READY';
  } else if (track.source) {
    els.audioState.textContent = String(track.source).slice(0, 18).toUpperCase();
  }
}

// Subscribe to SSE events
function setupSSE() {
  sseConnection = new EventSource('/events');
  
  sseConnection.addEventListener('open', () => {
    els.syncState.textContent = 'CONNECTED';
    els.syncState.className = 'live';
  });

  sseConnection.addEventListener('error', () => {
    els.syncState.textContent = 'OFFLINE';
    els.syncState.className = 'offline';
  });

  sseConnection.addEventListener('message', (e) => {
    try {
      const payload = JSON.parse(e.data);
      if (payload && (payload.type === 'pulseblade' || payload.type === 'pulseblade_start')) {
        console.log('[PulseBlade] SSE Event received:', payload);
        handleRemoteEvent(payload);
      } else if (payload && payload.type === 'pulseblade_status') {
        els.audioState.textContent = String(payload.state || 'SYNC').toUpperCase();
      }
    } catch (err) {
      // Ignored
    }
  });
}

// Process remote event commands
function handleRemoteEvent(payload) {
  if (payload.type === 'pulseblade_start') {
    applyServerPayload(payload);
    return;
  }
  if (payload.action === 'start') {
    if (payload.level && Array.isArray(payload.level.notes)) {
      levelTimeline = makePlayableTimeline(payload.level.notes.map(mapServerNote));
    }
    startGame();
  } else if (payload.action === 'pause') {
    pauseGame();
  } else if (payload.action === 'resume') {
    resumeGame();
  } else if (payload.action === 'spawn' && payload.note) {
    // Dynamic real-time note spawning from server stream
    const hasLiveNote = activeNotes.some(note => !note.hit && !note.missed);
    if (gameState === 'PLAYING' && !hasLiveNote) {
      const targetTime = elapsedGameTime + noteTravelTime;
      const lane = String(payload.note.lane || 'up').toLowerCase();
      activeNotes.push({
        time: targetTime,
        lane: ['up', 'down', 'left', 'right'].includes(lane) ? lane : 'up',
        type: 'normal',
        worldAngleDeg: normalizeDeg(payload.note.worldAngleDeg ?? headYawDeg),
        approach: String(payload.note.approach || approachForAngle(payload.note.worldAngleDeg ?? headYawDeg)).toLowerCase(),
        hit: false,
        missed: false
      });
    }
  } else if (payload.action === 'speed' && typeof payload.multiplier === 'number') {
    // Modify speed dynamically
    // Keep feedback short
    showFeedback('SPEED MOD', 'perfect');
  } else if (payload.action === 'kill') {
    endGame(false);
  }
}

// Initialize Web Audio Context
async function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
}

// Play synth sound effects
function playSound(type) {
  if (!audioCtx) return;
  const time = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'hit') {
    // Simple fallback, we prefer playLaneAccent
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, time); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, time + 0.08); // A5
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.start(time);
    osc.stop(time + 0.11);
  } else if (type === 'miss') {
    // Soft, low-frequency dull thump (much quieter and less punishing)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.linearRampToValueAtTime(30, time + 0.15);
    gain.gain.setValueAtTime(0.05, time); // quiet gain
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.start(time);
    osc.stop(time + 0.16);
  } else if (type === 'parry') {
    // Resonant shield bell in A minor
    const notes = [440.00, 659.25, 880.00]; // A4, E5, A5
    notes.forEach(freq => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0.1, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      o.start(time);
      o.stop(time + 0.26);
    });
  }
}

// Synthesize a rich lane-aligned chord stab in key of A minor
function playLaneAccent(lane, rating) {
  if (!audioCtx) return;
  const time = audioCtx.currentTime;
  
  // Set chord frequencies based on lane
  let frequencies = [];
  let oscType = 'triangle'; // warmer pluck
  let filterSweep = true;
  let sweepStart = 2000;
  let sweepEnd = 200;
  let duration = 0.25;
  let volume = rating === 'perfect' ? 0.22 : 0.15;

  if (lane === 'left') {
    // Left: A minor triad chord (A3, C4, E4)
    frequencies = [220.00, 261.63, 329.63];
    oscType = 'triangle';
    sweepStart = 1500;
    sweepEnd = 150;
    duration = 0.28;
  } else if (lane === 'up') {
    // Up: High C major triad (C5, E5, G5) - bright chime
    frequencies = [523.25, 659.25, 783.99];
    oscType = 'sine';
    sweepStart = 2500;
    sweepEnd = 400;
    duration = 0.22;
  } else if (lane === 'right') {
    // Right: A minor 7th bell (A4, C5, E5, G5)
    frequencies = [440.00, 523.25, 659.25, 783.99];
    oscType = 'sine';
    sweepStart = 3000;
    sweepEnd = 600;
    duration = 0.35;
  } else if (lane === 'down') {
    // Down: Heavy bass chord (G2, D3, G3)
    frequencies = [98.00, 146.83, 196.00];
    oscType = 'sawtooth';
    sweepStart = 600;
    sweepEnd = 60;
    duration = 0.30;
    volume = rating === 'perfect' ? 0.18 : 0.12; // sawtooth is naturally louder
  } else if (lane === 'shield') {
    frequencies = [440.00, 554.37, 659.25]; // A4, C#5, E5
    oscType = 'sine';
    duration = 0.2;
  }

  // Create shared filter node for subtractive synthesis
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(6, time); // resonant filter
  filter.frequency.setValueAtTime(sweepStart, time);
  if (filterSweep) {
    filter.frequency.exponentialRampToValueAtTime(sweepEnd, time + duration * 0.7);
  }
  filter.connect(audioCtx.destination);

  // Synthesize chord voices
  frequencies.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, time);
    
    // Slight detune for analog richness
    if (frequencies.length > 1) {
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, time);
    }
    
    osc.connect(gainNode);
    gainNode.connect(filter);
    
    // Amp envelope (pluck shape: rapid attack, smooth exponential decay)
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume / frequencies.length, time + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    osc.start(time);
    osc.stop(time + duration + 0.05);
  });
  
  // Quick transient click on high quality/perfect hit
  if (rating === 'perfect') {
    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(4000, time);
    click.frequency.exponentialRampToValueAtTime(100, time + 0.01);
    clickGain.gain.setValueAtTime(0.05, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
    click.connect(clickGain);
    clickGain.connect(audioCtx.destination);
    click.start(time);
    click.stop(time + 0.02);
  }
}

// Fallback WebAudio Click Track / backing beat scheduler
function scheduler() {
  while (nextSynthBeatTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleSynthBeat(synthBeatIndex, nextSynthBeatTime);
    nextSynthBeatTime += beatDuration;
    synthBeatIndex++;
  }
  synthTimerId = setTimeout(scheduler, lookahead);
}

function scheduleSynthBeat(beatIndex, time) {
  const barBeat = (beatIndex % 4) + 1; // 1, 2, 3, 4 downbeats
  
  // 1. Kick Drum (Beats 1 & 3)
  if (barBeat === 1 || barBeat === 3) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Sub frequency sweep
    osc.frequency.setValueAtTime(130, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);
    
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    
    osc.start(time);
    osc.stop(time + 0.15);
  }
  
  // 2. Snare / Rim Clap (Beats 2 & 4)
  if (barBeat === 2 || barBeat === 4) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Snare rimshot tone
    osc.frequency.setValueAtTime(550, time);
    osc.frequency.linearRampToValueAtTime(150, time + 0.08);
    
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    
    osc.start(time);
    osc.stop(time + 0.10);
    
    // Crisp white-noise splash (highpass sweep)
    const snap = audioCtx.createOscillator();
    const snapGain = audioCtx.createGain();
    snap.type = 'sawtooth';
    snap.frequency.setValueAtTime(4000, time);
    snap.connect(snapGain);
    snapGain.connect(audioCtx.destination);
    snapGain.gain.setValueAtTime(0.05, time);
    snapGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    
    snap.start(time);
    snap.stop(time + 0.05);
  }
  
  // 3. Syncopated Hi-Hat (Every beat, played on the off-beat: time + half beat)
  const hatTime = time + beatDuration / 2;
  const hatOsc = audioCtx.createOscillator();
  const hatGain = audioCtx.createGain();
  hatOsc.type = 'square';
  hatOsc.frequency.setValueAtTime(10000, hatTime);
  hatOsc.connect(hatGain);
  hatGain.connect(audioCtx.destination);
  
  // Offbeats hi-hat is slightly accented on Beats 2 & 4
  const hatVolume = (barBeat === 2 || barBeat === 4) ? 0.035 : 0.022;
  hatGain.gain.setValueAtTime(hatVolume, hatTime);
  hatGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.035);
  
  hatOsc.start(hatTime);
  hatOsc.stop(hatTime + 0.04);

  // 4. Bass synth loop in A Minor
  let bassFreq1 = 110.00; // A2 default
  let bassFreq2 = 0;
  
  if (barBeat === 1) {
    bassFreq1 = 110.00; // A2
  } else if (barBeat === 2) {
    bassFreq1 = 110.00; // A2
    bassFreq2 = 82.41;   // E2 on offbeat
  } else if (barBeat === 3) {
    bassFreq1 = 98.00;  // G2
  } else if (barBeat === 4) {
    bassFreq1 = 110.00; // A2
    bassFreq2 = 130.81;  // C3 on offbeat
  }

  // Play bass note 1
  playBassNote(bassFreq1, time);
  // Play bass note 2 on offbeat if scheduled
  if (bassFreq2 > 0) {
    playBassNote(bassFreq2, time + beatDuration / 2);
  }
}

// Helper to synthesize a warm electronic bass plip
function playBassNote(freq, startTime) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const lp = audioCtx.createBiquadFilter();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);
  
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(380, startTime);
  
  osc.connect(lp);
  lp.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
  
  osc.start(startTime);
  osc.stop(startTime + 0.20);
}

// Start playback
async function startGame() {
  await initAudio();
  await requestMotionAccess();
  
  // Reset state
  score = 0;
  combo = 0;
  maxCombo = 0;
  health = 100;
  notesHit = 0;
  notesMissed = 0;
  parriesCount = 0;
  activeNotes = [];
  particles = [];
  totalPausedDuration = 0;
  pausedTimeStart = 0;
  
  // Reset Level note tracking
  levelTimeline.forEach(n => {
    n.spawned = false;
    n.hit = false;
    n.missed = false;
  });

  els.score.textContent = '000000';
  updateHealthBar();
  
  // Hide screens
  els.overlayStart.classList.add('hidden');
  els.overlayPause.classList.add('hidden');
  els.overlayResults.classList.add('hidden');
  els.comboDisplay.classList.add('hidden');
  
  // Update status
  els.status.textContent = 'PLAYING';
  els.status.className = 'status-pill playing';
  poseMode = Date.now() - lastOrientationAt < 1200 ? 'HEAD' : 'SIM';
  
  gameState = 'PLAYING';
  gameTimeStart = audioCtx.currentTime;
  
  // Start Audio track
  if (useExternalAudio && externalAudioUrl) {
    playExternalAudio();
  } else {
    // Metronome fallback
    nextSynthBeatTime = audioCtx.currentTime + 0.05;
    synthBeatIndex = 0;
    scheduler();
    backingTrackPlaying = true;
    els.audioState.textContent = 'METRONOME CLICK';
  }
  
  // Start render loop
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Decode and play external audio track
async function playExternalAudio() {
  els.audioState.textContent = 'STREAMING AUDIO';
  try {
    const res = await fetch(externalAudioUrl);
    const arrayBuf = await res.arrayBuffer();
    externalAudioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    
    externalAudioSource = audioCtx.createBufferSource();
    externalAudioSource.buffer = externalAudioBuffer;
    externalAudioSource.connect(audioCtx.destination);
    
    externalAudioSource.onended = () => {
      if (gameState === 'PLAYING') endGame(true);
    };
    
    externalAudioSource.start(0);
    backingTrackPlaying = true;
  } catch (err) {
    console.warn('[PulseBlade] Server audio decode failed, falling back to WebAudio synth clicks');
    useExternalAudio = false;
    nextSynthBeatTime = audioCtx.currentTime + 0.05;
    synthBeatIndex = 0;
    scheduler();
    backingTrackPlaying = true;
    els.audioState.textContent = 'METRONOME CLICK';
  }
}

// Pause game
function pauseGame() {
  if (gameState !== 'PLAYING') return;
  
  gameState = 'PAUSED';
  pausedTimeStart = audioCtx.currentTime;
  
  els.status.textContent = 'PAUSED';
  els.status.className = 'status-pill paused';
  els.overlayPause.classList.remove('hidden');
  
  // Stop sounds/scheduler
  if (synthTimerId) clearTimeout(synthTimerId);
  if (externalAudioSource) {
    try {
      externalAudioSource.stop();
    } catch(e) {}
  }
  backingTrackPlaying = false;
}

// Resume game
async function resumeGame() {
  if (gameState !== 'PAUSED') return;
  
  await initAudio();
  
  const pausedTime = audioCtx.currentTime - pausedTimeStart;
  totalPausedDuration += pausedTime;
  
  els.overlayPause.classList.add('hidden');
  els.status.textContent = 'PLAYING';
  els.status.className = 'status-pill playing';
  
  gameState = 'PLAYING';
  
  if (useExternalAudio && externalAudioUrl) {
    // Restart external audio from paused position
    try {
      externalAudioSource = audioCtx.createBufferSource();
      externalAudioSource.buffer = externalAudioBuffer;
      externalAudioSource.connect(audioCtx.destination);
      externalAudioSource.onended = () => {
        if (gameState === 'PLAYING') endGame(true);
      };
      
      const playOffset = audioCtx.currentTime - gameTimeStart - totalPausedDuration;
      if (playOffset < externalAudioBuffer.duration) {
        externalAudioSource.start(0, playOffset);
      } else {
        endGame(true);
      }
      backingTrackPlaying = true;
    } catch (err) {
      useExternalAudio = false;
      nextSynthBeatTime = audioCtx.currentTime + 0.05;
      scheduler();
      backingTrackPlaying = true;
    }
  } else {
    nextSynthBeatTime = audioCtx.currentTime + 0.05;
    scheduler();
    backingTrackPlaying = true;
  }
  
  animationFrameId = requestAnimationFrame(gameLoop);
}

// End Game (Win / Game Over)
function endGame(completed = false) {
  gameState = 'RESULTS';
  
  // Clean timers & audio
  if (synthTimerId) clearTimeout(synthTimerId);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (externalAudioSource) {
    try {
      externalAudioSource.stop();
    } catch(e) {}
  }
  backingTrackPlaying = false;
  
  els.overlayResults.classList.remove('hidden');
  
  if (completed) {
    els.resultsTitle.textContent = 'MISSION COMPLETED';
    els.resultsTitle.style.color = 'var(--green-neon)';
    els.status.textContent = 'VICTORY';
    els.status.className = 'status-pill live';
  } else {
    els.resultsTitle.textContent = 'SHIELD DEPLETED';
    els.resultsTitle.style.color = 'var(--red-neon)';
    els.status.textContent = 'CRITICAL';
    els.status.className = 'status-pill critical';
  }
  
  // Stats
  const totalNotes = notesHit + notesMissed;
  const accuracy = totalNotes > 0 ? Math.round((notesHit / totalNotes) * 100) : 0;
  
  // Grade
  let grade = 'F';
  if (completed) {
    if (accuracy >= 95) grade = 'S';
    else if (accuracy >= 90) grade = 'A';
    else if (accuracy >= 80) grade = 'B';
    else if (accuracy >= 70) grade = 'C';
    else grade = 'D';
  }
  
  els.resScore.textContent = score;
  els.resCombo.textContent = maxCombo;
  els.resAccuracy.textContent = `${accuracy}%`;
  els.resGrade.textContent = grade;
  
  if (grade === 'S' || grade === 'A' || grade === 'B') {
    els.resGrade.className = 'accent';
    els.resGrade.style.color = 'var(--cyan-neon)';
  } else if (grade === 'F') {
    els.resGrade.className = 'accent';
    els.resGrade.style.color = 'var(--red-neon)';
  } else {
    els.resGrade.className = 'accent';
    els.resGrade.style.color = 'var(--amber-neon)';
  }
}

// Display hit/miss visual text toast
function showFeedback(text, ratingClass) {
  els.feedback.textContent = text;
  els.feedback.className = `feedback-toast show ${ratingClass}`;
  
  setTimeout(() => {
    if (els.feedback.textContent === text) {
      els.feedback.className = 'feedback-toast';
    }
  }, 400);
}

// Trigger particle explosions
function spawnParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 4,
      alpha: 1,
      decay: 0.02 + Math.random() * 0.04,
      color: color
    });
  }
}

// Main gameplay tick loop
function gameLoop() {
  if (gameState !== 'PLAYING') return;
  
  // Calculate elapsed time
  elapsedGameTime = audioCtx.currentTime - gameTimeStart - totalPausedDuration;
  
  // 1. Process spawns from the levelTimeline
  if (elapsedGameTime >= levelDurationSeconds) {
    endGame(true);
    return;
  }

  // 1. Process spawns from the levelTimeline
  levelTimeline.forEach(note => {
    if (!note.spawned && elapsedGameTime >= (note.time - previewTravelTime)) {
      note.spawned = true;
      activeNotes.push({
        time: note.time,
        lane: note.lane,
        type: note.type,
        worldAngleDeg: normalizeDeg(note.worldAngleDeg),
        approach: note.approach || approachForAngle(note.worldAngleDeg),
        hit: false,
        missed: false
      });
    }
  });
  
  // 2. Process active notes (miss detection)
  activeNotes.forEach(note => {
    if (!note.hit && !note.missed) {
      const timeDiff = elapsedGameTime - note.time;
      if (timeDiff > goodRange || (timeDiff > 0.15 && !noteIsFacing(note, viewConeDeg))) {
        // Miss! Note flew past targets
        note.missed = true;
        notesMissed++;
        combo = 0;
        els.comboDisplay.classList.add('hidden');
        
        if (note.type === 'hazard' || note.type === 'shield') {
          // Hazards deal more damage
          health = Math.max(0, health - 25);
          showFeedback(note.type === 'shield' ? 'SHIELD MISS' : 'HAZARD MISS', 'miss');
        } else {
          health = Math.max(0, health - 6);
          showFeedback('MISS', 'miss');
        }
        
        recoveryActiveUntil = Date.now() + 1500; // activate HUD recovery message
        updateHealthBar();
        playSound('miss');
        
        if (health <= 0) {
          endGame(false);
        }
      }
    }
  });
  
  // Filter out expired notes (e.g. hit or missed for a while)
  activeNotes = activeNotes.filter(note => {
    const elapsedSinceTarget = elapsedGameTime - note.time;
    return !((note.hit || note.missed) && elapsedSinceTarget > 0.4);
  });
  
  // Update Next Cue on HUD
  updateCueHud();

  // 3. Render frame
  renderCanvas();
  
  // 4. Queue next frame
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Update health bar visual classes based on critical values
function updateHealthBar() {
  els.healthBar.style.width = `${health}%`;
  els.healthBar.className = 'health-bar-fill';
  
  if (health < 25) {
    els.healthBar.classList.add('critical');
    els.status.className = 'status-pill critical';
  } else if (health <= 50) {
    els.healthBar.classList.add('warning');
    if (gameState === 'PLAYING') els.status.className = 'status-pill playing';
  } else {
    if (gameState === 'PLAYING') els.status.className = 'status-pill playing';
  }
}

// Handle lane hit inputs
function handleHitAttempt(lane) {
  if (gameState !== 'PLAYING') return;
  
  // Find nearest note in this lane in the hit zone
  let targetNote = null;
  let minDiff = Infinity;
  
  activeNotes.forEach(note => {
    if (note.lane === lane && !note.hit && !note.missed && noteIsFacing(note, hitConeDeg)) {
      const diff = Math.abs(elapsedGameTime - note.time);
      if (diff < goodRange && diff < minDiff) {
        minDiff = diff;
        targetNote = note;
      }
    }
  });
  
  if (targetNote) {
    if (targetNote.type === 'hazard' || targetNote.type === 'shield') {
      // Slicing a hazard note deals massive damage!
      targetNote.missed = true;
      notesMissed++;
      combo = 0;
      els.comboDisplay.classList.add('hidden');
      health = Math.max(0, health - 30);
      updateHealthBar();
      playSound('miss');
      showFeedback(targetNote.type === 'shield' ? 'USE ENTER' : 'HAZARD DETONATED', 'miss');
      
      const targetPos = getTargetPos(lane);
      spawnParticles(targetPos.x, targetPos.y, 'var(--red-neon)');
      
      if (health <= 0) {
        endGame(false);
      }
    } else {
      // Successfully hit normal note!
      targetNote.hit = true;
      notesHit++;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      
      // Calculate score based on timing
      let pointAward = 50;
      let rating = 'GOOD';
      let ratingClass = 'good';
      
      if (minDiff <= perfectRange) {
        pointAward = 100;
        rating = 'PERFECT';
        ratingClass = 'perfect';
        health = Math.min(100, health + 5);
      } else {
        health = Math.min(100, health + 2);
      }
      
      score += pointAward * (1 + Math.floor(combo / 10)); // Combo score multiplier
      updateHealthBar();
      
      // Update DOM
      els.score.textContent = String(score).padStart(6, '0');
      
      els.comboDisplay.classList.remove('hidden');
      els.comboCount.textContent = combo;
      els.comboDisplay.classList.remove('pop');
      void els.comboDisplay.offsetWidth; // Trigger reflow
      els.comboDisplay.classList.add('pop');
      
      showFeedback(rating, ratingClass);
      playLaneAccent(lane, ratingClass); // Play rich, lane-aligned synth chord stabs in key
      targetFlashes[lane] = 1.0; // Trigger visual target pulse animation
      updateCueHud();
      
      // Spawn particles
      const targetPos = getTargetPos(lane);
      spawnParticles(targetPos.x, targetPos.y, laneColors[lane].hex);
    }
  } else {
    // Stray slice - break combo slightly (or no-op)
    // To keep D-pad feel satisfying, we don't penalize stray slices too heavily
  }
}

// Handle Parry action
function handleParry() {
  if (gameState !== 'PLAYING') return;
  
  parryActive = true;
  parryTime = Date.now();
  playSound('parry');
  
  // Find any note in the parry range
  let parriedAny = false;
  
  activeNotes.forEach(note => {
    if (!note.hit && !note.missed) {
      const diff = Math.abs(elapsedGameTime - note.time);
      if (diff < goodRange) {
        // Can parry any note, but especially useful on hazards!
        note.hit = true; // mark as processed
        parriedAny = true;
        
        let bonus = 150;
        if (note.type === 'hazard' || note.type === 'shield') {
          bonus = 250;
          parriesCount++;
          showFeedback(note.type === 'shield' ? 'SHIELD HIT' : 'HAZARD PARRIED', 'parry');
        } else {
          showFeedback('PARRY', 'parry');
        }
        
        score += bonus;
        health = Math.min(100, health + 10);
        updateHealthBar();
        els.score.textContent = String(score).padStart(6, '0');
        
        // Spawn shield green particles
        const targetPos = getTargetPos(note.lane);
        spawnParticles(targetPos.x, targetPos.y, 'var(--green-neon)');
      }
    }
  });
  
  if (!parriedAny) {
    showFeedback('SHIELD ACTIVE', 'parry');
  }
}

function updateCueHud() {
  const nextCueEl = document.getElementById('next-cue-text');
  if (!nextCueEl) return;
  if (Date.now() < recoveryActiveUntil) {
    nextCueEl.textContent = 'RECOVER';
    nextCueEl.className = 'next-cue-text recovery';
    return;
  }

  const nextNote = activeNotes.find(note => !note.hit && !note.missed)
    || levelTimeline.find(note => !note.hit && !note.missed);
  if (nextNote) {
    nextCueEl.textContent = bearingLabel(nextNote);
  } else {
    nextCueEl.textContent = poseMode === 'HEAD' ? 'HEAD READY' : 'SIM READY';
  }
  nextCueEl.className = 'next-cue-text';
}

// Helper to get coordinates of targets
function getTargetPos(lane) {
  const center = 300;
  const radius = targetDepth * maxRadius; // 200px
  if (lane === 'up') return { x: center, y: center - radius };
  if (lane === 'down') return { x: center, y: center + radius };
  if (lane === 'left') return { x: center - radius, y: center };
  if (lane === 'right') return { x: center + radius, y: center };
  return { x: center, y: center };
}

// Render routine
function renderCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (Date.now() - lastOrientationAt > 1200 && poseMode === 'HEAD') {
    poseMode = 'SIM';
  }
  
  // Check parry active state
  if (parryActive && Date.now() - parryTime > parryDuration) {
    parryActive = false;
  }
  
  // 1. Draw tunnel background wireframe grid
  drawTunnelBackground(elapsedGameTime);
  drawCompass();
  
  // 2. Draw Target Rings / Zones
  drawTargets();
  
  // 3. Draw Active Notes
  drawNotes();
  
  // 4. Draw Particles
  drawParticles();
  
  // 5. Draw Parry Shield ring
  if (parryActive) {
    const elapsed = (Date.now() - parryTime) / parryDuration;
    const shieldRadius = elapsed * 180;
    
    ctx.save();
    ctx.strokeStyle = `rgba(57, 255, 20, ${1 - elapsed})`;
    ctx.shadowColor = 'var(--green-neon)';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(300, 300, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Render depth tunnel
function drawTunnelBackground(time) {
  const center = 300;
  
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1;
  
  // Draw diagonal lane guide lines
  ctx.beginPath();
  ctx.moveTo(center - maxRadius, center - maxRadius);
  ctx.lineTo(center + maxRadius, center + maxRadius);
  ctx.moveTo(center - maxRadius, center + maxRadius);
  ctx.lineTo(center + maxRadius, center - maxRadius);
  ctx.stroke();
  
  // Draw depth wireframe rings
  // Scroll rings outwards to create motion illusion
  const speed = 2.0; // ring speed
  const ringSpacing = 0.25;
  const tOffset = (time * speed) % ringSpacing;
  
  for (let d = tOffset; d <= 1.0; d += ringSpacing) {
    const r = d * maxRadius;
    const alpha = d * 0.15;
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawCompass() {
  const center = 300;
  ctx.save();
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillText(`${poseMode} ${Math.round(headYawDeg)}°`, center, 86);

  worldAngles.forEach((angle, index) => {
    const delta = angleDeltaDeg(angle, headYawDeg);
    if (Math.abs(delta) > 150) return;
    const x = center + (delta / 150) * 210;
    const active = Math.abs(delta) <= hitConeDeg / 2;
    ctx.fillStyle = active ? 'rgba(57, 255, 20, 0.9)' : 'rgba(0, 240, 255, 0.55)';
    ctx.strokeStyle = active ? 'rgba(57, 255, 20, 0.8)' : 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath();
    ctx.arc(x, 108, active ? 7 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.62)';
    ctx.fillText(worldApproaches[index].toUpperCase(), x, 126);
  });
  ctx.restore();
}

// Render lane targets
function drawTargets() {
  const center = 300;
  const radius = targetDepth * maxRadius; // 200px
  
  ctx.save();
  
  // Draw target path ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw targets on each lane
  const lanes = ['left', 'up', 'down', 'right'];
  lanes.forEach(lane => {
    const pos = getTargetPos(lane);
    const color = laneColors[lane];
    
    // Draw target marker circle
    ctx.fillStyle = `rgba(${color.H === 45 ? '255,170,0' : (color.H === 280 ? '157,0,255' : (color.H === 340 ? '255,0,127' : '0,240,255'))}, 0.15)`;
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = 2;
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = 8;
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Inner center dot
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color.hex;
    ctx.font = '800 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelOffset = lane === 'up' ? -26 : lane === 'down' ? 26 : 0;
    const xOffset = lane === 'left' ? -30 : lane === 'right' ? 30 : 0;
    ctx.fillText(lane.toUpperCase(), pos.x + xOffset, pos.y + labelOffset);

    // Draw visual pulse if targetFlash > 0
    if (targetFlashes[lane] > 0) {
      const flash = targetFlashes[lane];
      ctx.strokeStyle = `rgba(${color.H === 45 ? '255,170,0' : (color.H === 280 ? '157,0,255' : (color.H === 340 ? '255,0,127' : '0,240,255'))}, ${flash * 0.85})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = color.hex;
      ctx.shadowBlur = 10 * flash;
      ctx.beginPath();
      // Expanding circle from target center
      ctx.arc(pos.x, pos.y, 14 + (1.0 - flash) * 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Decay flash
      targetFlashes[lane] = Math.max(0, flash - 0.08);
    }
  });

  if (levelTimeline.some(note => note.type === 'shield')) {
    ctx.strokeStyle = 'var(--green-neon)';
    ctx.fillStyle = 'rgba(57, 255, 20, 0.08)';
    ctx.shadowColor = 'var(--green-neon)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  
  ctx.restore();
}

// Render active notes in flight
function drawNotes() {
  const center = 300;
  
  ctx.save();
  
  activeNotes.forEach(note => {
    if (note.hit) return; // don't draw hit notes
    
    // Calculate current note depth (0 = center, 1 = maximum outer)
    const timeToTarget = note.time - elapsedGameTime; // seconds
    const facingDelta = angleDeltaDeg(note.worldAngleDeg || 0, headYawDeg);
    const absDelta = Math.abs(facingDelta);
    if (absDelta > viewConeDeg) {
      drawOffscreenBearing(note, facingDelta);
      return;
    }

    const travelWindow = timeToTarget > noteTravelTime ? previewTravelTime : noteTravelTime;
    const depth = clamp(1.0 - (timeToTarget / travelWindow) + depthNudge, 0.05, 1.16);
    
    if (depth < 0) return; // not spawned yet
    
    const radius = depth * maxRadius;
    const color = laneColors[note.lane] || laneColors.up;
    
    let x = center;
    let y = center;
    
    const yawShift = (facingDelta / (viewConeDeg / 2)) * 70;

    if (note.lane === 'shield') {
      x = center;
      y = center;
    } else if (note.lane === 'up') y = center - radius;
    else if (note.lane === 'down') y = center + radius;
    else if (note.lane === 'left') x = center - radius;
    else if (note.lane === 'right') x = center + radius;
    x = clamp(x + yawShift, 42, 558);
    
    // Size scales with depth
    const size = Math.max(3, depth * 22);
    
    if (note.type === 'hazard' || note.type === 'shield') {
      // Draw spinning hazard triangle
      ctx.strokeStyle = note.type === 'shield' ? 'var(--green-neon)' : 'var(--red-neon)';
      ctx.fillStyle = note.type === 'shield' ? 'rgba(57, 255, 20, 0.22)' : 'rgba(255, 51, 102, 0.25)';
      ctx.lineWidth = 2;
      ctx.shadowColor = note.type === 'shield' ? 'var(--green-neon)' : 'var(--red-neon)';
      ctx.shadowBlur = 10;
      
      const rot = elapsedGameTime * 5;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = rot + (i * Math.PI * 2 / 3);
        const tx = x + Math.cos(angle) * size;
        const ty = y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      const inZone = noteIsFacing(note, hitConeDeg) && Math.abs(timeToTarget) <= goodRange;
      // Draw normal capsule note (slightly larger for better readability)
      ctx.strokeStyle = color.hex;
      ctx.fillStyle = note.missed ? 'rgba(100, 100, 100, 0.15)' : `hsla(${color.H}, ${color.S}%, ${color.L}%, ${inZone ? 0.68 : 0.38})`;
      ctx.lineWidth = inZone ? 4 : 2;
      
      if (!note.missed) {
        ctx.shadowColor = color.hex;
        ctx.shadowBlur = inZone ? 22 : 12;
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.beginPath();
      ctx.arc(x, y, size * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (inZone) {
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.82)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.45, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Render big direction arrow glyph inside note capsule
      if (!note.missed && size > 6) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(size * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let arrow = '';
        if (note.lane === 'up') arrow = '▲';
        else if (note.lane === 'down') arrow = '▼';
        else if (note.lane === 'left') arrow = '◀';
        else if (note.lane === 'right') arrow = '▶';
        
        ctx.fillText(arrow, x, y);
      }
    }
  });
  
  ctx.restore();
}

function drawOffscreenBearing(note, delta) {
  const side = delta > 0 ? 'RIGHT' : 'LEFT';
  const x = delta > 0 ? 566 : 34;
  const color = laneColors[note.lane] || laneColors.up;
  ctx.save();
  ctx.fillStyle = color.hex;
  ctx.strokeStyle = color.hex;
  ctx.shadowColor = color.hex;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (delta > 0) {
    ctx.moveTo(x - 12, 292);
    ctx.lineTo(x + 8, 300);
    ctx.lineTo(x - 12, 308);
  } else {
    ctx.moveTo(x + 12, 292);
    ctx.lineTo(x - 8, 300);
    ctx.lineTo(x + 12, 308);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = '800 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${side} ${Math.round(Math.abs(delta))}`, x, 326);
  ctx.restore();
}

// Render hit particles
function drawParticles() {
  ctx.save();
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Update particle kinematics
    p.x += p.vx;
    p.y += p.vy;
    p.alpha = Math.max(0, p.alpha - p.decay);
  });
  
  // Filter out transparent particles
  particles = particles.filter(p => p.alpha > 0);
  ctx.restore();
}

// Keydown controller routing
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      depthNudge = clamp(depthNudge + 0.05, -0.14, 0.14);
      handleHitAttempt('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      depthNudge = clamp(depthNudge - 0.05, -0.14, 0.14);
      handleHitAttempt('down');
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      rotateSimHeading(-35);
      handleHitAttempt('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      rotateSimHeading(35);
      handleHitAttempt('right');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (gameState === 'START' || gameState === 'RESULTS') {
      startGame();
    } else if (gameState === 'PLAYING') {
      handleParry();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      pauseGame();
    } else if (gameState === 'PAUSED') {
      resumeGame();
    }
  }
});

// Initialize app on document ready
window.addEventListener('DOMContentLoaded', init);
