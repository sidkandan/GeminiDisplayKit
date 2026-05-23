from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from engine.battle import run_battle


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MONSTERS_PATH = DATA_DIR / "monsters.json"
GAMEDATA_PATH = ROOT / "gamedata.json"
TOURNAMENT_PATH = DATA_DIR / "tournament.json"
STRATEGIES_DIR = DATA_DIR / "strategies"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    tmp_path.replace(path)


def next_power_of_two(value: int) -> int:
    power = 1
    while power < value:
        power *= 2
    return power


def round_names(bracket_size: int) -> list[str]:
    names_by_size = {
        16: ["Round of 16", "Quarterfinal", "Semifinal", "Final"],
        8: ["Quarterfinal", "Semifinal", "Final"],
        4: ["Semifinal", "Final"],
        2: ["Final"],
    }
    return names_by_size[bracket_size]


def round_slug(round_name: str) -> str:
    return round_name.lower().replace(" ", "_")


def load_strategy(monster: dict[str, Any]) -> dict[str, Any]:
    path = STRATEGIES_DIR / f"{monster['id']}.json"
    if path.exists():
        return load_json(path)
    first_attack = next(
        (move for move in monster.get("moves", []) if move not in {"mend", "bulwark", "focus"}),
        monster["moves"][0],
    )
    return {
        "id": monster["id"],
        "name": monster["name"],
        "element": monster["element"],
        "opening_move": first_attack,
        "move_weights": {move_id: 1.0 for move_id in monster.get("moves", [])},
        "switch_to_defense_below": 0.35,
        "defense_move": "mend" if "mend" in monster.get("moves", []) else first_attack,
        "aggression": 0.6,
        "prefer_super_effective": True,
        "taunts": {
            "open": monster.get("catchphrase", ""),
            "super_effective": "That landed clean.",
            "low_hp": "Still standing.",
            "win": "Arena claimed.",
        },
        "self_test": {"trials": 0, "wins": 0},
        "reasoning": "Generated deterministic fallback because no strategy file was present.",
        "source": "engine_fallback",
    }


def validate_monsters(monsters: list[dict[str, Any]]) -> None:
    count = len(monsters)
    if not 2 <= count <= 16:
        raise ValueError(f"data/monsters.json must contain 2..16 monsters, found {count}")
    ids = [monster["id"] for monster in monsters]
    if len(ids) != len(set(ids)):
        raise ValueError("data/monsters.json contains duplicate monster ids")


def initial_pairs(monsters: list[dict[str, Any]], bracket_size: int) -> list[list[str | None]]:
    seeds: list[str | None] = [monster["id"] for monster in monsters]
    seeds.extend([None] * (bracket_size - len(seeds)))
    return [[seeds[i], seeds[i + 1]] for i in range(0, len(seeds), 2)]


def build_tournament() -> dict[str, Any]:
    gamedata = load_json(GAMEDATA_PATH)
    monsters = load_json(MONSTERS_PATH)["monsters"]
    validate_monsters(monsters)

    monster_by_id = {monster["id"]: monster for monster in monsters}
    strategy_by_id = {monster["id"]: load_strategy(monster) for monster in monsters}
    bracket_size = next_power_of_two(len(monsters))
    if bracket_size not in {2, 4, 8, 16}:
        raise ValueError(f"unsupported bracket size {bracket_size}")

    bracket = initial_pairs(monsters, bracket_size)
    current_ids: list[str | None] = [monster["id"] for monster in monsters]
    current_ids.extend([None] * (bracket_size - len(current_ids)))
    battles: list[dict[str, Any]] = []
    rounds: dict[str, list[str]] = {}

    for round_name in round_names(bracket_size):
        round_battle_ids: list[str] = []
        next_ids: list[str | None] = []
        battle_number = 1

        for idx in range(0, len(current_ids), 2):
            left = current_ids[idx]
            right = current_ids[idx + 1]
            if left and not right:
                next_ids.append(left)
                continue
            if right and not left:
                next_ids.append(right)
                continue
            if not left and not right:
                next_ids.append(None)
                continue

            battle_id = f"b_{round_slug(round_name)}_{battle_number}"
            battle_number += 1
            log = run_battle(
                monster_by_id[left],
                strategy_by_id[left],
                monster_by_id[right],
                strategy_by_id[right],
                gamedata,
                battle_id,
                round_name,
            )
            winner_id = log[log["winner"]]["id"]
            battles.append(log)
            round_battle_ids.append(battle_id)
            next_ids.append(winner_id)

        rounds[round_name] = round_battle_ids
        current_ids = next_ids

    champion_id = next(monster_id for monster_id in current_ids if monster_id)
    champion = monster_by_id[champion_id]
    return {
        "created": datetime.now(timezone.utc).isoformat(),
        "bracket": bracket,
        "battles": battles,
        "rounds": rounds,
        "champion": {
            "id": champion["id"],
            "name": champion["name"],
            "coach_name": champion.get("coach_name", ""),
        },
    }


def main() -> None:
    tournament = build_tournament()
    write_json(TOURNAMENT_PATH, tournament)
    champion = tournament["champion"]
    print(
        f"Wrote {TOURNAMENT_PATH.relative_to(ROOT)} "
        f"with {len(tournament['battles'])} battles. Champion: {champion['name']}"
    )


if __name__ == "__main__":
    main()

