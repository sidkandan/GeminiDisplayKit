#!/usr/bin/env python3
"""PROMPT ARENA — end-to-end orchestrator.

Pipeline: default strategies -> (optional) managed-agent training -> bracket -> serve.

  .venv/bin/python run_demo.py --defaults-only   # SAFE demo path: defaults + bracket + serve (no API)
  .venv/bin/python run_demo.py --hatch           # train monsters via managed agents, then bracket + serve
  .venv/bin/python run_demo.py --no-serve        # build data/tournament.json but don't launch the UI
  .venv/bin/python run_demo.py --serve-only      # just launch the arena UI on the existing tournament.json
"""
import argparse
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
PY = str(ROOT / ".venv" / "bin" / "python")


def run(cmd):
    print(f"\n$ {' '.join(cmd)}", flush=True)
    return subprocess.call(cmd, cwd=str(ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hatch", action="store_true", help="train monsters via Gemini managed agents")
    ap.add_argument("--defaults-only", action="store_true", help="skip hatchery; use default strategies (safe)")
    ap.add_argument("--no-serve", action="store_true", help="build the bracket but do not launch the UI")
    ap.add_argument("--serve-only", action="store_true", help="launch the UI against existing tournament.json")
    args = ap.parse_args()

    if args.serve_only:
        return run([PY, "server.py"])

    # 1) ensure every monster has at least a default strategy
    run([PY, "tools/make_defaults.py"])

    # 2) optional: overwrite with managed-agent-trained strategies
    if args.hatch and not args.defaults_only:
        rc = run([PY, "hatchery/hatch.py", "--all"])
        if rc != 0:
            print("WARN: hatchery exited non-zero — continuing on whatever strategies exist.", flush=True)

    # 3) run the bracket (writes data/tournament.json)
    rc = run([PY, "-m", "engine.tournament"])
    if rc != 0:
        print("ERROR: tournament failed.", flush=True)
        return rc

    # 4) serve the arena
    if not args.no_serve:
        return run([PY, "server.py"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
