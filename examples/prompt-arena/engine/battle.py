from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from typing import Any


Side = str
Monster = dict[str, Any]
Strategy = dict[str, Any]
GameData = dict[str, Any]


def seed_from_battle_id(battle_id: str) -> int:
    digest = hashlib.sha256(battle_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


@dataclass
class FighterState:
    side: Side
    monster: Monster
    strategy: Strategy
    hp: int
    focus_active: bool = False
    bulwark_active: bool = False

    @property
    def pct(self) -> float:
        return self.hp / 100

    @property
    def alive(self) -> bool:
        return self.hp > 0


class BattleEngine:
    def __init__(
        self,
        monster_a: Monster,
        strategy_a: Strategy,
        monster_b: Monster,
        strategy_b: Strategy,
        gamedata: GameData,
        battle_id: str,
        round_name: str,
    ) -> None:
        self.gamedata = gamedata
        self.rules = gamedata["battle_rules"]
        self.moves = {move["id"]: move for move in gamedata["moves"]}
        self.type_chart = gamedata["type_chart"]
        self.battle_id = battle_id
        self.round_name = round_name
        self.seed = seed_from_battle_id(battle_id)
        self.rng = random.Random(self.seed)
        hp_max = int(self.rules.get("hp_max", 100))
        self.a = FighterState("a", monster_a, strategy_a, hp_max)
        self.b = FighterState("b", monster_b, strategy_b, hp_max)
        self.damage_by_move: dict[str, int] = {}

    def run(self) -> dict[str, Any]:
        turn_cap = int(self.rules.get("turn_cap", 24))
        turns: list[dict[str, Any]] = []

        for n in range(1, turn_cap + 1):
            if not self.a.alive or not self.b.alive:
                break

            move_a = self.choose_move(self.a, self.b, n)
            move_b = self.choose_move(self.b, self.a, n)
            order = self.turn_order(move_a, move_b)

            for actor_side in order:
                actor = self.a if actor_side == "a" else self.b
                target = self.b if actor_side == "a" else self.a
                move_id = move_a if actor_side == "a" else move_b
                if not actor.alive:
                    continue
                if not target.alive and self.moves[move_id].get("kind") == "attack":
                    continue
                turns.append(self.resolve_action(n, actor, target, move_id))
                if not self.a.alive or not self.b.alive:
                    break

        winner = self.pick_winner()
        return {
            "battle_id": self.battle_id,
            "round": self.round_name,
            "seed": self.seed,
            "a": self.snapshot_monster(self.a.monster),
            "b": self.snapshot_monster(self.b.monster),
            "turns": turns,
            "winner": winner,
            "mvp_move": self.pick_mvp_move(winner),
        }

    def choose_move(self, actor: FighterState, defender: FighterState, turn: int) -> str:
        legal = [move_id for move_id in actor.monster.get("moves", []) if move_id in self.moves]
        if not legal:
            raise ValueError(f"{actor.monster.get('id', actor.side)} has no legal moves")

        opening = actor.strategy.get("opening_move")
        if turn == 1 and opening in legal:
            return opening

        threshold = float(actor.strategy.get("switch_to_defense_below", 0))
        defense_move = actor.strategy.get("defense_move")
        if actor.pct < threshold and defense_move in legal:
            return defense_move

        scored = [(self.score_move(actor, defender, move_id), move_id) for move_id in legal]
        best = max(score for score, _ in scored)
        tied = [move_id for score, move_id in scored if abs(score - best) < 1e-9]
        return self.rng.choice(tied)

    def score_move(self, actor: FighterState, defender: FighterState, move_id: str) -> float:
        move = self.moves[move_id]
        weights = actor.strategy.get("move_weights", {})
        score = max(0.01, float(weights.get(move_id, 1.0)))
        aggression = max(0.0, min(1.0, float(actor.strategy.get("aggression", 0.5))))

        if move.get("kind") == "attack":
            score *= 1.0 + aggression * (float(move.get("power", 0)) / 80.0)
            mult = self.type_multiplier(move, defender)
            if actor.strategy.get("prefer_super_effective") and mult >= 2.0:
                score *= 2.25
            elif mult <= 0.5:
                score *= 0.65
        else:
            score *= max(0.35, 1.0 - aggression * 0.25)
            effect = move.get("effect")
            if effect == "heal_30":
                if actor.hp >= 92:
                    score *= 0.12
                elif actor.hp <= 45:
                    score *= 1.9
            elif effect == "defense_up" and actor.bulwark_active:
                score *= 0.1
            elif effect == "attack_up":
                if actor.focus_active:
                    score *= 0.1
                else:
                    best_attack = max(
                        (
                            self.type_multiplier(self.moves[mid], defender)
                            * float(self.moves[mid].get("power", 0))
                            for mid in actor.monster.get("moves", [])
                            if mid in self.moves and self.moves[mid].get("kind") == "attack"
                        ),
                        default=0.0,
                    )
                    if best_attack >= 80:
                        score *= 1.35
        return score

    def turn_order(self, move_a: str, move_b: str) -> list[Side]:
        a_priority = self.moves[move_a].get("power", 0) == 0
        b_priority = self.moves[move_b].get("power", 0) == 0
        if a_priority != b_priority:
            return ["a", "b"] if a_priority else ["b", "a"]
        return ["a", "b"] if self.rng.random() < 0.5 else ["b", "a"]

    def resolve_action(
        self,
        n: int,
        actor: FighterState,
        target: FighterState,
        move_id: str,
    ) -> dict[str, Any]:
        move = self.moves[move_id]
        kind = move.get("kind")
        raw = int(move.get("power", 0))
        type_mult = self.type_multiplier(move, target)
        damage = 0
        note = ""
        effectiveness = self.effectiveness(kind, type_mult)

        if kind == "heal":
            before = actor.hp
            actor.hp = min(100, actor.hp + 30)
            damage = actor.hp - before
            note = f"healed {damage}"
        elif kind == "buff":
            effect = move.get("effect")
            if effect == "defense_up":
                actor.bulwark_active = True
                note = "bulwark primed"
            elif effect == "attack_up":
                actor.focus_active = True
                note = "focus primed"
            effectiveness = "buff"
        else:
            focus_mult = 1.5 if actor.focus_active else 1.0
            actor.focus_active = False
            jitter = self.rng.uniform(
                float(self.rules.get("jitter_min", 0.88)),
                float(self.rules.get("jitter_max", 1.0)),
            )
            damage = round(raw * type_mult * jitter * focus_mult)
            if target.bulwark_active:
                damage = round(damage * 0.5)
                target.bulwark_active = False
                note = "bulwark softened the hit"
            damage = max(0, damage)
            target.hp = max(0, target.hp - damage)
            self.damage_by_move[move_id] = self.damage_by_move.get(move_id, 0) + damage
            if move.get("effect") == "recoil_10" and damage:
                recoil = round(0.1 * damage)
                actor.hp = max(0, actor.hp - recoil)
                note = f"{note}; recoil {recoil}".strip("; ")

        return {
            "n": n,
            "actor": actor.side,
            "move": move_id,
            "move_name": move.get("name", move_id),
            "element": move.get("element", "neutral"),
            "target": actor.side if kind in {"heal", "buff"} else target.side,
            "raw": raw,
            "type_mult": type_mult,
            "damage": damage,
            "effectiveness": effectiveness,
            "a_hp": self.a.hp,
            "b_hp": self.b.hp,
            "taunt": self.pick_taunt(actor, target, effectiveness, n),
            "note": note,
        }

    def type_multiplier(self, move: dict[str, Any], defender: FighterState) -> float:
        move_element = move.get("element", "neutral")
        if move_element == "neutral":
            return 1.0
        return float(self.type_chart[move_element][defender.monster["element"]])

    @staticmethod
    def effectiveness(kind: str | None, type_mult: float) -> str:
        if kind == "heal":
            return "heal"
        if kind == "buff":
            return "buff"
        if type_mult >= 2.0:
            return "super"
        if type_mult <= 0.5:
            return "resisted"
        return "normal"

    def pick_taunt(
        self,
        actor: FighterState,
        target: FighterState,
        effectiveness: str,
        turn: int,
    ) -> str:
        taunts = actor.strategy.get("taunts") or {}
        if not target.alive and taunts.get("win"):
            return str(taunts["win"])
        if effectiveness == "super" and taunts.get("super_effective"):
            return str(taunts["super_effective"])
        if actor.pct <= float(actor.strategy.get("switch_to_defense_below", 0.35)) and taunts.get("low_hp"):
            return str(taunts["low_hp"])
        if turn == 1 and taunts.get("open"):
            return str(taunts["open"])
        return ""

    def pick_winner(self) -> Side:
        if self.a.hp > self.b.hp:
            return "a"
        if self.b.hp > self.a.hp:
            return "b"
        return "a" if self.rng.random() < 0.5 else "b"

    def pick_mvp_move(self, winner: Side) -> str:
        winner_moves = set((self.a if winner == "a" else self.b).monster.get("moves", []))
        scored = {move: dmg for move, dmg in self.damage_by_move.items() if move in winner_moves}
        if not scored:
            return next(iter(winner_moves), "")
        return max(scored.items(), key=lambda item: (item[1], item[0]))[0]

    @staticmethod
    def snapshot_monster(monster: Monster) -> dict[str, Any]:
        return {
            "id": monster["id"],
            "name": monster["name"],
            "element": monster["element"],
        }


def run_battle(
    monster_a: Monster,
    strategy_a: Strategy,
    monster_b: Monster,
    strategy_b: Strategy,
    gamedata: GameData,
    battle_id: str,
    round_name: str,
) -> dict[str, Any]:
    return BattleEngine(
        monster_a,
        strategy_a,
        monster_b,
        strategy_b,
        gamedata,
        battle_id,
        round_name,
    ).run()

