"""
DeepSeek Balance Monitor - Backend Server
==========================================
Queries the DeepSeek API for account balance and serves it via a REST API.
Includes caching to avoid rate-limiting.
"""

import os
import json
import subprocess
import time
import logging
from datetime import datetime, timedelta

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Resolve paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "60"))

# In-memory cache
_cache = {
    "data": None,
    "fetched_at": None,
}

# ---------------------------------------------------------------------------
# DeepSeek API client
# ---------------------------------------------------------------------------

def _curl_get(url: str, api_key: str) -> dict:
    """
    Call DeepSeek API via system curl (bypasses Python SSL issues on Windows).
    Returns parsed JSON dict, or raises subprocess.CalledProcessError on failure.
    """
    logger.info(f"GET {url}")
    result = subprocess.run(
        [
            "curl", "-s", "--max-time", "15",
            "-H", f"Authorization: Bearer {api_key}",
            "-H", "Accept: application/json",
            url,
        ],
        capture_output=True, text=True, timeout=20,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl exited {result.returncode}: {result.stderr.strip()}")
    if not result.stdout.strip():
        raise RuntimeError("Empty response from DeepSeek API")
    return json.loads(result.stdout)


# ---------------------------------------------------------------------------
# Balance logic
# ---------------------------------------------------------------------------

def fetch_balance() -> dict:
    """Hit DeepSeek API and return a structured balance snapshot."""
    if not DEEPSEEK_API_KEY:
        return {
            "error": "No API key configured. Set DEEPSEEK_API_KEY in .env",
            "currencies": [],
        }

    try:
        raw_balance = _curl_get(f"{DEEPSEEK_BASE_URL}/user/balance", DEEPSEEK_API_KEY)
    except Exception as exc:
        logger.error(f"DeepSeek API error: {exc}")
        return {
            "error": f"API error: {exc}",
            "currencies": [],
        }

    # DeepSeek's /user/balance response typically looks like:
    # {
    #   "is_available": true,
    #   "balance_infos": [
    #     {"currency": "CNY", "total_balance": "...", "topped_up_balance": "...", "granted_balance": "..."},
    #     {"currency": "USD", "total_balance": "...", "topped_up_balance": "...", "granted_balance": "..."}
    #   ]
    # }
    # We normalise it into a clean shape for the frontend.

    balance_infos = raw_balance.get("balance_infos", [])
    currencies = []
    for info in balance_infos:
        currencies.append({
            "currency": info.get("currency", "???"),
            "total_balance": float(info.get("total_balance", 0)),
            "topped_up_balance": float(info.get("topped_up_balance", 0)),
            "granted_balance": float(info.get("granted_balance", 0)),
        })

    return {
        "error": None,
        "is_available": raw_balance.get("is_available", False),
        "currencies": currencies,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
    }


def get_cached_balance() -> dict:
    """Return cached balance if still fresh, otherwise re-fetch."""
    now = time.time()
    if (
        _cache["data"] is not None
        and _cache["fetched_at"] is not None
        and (now - _cache["fetched_at"]) < CACHE_TTL
    ):
        logger.info("Returning cached balance")
        return _cache["data"]

    logger.info("Fetching fresh balance from DeepSeek")
    data = fetch_balance()
    _cache["data"] = data
    _cache["fetched_at"] = now
    return data


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the PWA frontend."""
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    """Serve static files (JS, CSS, manifest, icons, etc.)."""
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    # SPA fallback: return index.html for unknown paths
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api")
def api_info():
    return jsonify({
        "service": "DeepSeek Balance Monitor",
        "version": "1.0.0",
        "endpoints": {
            "/api/balance": "Get current balance (cached)",
            "/api/balance?force=true": "Force-refresh balance from DeepSeek",
            "/api/health": "Health check",
        },
    })


@app.route("/api/widget")
def api_widget():
    """
    Widget-friendly endpoint: ultra-compact, plain-text for KWGT / Scriptable.
    Returns:  CNY 18.05 | 充值 18.05 | 赠送 0.00 | ok
    """
    data = get_cached_balance()
    if data.get("error"):
        return f"ERROR: {data['error']}", 200

    currencies = data.get("currencies", [])
    lines = []
    for c in currencies:
        lines.append(
            f"{c['currency']} {c['total_balance']:.2f} | "
            f"充值 {c['topped_up_balance']:.2f} | "
            f"赠送 {c['granted_balance']:.2f}"
        )
    status = "ok" if data.get("is_available") else "offline"
    return "\n".join(lines) + f"\n| {status}", 200


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"})


@app.route("/api/balance")
def api_balance():
    force = request.args.get("force", "").lower() == "true"
    if force:
        logger.info("Force-refreshing balance")
        data = fetch_balance()
        _cache["data"] = data
        _cache["fetched_at"] = time.time()
    else:
        data = get_cached_balance()
    return jsonify(data)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting server on {host}:{port}")
    app.run(host=host, port=port, debug=False)
