import os
import re
import sys
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor
from google import genai
from dotenv import load_dotenv

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

client = genai.Client()

def serialize_steps(steps):
    serialized = []
    if not steps:
        return serialized
        
    for step in steps:
        step_type = getattr(step, 'type', None)
        step_dict = {
            'type': step_type,
            'raw_class': type(step).__name__
        }
        
        if step_type == 'function_call':
            step_dict['id'] = getattr(step, 'id', None)
            step_dict['name'] = getattr(step, 'name', None)
            step_dict['arguments'] = getattr(step, 'arguments', None)
        elif step_type == 'function_result':
            step_dict['call_id'] = getattr(step, 'call_id', None)
            step_dict['name'] = getattr(step, 'name', None)
            result_list = getattr(step, 'result', [])
            result_texts = []
            if isinstance(result_list, list):
                for res in result_list:
                    if hasattr(res, 'text'):
                        result_texts.append(res.text)
                    else:
                        result_texts.append(str(res))
            else:
                result_texts.append(str(result_list))
            step_dict['result'] = "\n".join(result_texts)
            step_dict['is_error'] = getattr(step, 'is_error', False)
        elif step_type == 'code_execution_call':
            step_dict['id'] = getattr(step, 'id', None)
            args = getattr(step, 'arguments', None)
            if args:
                step_dict['code'] = getattr(args, 'code', None)
                step_dict['language'] = getattr(args, 'language', None)
        elif step_type == 'code_execution_result':
            step_dict['call_id'] = getattr(step, 'call_id', None)
            step_dict['result'] = getattr(step, 'result', None)
            step_dict['is_error'] = getattr(step, 'is_error', False)
        elif step_type == 'model_output':
            content_list = getattr(step, 'content', [])
            content_texts = []
            if isinstance(content_list, list):
                for content in content_list:
                    if hasattr(content, 'text'):
                        content_texts.append(content.text)
                    elif hasattr(content, 'parts'):
                        for part in content.parts:
                            if hasattr(part, 'text'):
                                content_texts.append(part.text)
            step_dict['text'] = "\n".join(content_texts)
            
        serialized.append(step_dict)
    return serialized

