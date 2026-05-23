# 1-minute submission video — shot-by-shot script

> The hackathon submission form requires a ≤1-minute demo video.
> This is the cut. Total: 60 seconds. Aim for 56s with a buffer.

## Shot list

| Time | Duration | Visual | Audio (voiceover) |
|---|---|---|---|
| 0:00 | 4s | Title card: "Gemini Display Kit" + tagline | "Smart-glasses just opened up." |
| 0:04 | 6s | Terminal: `npx gdk create demo-game --template adventure` typed, output streams | "Three commands to ship a glasses game." |
| 0:10 | 4s | Terminal: `cd demo-game && npx gdk dev` typed, bridge URL + tunnel URL + giant QR appear | "Bridge. Tunnel. Install QR." |
| 0:14 | 6s | Phone (Pixel) scans the QR; Meta AI "Add Web App" sheet pops up; Add tapped | "Scan with your phone." |
| 0:20 | 8s | Close-up on the glasses HUD: rune-portal scene + three glowing doors. Pinch gesture on the Neural Band. "the agents are painting your world…" loading state. New scene appears. | "The world is painted by Nano Banana, on demand." |
| 0:28 | 8s | Cut to editor: scroll through `examples/prompt-arena/data/traces/m_emberton.json` showing `code_execution_call` and `code_execution_result` steps | "A managed agent writing Python and running it in a remote sandbox to tune a battle strategy." |
| 0:36 | 6s | Cut to PROMPT ARENA bracket UI: monsters animate, HP bars deplete, SUPER EFFECTIVE flashes, sportscaster TTS voice | "Each monster's strategy was self-trained by its own agent." |
| 0:42 | 6s | Cut to PulseBlade HUD: notes flowing, lane hits, score climbing | "Different game, same framework. Lyria scores the track." |
| 0:48 | 6s | Editor: `templates/adventure/omni.config.mjs` on screen, ~90 lines, key sections highlighted | "Any game on this platform — in ~100 lines." |
| 0:54 | 6s | Title card: "github.com/sidkandan/GeminiDisplayKit · built 2026-05-23" | "Built today. Open source. Apply at any game on Display." |

## Production notes

- **No music** — keep the audio focused on the voiceover. The PROMPT ARENA TTS sportscaster line at 0:36–0:42 IS the soundtrack moment.
- **All captures live** — no mockups. If something fails on first take, retake.
- **Terminal**: use a 16:9 framing with the QR centered. Pre-warm the tunnel so it appears within 4s.
- **Phone scan moment**: shoot over-shoulder so both the laptop screen (QR) and phone screen are visible.
- **Glasses HUD**: capture by ADB screen-recording the HUD-only Web App view (matches what's on the lenses). Don't try to film the actual lenses — too dim.
- **Editor**: use a font ≥16pt so judges watching at YouTube 480p can still read.

## Cut order for editing

1. Live-record all 9 shots with a 1-2s lead and tail
2. Trim to the durations above
3. Voice the narration after picture-lock so timing is precise
4. Color-grade lightly — the glasses HUD and the Nano Banana scene should pop
5. End-card freezes on the GitHub URL for 2 seconds

## Backup if something fails

If on demo day a shot can't be re-captured (e.g., glasses path is broken):
- Replace shot 4 (phone scan) with a still photo of the scan
- Replace shot 5 (glasses HUD) with a desktop browser viewport sized to 600×600

Both are still authentic ("this is what it looks like on the glasses") and
still count as today's work.

## Hard rule

**Every visual in the video must show code or output we built today.** No
stock footage of glasses, no Meta promotional B-roll, no Gemini marketing
graphics. The hackathon's "originality" criterion is strict and we won't
risk it.

## Where to host the final video

- Primary: YouTube (unlisted is fine if the submission form accepts it; otherwise public)
- Link goes in the submission form at https://cerebralvalley.ai/e/google-io-hackathon/hackathon/submit
- Also add as a top-line link in `SUBMISSION.md` once recorded
