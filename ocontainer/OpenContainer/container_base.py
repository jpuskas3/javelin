from abc import ABC, abstractmethod
from datetime import datetime, timezone
from flask import Flask, jsonify, request
import time


class OContainer(ABC):
    manifest = {
        "name": "OContainer",
        "version": "1.0.0",
        "description": "Abstract base container",
        "port": 5000,
        "capabilities": [],
    }

    def __init__(self):
        self._running = False
        self._start_time = None       # monotonic, for uptime math
        self._started_at = None       # UTC ISO string, for human display
        self.app = self._create_app()

    def _create_app(self):
        app = Flask(__name__)
        self._register_base_routes(app)
        self.register_routes(app)
        return app

    def _register_base_routes(self, app):
        container = self

        @app.route("/health")
        def health():
            return jsonify({"status": "ok", "name": container.manifest["name"]})

        @app.route("/status")
        def status():
            uptime = None
            if container._start_time is not None:
                uptime = round(time.monotonic() - container._start_time, 2)
            return jsonify({
                "name": container.manifest["name"],
                "running": container._running,
                "uptime_seconds": uptime,
                "started_at": container._started_at,
            })

        @app.route("/start", methods=["POST"])
        def start():
            if container._running:
                return jsonify({"ok": False, "message": "Already running"}), 409
            container._running = True
            container._start_time = time.monotonic()
            container._started_at = datetime.now(timezone.utc).isoformat()
            container.on_start()
            return jsonify({"ok": True, "message": f"{container.manifest['name']} started"})

        @app.route("/stop", methods=["POST"])
        def stop():
            if not container._running:
                return jsonify({"ok": False, "message": "Not running"}), 409
            container._running = False
            container._start_time = None
            container._started_at = None
            container.on_stop()
            return jsonify({"ok": True, "message": f"{container.manifest['name']} stopped"})

        @app.route("/info")
        def info():
            return jsonify(container.manifest)

    @abstractmethod
    def on_start(self):
        pass

    @abstractmethod
    def on_stop(self):
        pass

    @abstractmethod
    def register_routes(self, app):
        pass

    def run(self, host="127.0.0.1", port=None):
        port = port or self.manifest["port"]
        self.app.run(host=host, port=port)
