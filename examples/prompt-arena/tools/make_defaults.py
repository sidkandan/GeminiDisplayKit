#!/usr/bin/env python3
"""Generate fallback (default) strategies for every monster so the engine + UI
run end-to-end WITHOUT waiting on the Gemini hatchery. The hatchery (Gemini, %8)
overwrites these with managed-agent-trained strategies (source='managed_agent').

Run:  .venv/bin/python tools/make_defaults.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
gd = json.loads((ROOT / "gamedata.json").read_text())
monsters = json.loads((ROOT / "data" / "monsters.json").read_text())["monsters"]
move_by_id = {m["id"]: m for m in gd["moves"]}
outdir = ROOT / "data" / "strategies"
outdir.mkdir(parents=True, exist_ok=True)


def default_strategy(m):
    attacks = [mid for mid in m["moves"] if move_by_id[mid]["kind"] == "attack"]
    strongest = max(attacks, key=lambda mid: move_by_id[mid]["power"]) if attacks else m["moves"][0]
    defense = next((mid for mid in m["moves"] if mid in ("mend", "bulwark")), None)
    return {
        "id": m["id"], "name": m["name"], "element": m["element"],
        "opening_move": strongest,
        "move_weights": {mid: (1.0 if move_by_id[mid]["kind"] == "attack" else 0.6) for mid in m["moves"]},
        "switch_to_defense_below": 0.3,
        "defense_move": defense,
        "aggression": 0.7,
        "prefer_super_effective": True,
        "taunts": {
            "open": m.get("catchphrase", "Let's go!"),
            "super_effective": "Direct hit!",
            "low_hp": "Not done yet!",
            "win": "GG.",
        },
        "self_test": {"trials": 0, "wins": 0},
        "reasoning": "Default heuristic strategy (no managed-agent training yet).",
        "source": "default",
    }


def main():
    n = 0
    for m in monsters:
        (outdir / f"{m['id']}.json").write_text(json.dumps(default_strategy(m), indent=2))
        n += 1
    print(f"wrote {n} default strategies to {outdir}")


if __name__ == "__main__":
    main()