def extract_json(text):
    # Try looking for a ```json ... ``` code block
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Otherwise try finding a raw JSON object {...}
    match = re.search(r"({.*})", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return json.loads(text)

# Battle simulator python source as string
BATTLE_SIMULATOR_PY = '''import random
import json

with open("gamedata.json") as f:
    gamedata = json.load(f)

ELEMENTS = gamedata["elements"]
TYPE_CHART = gamedata["type_chart"]
MOVES = {m["id"]: m for m in gamedata["moves"]}

def simulate_battle(monster_a, strategy_a, monster_b, strategy_b):
    hp_a, hp_b = 100, 100
    focus_a, focus_b = False, False
    bulwark_a, bulwark_b = False, False
    
    for turn in range(1, 25):
        move_a = select_move(monster_a, strategy_a, hp_a, monster_b, turn)
        move_b = select_move(monster_b, strategy_b, hp_b, monster_a, turn)
        
        power_a = MOVES[move_a]["power"]
        power_b = MOVES[move_b]["power"]
        
        is_a_support = (power_a == 0)
        is_b_support = (power_b == 0)
        
        if is_a_support and not is_b_support:
            order = [("a", move_a), ("b", move_b)]
        elif is_b_support and not is_a_support:
            order = [("b", move_b), ("a", move_a)]
        else:
            if random.random() < 0.5:
                order = [("a", move_a), ("b", move_b)]
            else:
                order = [("b", move_b), ("a", move_a)]
                
        for actor, move_id in order:
            if actor == "a":
                if hp_a <= 0: continue
                hp_a, hp_b, focus_a, bulwark_a, bulwark_b = execute_action(
                    move_id, "a", hp_a, hp_b, focus_a, bulwark_a, bulwark_b, monster_a, monster_b
                )
            else:
                if hp_b <= 0: continue
                hp_b, hp_a, focus_b, bulwark_b, bulwark_a = execute_action(
                    move_id, "b", hp_b, hp_a, focus_b, bulwark_b, bulwark_a, monster_b, monster_a
                )
                
        if hp_a <= 0 or hp_b <= 0:
            break
            
    if hp_a <= 0 and hp_b <= 0:
        return "a" if random.random() < 0.5 else "b"
    elif hp_a <= 0:
        return "b"
    elif hp_b <= 0:
        return "a"
        
    if hp_a > hp_b:
        return "a"
    elif hp_b > hp_a:
        return "b"
    else:
        return "a" if random.random() < 0.5 else "b"

def select_move(monster, strategy, current_hp, opponent, turn):
    legal_moves = monster["moves"]
    
    if turn == 1:
        opening = strategy.get("opening_move")
        if opening in legal_moves:
            return opening
            
    hp_pct = current_hp / 100.0
    defense_threshold = strategy.get("switch_to_defense_below", 0.0)
    def_move = strategy.get("defense_move")
    if hp_pct < defense_threshold and def_move in legal_moves:
        return def_move
        
    weights = strategy.get("move_weights", {})
    prefer_super = strategy.get("prefer_super_effective", True)
    aggression = strategy.get("aggression", 0.5)
    
    scored_moves = []
    for m in legal_moves:
        base_w = weights.get(m, 0.5)
        move_data = MOVES[m]
        
        m_element = move_data["element"]
        opp_element = opponent["element"]
        
        if m_element in TYPE_CHART and opp_element in TYPE_CHART[m_element]:
            type_mult = TYPE_CHART[m_element][opp_element]
        else:
            type_mult = 1.0
            
        score = base_w
        if prefer_super and type_mult >= 2.0:
            score += 0.5
            
        power = move_data.get("power", 0)
        score += aggression * (power / 80.0) * 0.3
        
        scored_moves.append((m, score))
        
    scored_moves.sort(key=lambda x: x[1], reverse=True)
    return scored_moves[0][0]

def execute_action(move_id, actor, hp_self, hp_target, focus_active, bulwark_self, bulwark_target, monster_self, monster_target):
    move = MOVES[move_id]
    power = move["power"]
    
    if move.get("effect") == "heal_30":
        hp_self = min(100, hp_self + 30)
        return hp_self, hp_target, focus_active, bulwark_self, bulwark_target
        
    if move.get("effect") == "defense_up":
        bulwark_self = True
        return hp_self, hp_target, focus_active, bulwark_self, bulwark_target
        
    if move.get("effect") == "attack_up":
        focus_active = True
        return hp_self, hp_target, focus_active, bulwark_self, bulwark_target
        
    m_element = move["element"]
    opp_element = monster_target["element"]
    if m_element in TYPE_CHART and opp_element in TYPE_CHART[m_element]:
        type_mult = TYPE_CHART[m_element][opp_element]
    else:
        type_mult = 1.0
        
    jitter = random.uniform(0.88, 1.0)
    focus_mult = 1.5 if focus_active else 1.0
    
    damage = round(power * type_mult * jitter * focus_mult)
    if bulwark_target:
        damage = round(damage * 0.5)
        bulwark_target = False
        
    hp_target = max(0, hp_target - damage)
    
    if focus_active:
        focus_active = False
        
    if move.get("effect") == "recoil_10":
        recoil = round(0.1 * damage)
        hp_self = max(0, hp_self - recoil)
        
    return hp_self, hp_target, focus_active, bulwark_self, bulwark_target
'''

def write_dispatch(message):
    """Best-effort inter-pane progress dispatch.

    During the hackathon this wrote into a tmux-comm broker on the author's
    machine so progress would surface in the orchestrator pane. The path
    is configurable via OMNI_DISPATCH_PATH; if unset or the parent
    directory doesn't exist, this is a no-op (so cloning judges don't see
    spurious errors).
    """
    dispatch_path = os.environ.get("OMNI_DISPATCH_PATH")
    if not dispatch_path or not os.path.isdir(os.path.dirname(dispatch_path)):
        return
    try:
        report = {
            "type": "dispatch",
            "source": "prompt-arena.hatchery",
            "message": message,
            "ts": int(time.time()),
        }
        with open(dispatch_path, "w") as f:
            json.dump(report, f)
    except Exception as e:
        print(f"Failed to write dispatch: {e}")

def train_monster(monster, gamedata_content):
    m_id = monster["id"]
    name = monster["name"]
    element = monster["element"]
    moves = monster["moves"]
    coaching = monster["coaching"]
    catchphrase = monster["catchphrase"]
    
    print(f"[{name}] Starting training...")
    
    # Define Agents MD content
    agents_md = f"""# System instructions for {name}
You are the battle tactician for the monster: {name} (Element: {element}).
Moveset: {moves}

Your coaching guidance:
"{coaching}"

Your goal is to derive the optimal strategy config for this monster.
You must run self-test simulations in the sandbox to evaluate and tune the strategy weights, and then output the strategy JSON matching the required schema.
"""
    
    # Define Skill MD content
    skill_md = f"""# Skill: Battle Simulation
You can run simulated battles in the sandbox using `battle_simulator.py`.
Import it and use `simulate_battle(monster_a, strategy_a, monster_b, strategy_b)` to run trials and measure win rate.

### Example Tuning Script:
```python
import battle_simulator
import random

monster_a = {{
    "id": "{m_id}",
    "name": "{name}",
    "element": "{element}",
    "moves": {moves}
}}

strategy_a = {{
    "opening_move": "{moves[0]}",
    "move_weights": {{
        "{moves[0]}": 1.0,
        "{moves[1]}": 0.8,
        "{moves[2]}": 0.5,
        "{moves[3]}": 0.5
    }},
    "switch_to_defense_below": 0.35,
    "defense_move": "{'mend' if 'mend' in moves else (moves[2] if len(moves) > 2 else moves[0])}",
    "aggression": 0.7,
    "prefer_super_effective": True
}}

monster_b = {{
    "id": "m_random",
    "name": "Random Opponent",
    "element": "pyro",
    "moves": ["ember", "pyroclasm", "mend", "bulwark"]
}}
strategy_b = {{
    "opening_move": "pyroclasm",
    "move_weights": {{"pyroclasm": 1.0, "ember": 0.5, "mend": 0.2, "bulwark": 0.2}},
    "switch_to_defense_below": 0.25,
    "defense_move": "mend",
    "aggression": 0.6,
    "prefer_super_effective": True
}}

wins = 0
trials = 10
for i in range(trials):
    monster_b["element"] = random.choice(["pyro", "flora", "aqua", "gale", "volt", "terra"])
    winner = battle_simulator.simulate_battle(monster_a, strategy_a, monster_b, strategy_b)
    if winner == "a":
        wins += 1

print(f"RESULT: Trials: {{trials}}, Wins: {{wins}}")
```
"""
    
    # Save files locally for submission completeness
    os.makedirs(".agents/skills/battle-tactician", exist_ok=True)
    with open(".agents/AGENTS.md", "w") as f:
        f.write(agents_md)
    with open(".agents/skills/battle-tactician/SKILL.md", "w") as f:
        f.write(skill_md)
        
    env_config = {
        "type": "remote",
        "sources": [
            {
                "type": "inline",
                "target": ".agents/AGENTS.md",
                "content": agents_md
            },
            {
                "type": "inline",
                "target": ".agents/skills/battle-tactician/SKILL.md",
                "content": skill_md
            },
            {
                "type": "inline",
                "target": "gamedata.json",
                "content": gamedata_content
            },
            {
                "type": "inline",
                "target": "battle_simulator.py",
                "content": BATTLE_SIMULATOR_PY
            }
        ]
    }
    
    prompt = f"""
You are the battle tactician for the monster: {name} (ID: {m_id}, Element: {element}).
Moveset: {moves}

Your coaching guidance:
"{coaching}"

BATTLE SIMULATION INSTRUCTIONS:
1. In your sandbox workspace, you have 'gamedata.json' and 'battle_simulator.py'.
2. Write a Python script (e.g. 'tune_strategy.py') to test your strategy.
3. In this script, you must import `battle_simulator` and simulate a 10-trial battle series against a random opponent (e.g. a mock monster using random moves) following the template in SKILL.md.
4. Run this script in the sandbox using Code Execution, read the results, and tune your strategy's move weights, aggression, and defense threshold.
5. Make sure the strategy weights favor your monster's specific element type-effectiveness and follow the coach's guidelines.

OUTPUT INSTRUCTIONS:
At the very end of your response, output a markdown code block containing ONLY a valid JSON object matching this schema:
{{
  "id": "{m_id}",
  "name": "{name}",
  "element": "{element}",
  "opening_move": "<opening move name>",
  "move_weights": {{
     "{moves[0]}": <weight float 0..1>,
     "{moves[1]}": <weight float 0..1>,
     "{moves[2]}": <weight float 0..1>,
     "{moves[3]}": <weight float 0..1>
  }},
  "switch_to_defense_below": <float 0..1>,
  "defense_move": "<defense move name>",
  "aggression": <float 0..1>,
  "prefer_super_effective": <true/false>,
  "taunts": {{
     "open": "{catchphrase}",
     "super_effective": "<taunt on super effective move>",
     "low_hp": "<taunt when low hp>",
     "win": "<taunt on win>"
  }},
  "self_test": {{
     "trials": 10,
     "wins": <number of wins in your simulation>
  }},
  "reasoning": "<brief explanation of your tuning process and choices>",
  "source": "managed_agent"
}}
"""
    
    try:
        # Retry loop with backoff for rate limits
        max_retries = 5
        delay = 15
        interaction = None
        
        for attempt in range(max_retries):
            try:
                interaction = client.interactions.create(
                    agent="antigravity-preview-05-2026",
                    input=prompt,
                    environment=env_config
                )
                break
            except Exception as e:
                # Check for RateLimitError or 429 in message
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "too_many_requests" in str(e).lower():
                    print(f"[{name}] Rate limited on attempt {attempt+1}/{max_retries}. Sleeping {delay}s...")
                    time.sleep(delay)
                    delay *= 1.5
                else:
                    raise e
                    
        if not interaction:
            raise Exception(f"Failed to generate strategy after {max_retries} attempts due to rate limits.")
            
        # Parse output JSON
        strategy_json = extract_json(interaction.output_text)
        # Force source key
        strategy_json["source"] = "managed_agent"
        
        # Save files
        os.makedirs("data/strategies", exist_ok=True)
        os.makedirs("data/traces", exist_ok=True)
        
        strategy_path = f"data/strategies/{m_id}.json"
        trace_path = f"data/traces/{m_id}.json"
        
        with open(strategy_path, "w") as f:
            json.dump(strategy_json, f, indent=2)
            
        serialized_steps = serialize_steps(interaction.steps)
        with open(trace_path, "w") as f:
            json.dump(serialized_steps, f, indent=2)
            
        print(f"[{name}] Training succeeded! Strategy saved to {strategy_path}.")
        return True, name
        
    except Exception as e:
        print(f"[{name}] Training failed: {e}")
        import traceback
        traceback.print_exc()
        return False, name

def main():
    parser = argparse.ArgumentParser(description="Prompt Arena Hatchery")
    parser.add_argument("--all", action="store_true", help="Train all monsters in monsters.json")
    parser.add_argument("--id", type=str, help="Train a specific monster by ID")
    parser.add_argument("--force", action="store_true", help="Force retrain already trained monsters")
    parser.add_argument("--workers", type=int, default=1, help="Number of concurrent workers (default: 1)")
    args = parser.parse_args()
    
    if not args.all and not args.id:
        parser.print_help()
        sys.exit(1)
        
    # Read gamedata
    with open("gamedata.json") as f:
        gamedata_content = f.read()
        
    # Read monsters
    with open("data/monsters.json") as f:
        monsters_data = json.load(f)
    monsters_list = monsters_data["monsters"]
    
    # Filter monsters by ID if requested
    if args.id:
        monsters_list = [m for m in monsters_list if m["id"] == args.id]
        if not monsters_list:
            print(f"Monster ID {args.id} not found in monsters.json.")
            sys.exit(1)
            
    # Filter out already trained monsters unless --force is used
    filtered_list = []
    for m in monsters_list:
        if not args.force:
            strat_path = f"data/strategies/{m['id']}.json"
            if os.path.exists(strat_path):
                try:
                    with open(strat_path) as f:
                        strat_data = json.load(f)
                    if strat_data.get("source") == "managed_agent":
                        print(f"[{m['name']}] Strategy already trained. Skipping. Use --force to retrain.")
                        continue
                except Exception:
                    pass
        filtered_list.append(m)
        
    print(f"Found {len(filtered_list)} monsters to train.")
    if not filtered_list:
        print("All selected monsters are already trained. Exiting.")
        write_dispatch("Hatchery training skipped: all target strategies are already trained.")
        sys.exit(0)
    
    # Run training
    first_monster_reported = False
    
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(train_monster, m, gamedata_content) for m in filtered_list]
        
        for future in futures:
            success, name = future.result()
            if success and not first_monster_reported:
                # Report first trained monster to pane %6
                write_dispatch(f"First monster trained: {name} successfully tuned!")
                first_monster_reported = True
                
    # Report final completion
    write_dispatch("All Hatchery training completed! Check data/strategies/ and data/traces/")

if __name__ == "__main__":
    main()
