"""
OmniDesk AI — Agentic AI Service Entrypoint (Phase 7)

Standalone Python AI HTTP gateway service providing endpoints:
- POST /v1/chat: AI chat orchestration endpoint
- POST /v1/confirm: Action confirmation endpoint
- GET /v1/health: Service health status
"""

import json
import sys
import os

# Ensure 'ai' directory is in Python module search path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from http.server import HTTPServer, BaseHTTPRequestHandler
from app.config import settings
from app.agents.orchestrator import AgentOrchestrator


class AIServiceHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: dict, status_code: int = 200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        if self.path in ["/v1/health", "/health"]:
            self._send_json({"status": "healthy", "app": settings.APP_NAME, "version": settings.VERSION})
        elif self.path in ["/v1/live", "/live"]:
            self._send_json({"status": "live", "app": settings.APP_NAME})
        elif self.path in ["/v1/ready", "/ready"]:
            self._send_json({"status": "ready", "app": settings.APP_NAME, "dependencies": {"orchestrator": "online", "ledger": "online"}})
        else:
            self._send_json({"error": "Endpoint not found"}, 404)

    def do_POST(self):
        try:
            content_len = int(self.headers.get('Content-Length', 0))
            post_body   = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else ""

            try:
                req_data = json.loads(post_body) if post_body else {}
            except Exception:
                req_data = {}

            if self.path == "/v1/chat":
                result = AgentOrchestrator.process_request(req_data)
                self._send_json(result, 200)
            elif self.path == "/v1/confirm":
                req_data["confirmed"] = True
                result = AgentOrchestrator.process_request(req_data)
                self._send_json(result, 200)
            else:
                self._send_json({"error": "Endpoint not found"}, 404)
        except Exception as e:
            self._send_json({"error": str(e), "status": "error"}, 500)



def run_server(port=8008):
    server_address = ('127.0.0.1', port)
    HTTPServer.allow_reuse_address = True
    httpd = HTTPServer(server_address, AIServiceHandler)
    print(f"[{settings.APP_NAME}] Running on http://127.0.0.1:{port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    run_server()

