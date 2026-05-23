# Anti-pattern defense

> The hackathon rules list **disqualified project types**. This document
> shows why Gemini Flash Meta Displays does not fall into any of them.

## The banned list, item by item

| Banned | Verdict | Why |
|---|---|---|
| AI Mental Health Advisor | ❌ N/A | Framework for games; no health, no mental-health, no advice. |
| Basic RAG Applications | ❌ N/A | No retrieval anywhere. No vector store, no document indexer. |
| Streamlit Applications | ❌ N/A | Node + plain HTML/CSS/JS only. No Streamlit, no Python web framework on the main path. |
| **Image Analyzers** | ❌ N/A | **See dedicated section below.** |
| AI Education Chatbot | ❌ N/A | No chatbot, no education vertical. |
| AI Job Application Screener | ❌ N/A | No HR, no screening, no job applications. |
| AI Nutrition Coach | ❌ N/A | No nutrition, no coaching, no food. |
| Personality Analyzers | ❌ N/A | No personality inference. System prompts in the framework's `runManagedAgent` explicitly forbid inference of identity, age, ethnicity, health from any image. |
| Medical advice | ❌ N/A | Entertainment only. The `system_instruction` in `src/tools/managed-agent.mjs` examples cite "never include secrets, never give medical/health advice." |

## Why we are not an "Image Analyzer"

The "image analyzer" anti-pattern is **the only one in the banned list
that we have to actively defend against**, because Gemini Flash Meta
Displays does wire multimodal Gemini calls and could be pattern-matched
by a judge as "another image analyzer."

### What an "image analyzer" is (the thing being banned)

The banned project shape is: "user uploads an image → AI describes
what's in the image → app returns the description." That's a single-step
service whose product *is* the description of an image. It's banned
because it's a trivial, oft-built wrapper around Gemini's multimodal
capability without meaningful product on top.

### What Gemini Flash Meta Displays actually is

**Gemini Flash Meta Displays is a framework that helps developers build
games on a smart-glasses platform.** The framework itself does not
analyze any images — it is infrastructure (HTTP, SSE, tunnel, CLI,
templates).

The games built with the framework are *creative* — they generate
imagery, music, agent-directed narrative:

- **OMNI-ODYSSEY** is a generated world engine. Gemini Flash **narrates**
  each beat (text → text); Nano Banana **paints** each scene (text →
  image); audience-conjured monsters are **painted from a text
  description**, not from a photo. **Vision input is never used.** The
  product is a story unfolding on the lenses.
- **PulseBlade** is a generated 360° wearable rhythm game. Flash designs
  the level structure as JSON (text → JSON), Lyria generates the
  backing track (text → audio), a managed agent reviews the level for
  balance (text → notes). **There is no camera input. PulseBlade is
  NOT Beat Saber, and it is NOT an image analyzer.**
- **PROMPT ARENA** is a strategy simulation. Managed agents **write
  Python and run it in a remote sandbox** to tune monster battle
  strategies. Imagen 4 generates monster sprites from text. **No
  user-supplied images. No vision input anywhere in the loop.**

None of the live-demo flows accept an arbitrary user image and respond
with a description of it. That's the test for "image analyzer." We
fail it.

### The Hint-giver pattern caveat

The framework documents a fourth managed-agent pattern called
"Hint-giver" (`docs/managed-agents.md` Pattern 4) that *does* accept an
image as an input to the agent call. **But:**

1. It's a documented pattern, not a shipped example
2. Even if a game used it, the image is one input to a **game-mechanic
   agent**, not the product of the app. The agent's output is a "hint" —
   game state, not a description-as-a-service.
3. The example in the docs explicitly bounds the agent to game help
   ("Look at this frame and give one ≤15-word hint to help them find
   what they need") with a tight 15-word cap and a game-master persona.

This is no more an "image analyzer" than a chess engine that takes a
board snapshot and suggests a move is "a chess piece analyzer." The
image is mechanical input; the product is game state.

## Other rule checks

### "Use code, data, or assets you do not have the rights to"

- All code: original, written today, OR npm package (Apache-2.0 / MIT) — see [`PROVENANCE.md`](../PROVENANCE.md) and [`NOTICE`](../NOTICE)
- All monster designs in Prompt Arena: original (Aqualisk, Cindermaw, Emberton, Thornback, Voltaic, Gravelorn, Zephyrus, Quartzion). Names invented today; no third-party IP
- All sprite art: generated today via Imagen 4 (Google service, our own prompts)
- All audio: generated today via Gemini TTS + Lyria 3 (Google services, our own prompts)
- No copyrighted music, no franchise names, no character likenesses

### "Open Source: repositories must be public"

The repo will be made public at `https://github.com/sidkandan/GeminiFlashMetaDisplays` per the push checklist. Confirm by:

```bash
gh repo view sidkandan/GeminiFlashMetaDisplays --json visibility
```

### "Demo must only highlight specific features, code, and functionality that your team built during the hackathon"

The 3-minute demo script ([`DEMO-RUNBOOK.md`](../DEMO-RUNBOOK.md)) is
explicit about this: every artifact shown is in this repo, every file
referenced was authored today, and the talking point at 2:55 directly
addresses provenance with a `git log` command judges can run live.

## If a judge flags us as banned

If you are a judge reading this and you believe this project pattern-matches
any banned category, please:

1. Open [`PROVENANCE.md`](../PROVENANCE.md) and confirm the file-by-file
   ledger
2. Open [`DEMO-RUNBOOK.md`](../DEMO-RUNBOOK.md) and read the Q&A
   defense section
3. Run `git log --reverse | head` and confirm timestamps fall within
   hackathon hours
4. Open any of `examples/prompt-arena/data/traces/m_emberton.json` (the
   managed-agents code-execution evidence) — this is what we built today
   and want to be judged on

If after all that you still believe we're in a banned category, please
email **siddharth.kandan@gmail.com** before disqualifying — we want a
chance to explain.
