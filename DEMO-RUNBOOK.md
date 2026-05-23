# Gemini Display Kit — Demo Runbook

**One-liner:** A CLI + SDK that lets a developer scaffold, dev-loop, and deploy Gemini-powered games on Meta Ray-Ban Display in three commands. Built live at the Google I/O Hackathon today. Two demo games + one bonus example ship in the repo — all prototyped today and refactored to depend on the framework.

---

## 3-minute stage script

> Timings assume a single operator + a live Pixel + a live pair of Display glasses. Speed dial is set to "Stage" (slowest) on any example UIs.

**0:00 — Hook.** "Smart-glasses just opened up. Building games for the Meta Ray-Ban Display is a stack of plumbing — bridge, SSE, deep-link, tunnel, every Gemini surface wired by hand. We built the framework that erases that stack. Three commands. Watch."

**0:15 — Live scaffold.** Terminal up, fresh shell.
```bash
npx gdk create demo-game --template adventure
cd demo-game && cp .env.example .env  # pre-edited with the key
npx gdk dev
```
Within ~10 seconds the terminal prints: bridge URL, tunnel URL, deep-link, **a giant scannable QR.** "That QR is the install. The bridge holds the Gemini key. The tunnel is HTTPS — required by the glasses."

**0:45 — Phone scan → glasses.** Scan with Pixel, Meta AI app opens → "Add Web App" → Add → glasses HUD lights up: rune-portal scene + three glowing doors. **"That image was painted by Nano Banana."**

**1:00 — Pinch.** Pinch the Neural Band. The HUD shows "the agents are painting your world…" → ~16s later a brand-new scene + three new doors. "Every door is a fresh image, generated on demand. Pure creative — not an image analyzer."

**1:20 — Tour the framework while the next scene paints.** Pull up the repo in the editor:
- `src/bridge/server.mjs` — 350 lines. HTTP + SSE + static + per-game routes. Zero game logic.
- `src/tools/managed-agent.mjs` — the wrapper that makes a managed agent a one-liner with persistent threads and trace capture.
- `templates/adventure/omni.config.mjs` — 90 lines. **This is the entire game.** A `defineGame` call with two route handlers. The framework does everything else.

"The thing you just installed on the glasses was generated from this 90-line file."

**1:50 — Cut to PulseBlade (second demo).** Open `examples/pulseblade/` in the editor side-by-side with the running game. "Same framework. Different mechanic. Flash designs the level structure in JSON, Lyria scores the backing track, a managed-agent director publishes a balancing note that streams to a judge console." Show the level designer prompt + the captured Lyria audio bytes + the director SSE event in the network tab. "Same bridge, same SSE, same tunnel. Different game."

**2:30 — Pivot to PROMPT ARENA (the managed-agents money shot).** Open `examples/prompt-arena/data/traces/m_emberton.json` in the editor. **Scroll.** "This is a real captured trace. The managed agent reads files, lists files, **writes Python** — there it is, `code_execution_call`, the actual code — and then **runs it in its remote sandbox** — `code_execution_result`, the stdout. That's the hatchery pattern. Eight monsters, eight agents, eight sandbox sessions. Each one tunes itself before fighting." Scroll through the bracket UI if time allows.

**2:50 — The turn.** "Framework, two demo games, one bonus example, all built today. Three managed-agent patterns — director, world-balancer, hatchery — proven in code. The framework is the moat: any developer can ship a glasses game tomorrow with the same one-liners."

**2:55 — Provenance.** "Public repo: github.com/sidkandan/GeminiDisplayKit. First commit at event start. Every line of the framework — and the example games — was written today. `PROVENANCE.md` has the file-by-file ledger."

---

## 1-minute video cut

| Time | Shot |
|---|---|
| 0–8s | hook + the `gdk create / dev` terminal moment, QR appears |
| 8–20s | phone scan → glasses HUD lights up → rune-portal scene |
| 20–35s | pinch → Nano Banana paints the next world (the visual wow) |
| 35–48s | **the PROMPT ARENA hatchery trace** — the managed agent writing & running code in a sandbox (the managed-agents prize shot) |
| 48–55s | PulseBlade quick clip — level JSON appearing, Lyria audio playing |
| 55–60s | tagline + "built today, public repo" callout |

