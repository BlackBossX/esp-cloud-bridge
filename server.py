import json
import mimetypes
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
GPIO_STATE = {"2": False, "4": False}
SENSOR_DATA = {"temperature": 28.0, "humidity": 42.0}

def set_cors_headers(handler: BaseHTTPRequestHandler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")

def send_json(handler: BaseHTTPRequestHandler, code: int, payload: dict):
    body = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    set_cors_headers(handler)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        set_cors_headers(self)
        self.end_headers()
        
    def do_GET(self):
        parsed = parse.urlparse(self.path)

        if parsed.path.startswith("/api/"):
            if parsed.path in ("/api/status", "/api/sync"):
                send_json(self, 200, {"ok": True, "state": GPIO_STATE, "sensor": SENSOR_DATA})
                return
            send_json(self, 404, {"ok": False, "error": "Not found"})
            return

        # Serve React frontend static files
        dist_path = ROOT / "frontend" / "dist"
        
        # Determine target file
        request_path = parsed.path.lstrip("/")
        if not request_path:
            target_file = dist_path / "index.html"
        else:
            target_file = dist_path / request_path
            
        # Fallback to index.html for SPA routing routing
        if not target_file.exists():
            target_file = dist_path / "index.html"

        if target_file.exists() and target_file.is_file():
            content = target_file.read_bytes()
            # Guess mimetype
            mime_type, _ = mimetypes.guess_type(target_file.name)
            if not mime_type:
                mime_type = "application/octet-stream"

            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            set_cors_headers(self)
            self.end_headers()
            self.wfile.write(content)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Frontend build not found. Run 'npm run build' in frontend folder.")

    def do_POST(self):
        if self.path not in ("/api/led", "/api/gpio", "/api/sensor"):
            send_json(self, 404, {"ok": False, "error": "Not found"})
            return

        if self.path == "/api/sensor":
            try:
                content_len = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(content_len).decode("utf-8", errors="replace")
                body = json.loads(raw) if raw else {}
                
                temp = body.get("temperature")
                hum = body.get("humidity")
                if temp is not None: SENSOR_DATA["temperature"] = float(temp)
                if hum is not None: SENSOR_DATA["humidity"] = float(hum)
                send_json(self, 200, {"ok": True, "sensor": SENSOR_DATA})
                return
            except Exception:
                pass # Fallback to normal error

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
