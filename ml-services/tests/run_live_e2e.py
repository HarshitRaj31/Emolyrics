"""
Live End-to-End Test Harness:
Starts FastAPI Uvicorn server in a background thread, waits for /health,
then executes Node.js backend endToEndMultilingual.test.js.
"""

import os
import sys
import time
import threading
import subprocess
import urllib.request
import json
import uvicorn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(CURRENT_DIR)
BACKEND_DIR = os.path.join(os.path.dirname(ML_DIR), "backend")

if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.api import app, get_predictor

import asyncio
import traceback

def start_server():
    try:
        config = uvicorn.Config(app, host="127.0.0.1", port=8001, log_level="warning")
        server = uvicorn.Server(config)
        server.install_signal_handlers = lambda: None
        asyncio.run(server.serve())
    except Exception as e:
        print(f"[Harness Server Error]: {e}\n{traceback.format_exc()}")

if __name__ == "__main__":
    print("[Harness] Pre-warming predictor...")
    get_predictor()

    print("[Harness] Starting Uvicorn in daemon thread on 127.0.0.1:8001...")
    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    # Wait for health
    healthy = False
    for i in range(15):
        time.sleep(1)
        try:
            with urllib.request.urlopen("http://127.0.0.1:8001/health", timeout=2) as resp:
                data = json.loads(resp.read().decode())
                if data.get("status") == "healthy":
                    healthy = True
                    print(f"[Harness] Server ready! Version: {data.get('modelVersion')}")
                    break
        except Exception:
            pass

    if not healthy:
        print("[Harness] Failed to contact local FastAPI server.")
        sys.exit(1)

    print("[Harness] Launching Node.js E2E test suite...")
    node_test = os.path.join(BACKEND_DIR, "tests", "endToEndMultilingual.test.js")
    res = subprocess.run(["node", node_test], cwd=BACKEND_DIR)
    sys.exit(res.returncode)