See [`docs/video-script.md`](docs/video-script.md) for the shot-by-shot version.

---

## Pre-warm checklist (do 10 min before slot)

- [ ] `.env` file in `examples/omni-odyssey/`, `examples/pulseblade/`, `examples/prompt-arena/` — each with a valid `GEMINI_API_KEY`
- [ ] `npm install` already run in framework root AND in `examples/omni-odyssey` and `examples/pulseblade`
- [ ] `.venv` already set up in `examples/prompt-arena` (Python venv + `pip install -r requirements.txt` if present, otherwise `pip install google-genai flask python-dotenv`)
- [ ] One `gdk dev` rehearsal — ensure cloudflared brings up a tunnel within 10s (re-run if it fails the first time, the trycloudflare API is intermittent)
- [ ] Pixel + glasses paired and the Meta AI app pre-opened
- [ ] PROMPT ARENA: `.venv/bin/python run_demo.py --hatch` ran once so `data/tournament.json` is the frozen "golden" snapshot (cached strategies + sprites + audio)
- [ ] OMNI-ODYSSEY: `node scripts/prewarm-odyssey.mjs` ran once so `examples/omni-odyssey/assets/intro.mp4` (Veo cinematic) + `opening-scene.jpg` exist
- [ ] Browser zoom on the laptop set to 125% so the terminal QR is scannable from 4 feet
- [ ] Speed selector on PROMPT ARENA set to "Stage"

See [`scripts/demo-day.sh`](scripts/demo-day.sh) for the automatable parts of this checklist.

## Q&A defense

| Question | Answer |
|---|---|
| "What did you actually build today?" | The framework — `src/`, `bin/`, `templates/`. And the example games. Public repo, first commit at event start: `git log --reverse --format='%h %ci %s' \| head -3`. The full file-by-file ledger is `PROVENANCE.md`. |
| "Is this an image analyzer?" | No. See `docs/anti-pattern-defense.md`. The framework is provider-agnostic infrastructure; the games are *creative* (Nano Banana paints, Lyria composes, managed agents direct). Where we accept images (the optional Hint-giver pattern), it's as one input to a game-mechanic agent, not as "describe what's in this picture as a service." |
| "How is this *managed agents*, not just API calls?" | Open `examples/prompt-arena/data/traces/m_emberton.json` — a real captured `interaction.steps` array including `code_execution_call` and `code_execution_result`. Server-side code execution + persisted state, not one completion. |
| "Who would use this?" | Any developer with Display Web App access. The platform is brand new. There's no equivalent framework. |
| "Why one framework instead of multiple separate game submissions?" | The framework is the multiplier-impact pitch. Each demo individually is one game; the framework is the means to ship hundreds. |
| "Why is Prompt Arena Python and the rest JavaScript?" | Prompt Arena was prototyped earlier in the day as a standalone project; it's preserved verbatim as the bonus example for the code-execution trace evidence. A future refactor wraps its Flask server in an `omni.config.mjs`. The framework intentionally doesn't dictate language. |

## Reliability ladder (protect the 45% live-demo score)

1. **Primary:** `npx gdk dev` in front of the judges — fresh scaffold, fresh tunnel, fresh QR. The CLI is the moat; show it working from zero.
2. **Tunnel fails (trycloudflare intermittent):** re-run the same command — it succeeds on retry in our testing. Otherwise fall back to (3).
3. **Network dies during the live scaffold:** switch to the pre-warmed `examples/omni-odyssey/` running on `gdk dev --no-tunnel` against localhost on the operator's laptop — point at the running browser-tab HUD instead.
4. **Hard net failure:** play the 1-minute recorded video and walk through `examples/prompt-arena/data/traces/m_emberton.json` in the editor (offline, captured artifacts).
