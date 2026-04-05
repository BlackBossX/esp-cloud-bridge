import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import parse

import os

ROOT = Path(__file__).parent

# Load simple .env naturally without external dependencies
env_path = ROOT / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ[key.strip()] = val.strip()

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8080))

# Global state stored on the Cloud server. By default, Pin 2 is False
GPIO_STATE = {"2": False}

DEFAULT_INDEX_HTML = """<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ESP Cloud Server</title>
    <style>
        body { font-family: sans-serif; margin: 2rem; max-width: 600px; }
        .box { padding: 1rem; border: 1px solid #ccc; margin-bottom: 1rem; border-radius: 8px; }
        button, input { padding: 0.5rem; margin: 0.25rem 0; }
        pre { background: #f0f0f0; padding: 1rem; overflow-x: auto; }
    </style>
</head>
<body>
    <h2>ESP Cloud Control Panel</h2>
    
    <div class="box">
        <h3>GPIO Control</h3>
        <label>Pin: <input type="number" id="pin" value="2" style="width: 60px;" /></label><br>
        <button onclick="setGpio(true)">Turn ON</button>
        <button onclick="setGpio(false)">Turn OFF</button>
    </div>

    <div class="box">
        <h3>System Status</h3>
        <button onclick="getStatus()">Refresh Current State</button>
    </div>

    <pre id="output">Connecting to cloud...</pre>

    <script>
        const out = document.getElementById('output');
        const getPin = () => parseInt(document.getElementById('pin').value, 10);

        async function fetchApi(url, options = {}) {
            out.textContent = "Loading...";
            try {
                const res = await fetch(url, options);
                const data = await res.json();
                out.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                out.textContent = "Error: " + err.message;
            }
        }

        function setGpio(on) {
            fetchApi('/api/gpio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: getPin(), on: on })
            });
        }

        function getStatus() { fetchApi(`/api/status`); }

        // Start polling the server so UI auto-updates
        setInterval(getStatus, 2000);
        getStatus();
    </script>
</body>
</html>
"""

def send_json(handler: BaseHTTPRequestHandler, code: int, payload: dict):
    body = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = parse.urlparse(self.path)

        if parsed.path == "/":
            html = DEFAULT_INDEX_HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return

        if parsed.path in ("/api/status", "/api/sync"):
            # ESP fetches /api/sync to know what state its pins should be in
            send_json(self, 200, {"ok": True, "state": GPIO_STATE})
            return

        send_json(self, 404, {"ok": False, "error": "Not found"})

    def do_POST(self):
        if self.path not in ("/api/led", "/api/gpio"):
            send_json(self, 404, {"ok": False, "error": "Not found"})
            return

        try:
            content_len = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_len).decode("utf-8", errors="replace")
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            send_json(self, 400, {"ok": False, "error": "Invalid JSON"})
            return

        if self.path == "/api/led":
            on = body.get("on")
            if isinstance(on, bool):
                GPIO_STATE["2"] = on
                send_json(self, 200, {"ok": True, "state": GPIO_STATE})
            else:
                send_json(self, 400, {"ok": False, "error": "Field 'on' must be boolean"})
            return

        if self.path == "/api/gpio":
            on = body.get("on")
            pin = body.get("pin")
            if isinstance(on, bool) and isinstance(pin, int):
                # Save pin state using string representation of key to be compatible with parsing
                GPIO_STATE[str(pin)] = on
                send_json(self, 200, {"ok": True, "state": GPIO_STATE})
            else:
                send_json(self, 400, {"ok": False, "error": "Require boolean 'on' and integer 'pin'"})
            return

    def log_message(self, format, *args):
        print(f"[HTTP] {self.address_string()} - {format % args}")

if __name__ == "__main__":
    print(f"Starting cloud server at http://{HOST}:{PORT}")
    ThreadingHTTPServer.allow_reuse_address = True
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()
