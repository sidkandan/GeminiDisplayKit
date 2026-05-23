# Managed agents in Gemini Display Kit

Managed agents are the headline new capability in the Gemini API. Gemini Display Kit
treats them as the **creative spine** of every game, not a chatbox. This
doc catalogs the four patterns we ship — each is one `runManagedAgent` call
with slightly different inputs.

For the underlying Gemini docs, see
<https://ai.google.dev/gemini-api/docs/agents>.

---

## Pattern 1 — Director

**Use when:** the game needs a coherent, escalating arc designed up-front.
**Latency:** ~20s for the design call. Cache the result; don't call again per turn.
**Trace surface:** the captured `interaction.steps` becomes a Director's-View console.

```js
import { runManagedAgent } from "gemini-display-kit/tools";

const director = await runManagedAgent({
  prompt: `Design a 5-step scavenger arc for "Cerebral Valley venue". ` +
          `Return JSON: {"quest":[{"objective":"...","hint":"...","creature_hint":"..."}]}`,
  systemInstruction:
    "You are THE GAME MASTER. Each objective must be SAFE, fun, and completable in ~30s with one phone photo. " +
    "Output compact JSON only — no prose outside the JSON.",
  threadKey: "director",
});

hud.broadcast({ type: "director", text: director.text, trace: director.trace });
```

The `trace[]` will contain `thought` steps, any tool calls the agent made,
and the model's outputs — render them in the UI as proof the agent really
worked, not just one prompt → one completion.

**Example:** `examples/omni-odyssey` uses Director for quest arc design.

---

## Pattern 2 — Hatchery (per-entity, with code execution)

**Use when:** you have N entities (monsters, NPCs, levels, …) each of
which needs its own bespoke configuration. Spawn N agents in parallel;
each one **writes code and runs it in its sandbox** to self-test.

```js
for (const entity of entities) {
  // One agent per entity, with per-entity environment sources
  const trained = await runManagedAgent({
    prompt: `You are the tactician for ${entity.name}. ` +
            `Write a Python script in your sandbox that imports battle_simulator, ` +
            `runs 10 trials against a random opponent, and tunes the strategy weights. ` +
            `Output the final strategy as JSON matching the schema in your AGENTS.md.`,
    systemInstruction: makeEntityBrief(entity),
    sources: [
      { type: "inline", target: ".agents/AGENTS.md", content: makeEntityBrief(entity) },
      { type: "inline", target: "battle_simulator.py", content: SIMULATOR_PY },
      { type: "inline", target: "gamedata.json", content: JSON.stringify(gamedata) },
    ],
    threadKey: `hatchery:${entity.id}`,
  });

  // trained.trace will include code_execution_call / code_execution_result steps
  fs.writeFileSync(`data/strategies/${entity.id}.json`, trained.text);
  fs.writeFileSync(`data/traces/${entity.id}.json`, JSON.stringify(trained.trace));
}
```

This is the strongest "managed agents" demo — judges click an entity in the
UI and see captured `code_execution_call` steps with the actual Python the
agent wrote, plus the `code_execution_result` with what came back from the
sandbox.

**Example:** `examples/prompt-arena` trains 8 monsters this way.

---

## Pattern 3 — World-balancer (non-blocking)

**Use when:** something happened in the game (player scanned a thing,
captured a card, hit a milestone) and you want an agent to make a
balancing call WITHOUT making the player wait.

```js
// In a route handler:
"POST /api/scan": async ({ body, hud, tools }) => {
  const card = await mintCard(body);            // fast, returns immediately
  hud.broadcast({ type: "card", card, ts: Date.now() });

  // Fire-and-forget: agent reviews, broadcasts later when it returns
  tools.runManagedAgent({
    prompt: `New card minted: ${JSON.stringify(card)}. ` +
            `Suggest a balancing tweak (rarity, hp, move power) and a next quest.`,
    threadKey: `world-balance:${card.id}`,
  })
    .then((r) => hud.broadcast({ type: "balance", cardId: card.id, text: r.text, trace: r.trace }))
    .catch((e) => hud.broadcast({ type: "balance", cardId: card.id, error: e.message }));

  return { ok: true, card };
},
```

This pattern is the secret sauce for keeping the HUD responsive while
still doing meaningful agent work in the background.

**Example:** PROMPT ARENA uses this when a new audience-submitted monster
arrives between brackets — the balancer suggests opening tweaks.

---

## Pattern 4 — Hint-giver (image-grounded, turn-side)

**Use when:** the player needs help and you have a recent frame from the
phone/glasses camera path. The agent looks at the image and returns one
short hint.

```js
"POST /api/hint": async ({ body, hud, tools }) => {
  const hint = await tools.runManagedAgent({
    prompt: `Player is on step ${body.step}: "${body.objective}". ` +
            `Look at this frame and give one ≤15-word hint to help them find what they need.`,
    systemInstruction: "You are the Game Master. Be clever and brief.",
    imageContext: body.lastFrame,    // { data: base64, mimeType: "image/jpeg" }
    threadKey: `hint:${body.sessionId}`,
  });
  hud.broadcast({ type: "hint", text: hint.text, ts: Date.now() });
  return { ok: true, hint: hint.text };
},
```

*(No example shipped — see the framework Phase 3 plan for the `quest` template.)*

---

## Glossary

| Term | What it means |
|---|---|
| `agent` | The agent id (default `antigravity-preview-05-2026`). Override per call. |
| `threadKey` | Arbitrary string. Calls sharing a `threadKey` chain via `previous_interaction_id`. Calls with different keys are independent. **This fixes the cross-surface contamination bug** the prototypes had. |
| `sources` | `[{ type: "inline", target: "path", content: "..." }]` — extra files dropped into the agent's remote sandbox at the start of the interaction. |
| `imageContext` | `{ data: base64, mimeType }` — turns the prompt into multimodal input. |
| `tools` | Extra Gemini agent-tools (default `[{ type: "google_search" }]`). |
| `trace[]` | Each step has `.type` (`thought` / `function_call` / `code_execution_call` / `code_execution_result` / `model_output` / `google_search_call`) and either `.text` or `.query`. Render in your UI as proof of work. |

## Tips

- **Always set `threadKey`** if your game makes more than one agent call.
  The default unkeyed path starts a fresh thread every time, which is
  occasionally what you want but usually isn't.
- **`onStart` is a great place** to spawn a Director agent for an arc the
  player will live with for the whole session.
- **Pre-warm in your `npm run hatch` script** — train your entities once
  offline so the demo runs from cache.
- **Capture traces to disk** — the strongest proof for "managed agents,
  not just API calls" is rendering a real captured trace, not regenerating
  one live.
