import json
import re
import threading
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from google import genai


load_dotenv()

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
MONSTERS_PATH = DATA_DIR / "monsters.json"
GAMEDATA_PATH = ROOT / "gamedata.json"
TOURNAMENT_PATH = DATA_DIR / "tournament.json"
STRATEGIES_DIR = DATA_DIR / "strategies"
TRACES_DIR = DATA_DIR / "traces"

app = Flask(__name__, template_folder="templates", static_folder="static")
data_lock = threading.Lock()

# Kept for the Hatchery integration surface. The deterministic arena never
# creates a Gemini client or makes API calls from this server.
genai_client_class = genai.Client


def serialize_steps(steps):
    serialized = []
    if not steps:
        return serialized

    for step in steps:
        step_type = getattr(step, "type", None)
        step_dict = {
            "type": step_type,
            "raw_class": type(step).__name__,
        }

        if step_type == "function_call":
            step_dict["id"] = getattr(step, "id", None)
            step_dict["name"] = getattr(step, "name", None)
            step_dict["arguments"] = getattr(step, "arguments", None)
        elif step_type == "function_result":
            step_dict["call_id"] = getattr(step, "call_id", None)
            step_dict["name"] = getattr(step, "name", None)
            result_list = getattr(step, "result", [])
            result_texts = []
            if isinstance(result_list, list):
                for res in result_list:
                    if hasattr(res, "text"):
                        result_texts.append(res.text)
                    else:
                        result_texts.append(str(res))
            else:
                result_texts.append(str(result_list))
            step_dict["result"] = "\n".join(result_texts)
            step_dict["is_error"] = getattr(step, "is_error", False)
        elif step_type == "code_execution_call":
            step_dict["id"] = getattr(step, "id", None)
            args = getattr(step, "arguments", None)
            if args:
                step_dict["code"] = getattr(args, "code", None)
                step_dict["language"] = getattr(args, "language", None)
        elif step_type == "code_execution_result":
            step_dict["call_id"] = getattr(step, "call_id", None)
            step_dict["result"] = getattr(step, "result", None)
            step_dict["is_error"] = getattr(step, "is_error", False)
        elif step_type == "model_output":
            content_list = getattr(step, "content", [])
            content_texts = []
            if isinstance(content_list, list):
                for content in content_list:
                    if hasattr(content, "text"):
                        content_texts.append(content.text)
                    elif hasattr(content, "parts"):
                        for part in content.parts:
                            if hasattr(part, "text"):
                                content_texts.append(part.text)
            step_dict["text"] = "\n".join(content_texts)

        serialized.append(step_dict)
    return serialized


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    tmp_path.replace(path)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
    return slug or "monster"


def load_strategy(monster_id: str) -> dict[str, Any] | None:
    path = STRATEGIES_DIR / f"{monster_id}.json"
    if not path.exists():
        return None
    return load_json(path)


def normalize_submission(payload: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    errors: list[str] = []
    gamedata = load_json(GAMEDATA_PATH)
    elements = set(gamedata["elements"])
    move_ids = {move["id"] for move in gamedata["moves"]}

    name = str(payload.get("name", "")).strip()
    element = str(payload.get("element", "")).strip()
    moves = payload.get("moves", [])
    if isinstance(moves, str):
        moves = [part.strip() for part in moves.split(",") if part.strip()]
    moves = [str(move).strip() for move in moves]

    if not name:
        errors.append("name is required")
    if element not in elements:
        errors.append("element must be one of the configured elements")
    if len(moves) != 4 or len(set(moves)) != 4:
        errors.append("moves must contain exactly four unique move ids")
    unknown_moves = [move for move in moves if move not in move_ids]
    if unknown_moves:
        errors.append(f"unknown move ids: {', '.join(unknown_moves)}")

    if errors:
        return None, errors

    monster = {
        "id": f"m_{slugify(name)}",
        "name": name,
        "element": element,
        "moves": moves,
        "coaching": str(payload.get("coaching", "")).strip(),
        "catchphrase": str(payload.get("catchphrase", "")).strip(),
        "coach_name": str(payload.get("coach_name", "")).strip(),
    }
    return monster, []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/submit")
def submit_page():
    return app.send_static_file("submit.html")


@app.route("/api/gamedata")
def api_gamedata():
    return jsonify(load_json(GAMEDATA_PATH))


@app.route("/api/monsters")
def api_monsters():
    monsters = load_json(MONSTERS_PATH)
    strategies = {
        monster["id"]: load_strategy(monster["id"])
        for monster in monsters.get("monsters", [])
    }
    return jsonify({"monsters": monsters.get("monsters", []), "strategies": strategies})


@app.route("/api/strategy/<monster_id>")
def api_strategy(monster_id):
    strategy = load_strategy(monster_id)
    if not strategy:
        return jsonify({"error": "strategy not found"}), 404
    return jsonify(strategy)


@app.route("/api/tournament")
def api_tournament():
    if not TOURNAMENT_PATH.exists():
        return jsonify({"error": "data/tournament.json not found"}), 404
    return jsonify(load_json(TOURNAMENT_PATH))


@app.route("/api/hatch_trace/<monster_id>")
def api_hatch_trace(monster_id):
    path = TRACES_DIR / f"{monster_id}.json"
    if not path.exists():
        return jsonify({"error": "trace not found"}), 404
    return jsonify(load_json(path))


@app.route("/api/submit", methods=["POST"])
def api_submit():
    payload = request.get_json(silent=True)
    if payload is None:
        payload = request.form.to_dict(flat=True)
        payload["moves"] = request.form.getlist("moves")

    monster, errors = normalize_submission(payload)
    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    with data_lock:
        data = load_json(MONSTERS_PATH)
        monsters = data.setdefault("monsters", [])
        original_count = len(monsters)
        monsters[:] = [
            existing for existing in monsters if existing.get("id") != monster["id"]
        ]
        monsters.append(monster)
        write_json(MONSTERS_PATH, data)

    status = "updated" if len(monsters) == original_count else "created"
    return jsonify({"status": status, "monster": monster})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
