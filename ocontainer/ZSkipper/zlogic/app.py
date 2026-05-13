import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "OpenContainer"))

import subprocess
from flask import jsonify, request
from container_base import OContainer

_route_registry = []


class ZSkipper(OContainer):
    manifest = {
        "name": "ZSkipper",
        "version": "1.0.0",
        "description": "Network routing and proxy container",
        "port": 5002,
        "capabilities": ["routing", "proxy", "ping"],
    }

    def on_start(self):
        pass

    def on_stop(self):
        _route_registry.clear()

    def register_routes(self, app):

        @app.route("/routes")
        def list_routes():
            return jsonify({"count": len(_route_registry), "routes": _route_registry})

        @app.route("/routes", methods=["POST"])
        def add_route():
            body = request.get_json(silent=True) or {}
            name = body.get("name")
            target = body.get("target")
            method = body.get("method", "GET").upper()

            if not name or not target:
                return jsonify({"ok": False, "message": "name and target are required"}), 400

            if any(r["name"] == name for r in _route_registry):
                return jsonify({"ok": False, "message": f"Route '{name}' already registered"}), 409

            entry = {"name": name, "target": target, "method": method}
            _route_registry.append(entry)
            return jsonify({"ok": True, "route": entry}), 201

        @app.route("/ping/<host>")
        def ping(host):
            # Allow only hostname/IP chars — no shell injection via the route param
            if not all(c.isalnum() or c in "-." for c in host):
                return jsonify({"ok": False, "message": "Invalid host"}), 400

            try:
                result = subprocess.run(
                    ["ping", "-c", "3", "-W", "2", host],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                reachable = result.returncode == 0
                return jsonify({
                    "host": host,
                    "reachable": reachable,
                    "output": result.stdout.strip() or result.stderr.strip(),
                })
            except subprocess.TimeoutExpired:
                return jsonify({"host": host, "reachable": False, "output": "timeout"}), 504
            except FileNotFoundError:
                return jsonify({"ok": False, "message": "ping not available on this system"}), 500


container = ZSkipper()
app = container.app

if __name__ == "__main__":
    container.run(host="127.0.0.1", port=5002)
