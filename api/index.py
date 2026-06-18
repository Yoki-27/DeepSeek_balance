"""
Vercel Serverless Entry — DeepSeek Balance Monitor
===================================================
Routes everything through a single Flask-compatible handler.
"""

import os, json, time, subprocess, sys
from datetime import datetime

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
CACHE_TTL = int(os.environ.get("CACHE_TTL_SECONDS", "60"))

# In-memory cache (shared across warm instances)
_cache = {"data": None, "fetched_at": 0}

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------
def _curl_get(url, api_key):
    result = subprocess.run(
        ["curl", "-s", "--max-time", "10",
         "-H", f"Authorization: Bearer {api_key}",
         "-H", "Accept: application/json", url],
        capture_output=True, text=True, timeout=15,
    )
    if result.returncode != 0 or not result.stdout.strip():
        raise RuntimeError(f"curl error: {result.stderr.strip()[:200]}")
    return json.loads(result.stdout)


def fetch_balance():
    if not DEEPSEEK_API_KEY:
        return {"error": "No API key configured", "currencies": []}
    raw = _curl_get(f"{DEEPSEEK_BASE_URL}/user/balance", DEEPSEEK_API_KEY)
    infos = raw.get("balance_infos", [])
    currencies = []
    for info in infos:
        currencies.append({
            "currency": info.get("currency", "???"),
            "total_balance": float(info.get("total_balance", 0)),
            "topped_up_balance": float(info.get("topped_up_balance", 0)),
            "granted_balance": float(info.get("granted_balance", 0)),
        })
    return {
        "error": None,
        "is_available": raw.get("is_available", False),
        "currencies": currencies,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
    }


def get_balance():
    now = time.time()
    if _cache["data"] and (now - _cache["fetched_at"]) < CACHE_TTL:
        return _cache["data"]
    data = fetch_balance()
    _cache["data"] = data
    _cache["fetched_at"] = now
    return data


# ---------------------------------------------------------------------------
# File serving
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

INDEX_HTML = open(os.path.join(FRONTEND_DIR, "index.html"), "r", encoding="utf-8").read()

MIME = {
    ".html": "text/html", ".js": "application/javascript",
    ".json": "application/json", ".css": "text/css",
    ".png": "image/png", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".webmanifest": "application/json",
}

def serve_static(path):
    filepath = os.path.join(FRONTEND_DIR, path.lstrip("/"))
    if os.path.isfile(filepath):
        ext = os.path.splitext(filepath)[1]
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return {"status": 200, "body": content,
                "headers": {"Content-Type": f"{MIME.get(ext, 'text/plain')}; charset=utf-8"}}
    return None


# ---------------------------------------------------------------------------
# Route table
# ---------------------------------------------------------------------------
ROUTES = {
    "GET:/api/balance": lambda r: get_balance(),
    "GET:/api/health":  lambda r: {"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"},
    "GET:/api/widget":  lambda r: _widget(),
}

def _widget():
    data = get_balance()
    if data.get("error"):
        return {"status": 200, "body": f"ERROR: {data['error']}",
                "headers": {"Content-Type": "text/plain; charset=utf-8"}}
    lines = []
    for c in data.get("currencies", []):
        lines.append(f"{c['currency']} {c['total_balance']:.2f} | 充值 {c['topped_up_balance']:.2f} | 赠送 {c['granted_balance']:.2f}")
    status = "ok" if data.get("is_available") else "offline"
    return {"status": 200, "body": "\n".join(lines) + f"\n| {status}",
            "headers": {"Content-Type": "text/plain; charset=utf-8"}}


# ---------------------------------------------------------------------------
# Vercel handler entry point
# ---------------------------------------------------------------------------
class Handler:
    """WSGI-compatible handler for Vercel Python runtime."""

    def __init__(self):
        pass

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "/")
        method = environ.get("REQUEST_METHOD", "GET")
        route_key = f"{method}:{path}"

        # 1. Try API routes
        if route_key in ROUTES:
            result = ROUTES[route_key](None)
            if isinstance(result, dict) and "status" in result:
                status = f"{result['status']} OK"
                headers = [(k, v) for k, v in result.get("headers", {}).items()]
                headers.append(("Access-Control-Allow-Origin", "*"))
                start_response(status, headers)
                return [result["body"].encode("utf-8")]
            # Plain JSON dict
            body = json.dumps(result, ensure_ascii=False)
            start_response("200 OK", [
                ("Content-Type", "application/json; charset=utf-8"),
                ("Access-Control-Allow-Origin", "*"),
            ])
            return [body.encode("utf-8")]

        # 2. Serve index.html for root
        if path in ("/", "/index.html"):
            start_response("200 OK", [
                ("Content-Type", "text/html; charset=utf-8"),
                ("Access-Control-Allow-Origin", "*"),
            ])
            return [INDEX_HTML.encode("utf-8")]

        # 3. Serve static files
        static = serve_static(path)
        if static:
            headers = [(k, v) for k, v in static.get("headers", {}).items()]
            headers.append(("Access-Control-Allow-Origin", "*"))
            start_response(f"{static['status']} OK", headers)
            return [static["body"].encode("utf-8")]

        # 4. CORS preflight
        if method == "OPTIONS":
            start_response("204 No Content", [
                ("Access-Control-Allow-Origin", "*"),
                ("Access-Control-Allow-Methods", "GET, OPTIONS"),
                ("Access-Control-Allow-Headers", "Accept, Authorization"),
            ])
            return [b""]

        # 5. 404
        start_response("404 Not Found", [
            ("Content-Type", "application/json"),
            ("Access-Control-Allow-Origin", "*"),
        ])
        return [json.dumps({"error": "Not found"}).encode("utf-8")]


# This is what Vercel Python runtime looks for
app = Handler()
