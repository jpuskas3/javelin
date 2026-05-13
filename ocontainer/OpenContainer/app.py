import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import jsonify
from container_base import OContainer


class OpenContainer(OContainer):
    manifest = {
        "name": "OpenContainer",
        "version": "1.0.0",
        "description": "Base template — fork to create a new container",
        "port": 5010,
        "capabilities": ["demo", "base"],
    }

    def on_start(self):
        pass

    def on_stop(self):
        pass

    def register_routes(self, app):
        @app.route("/demo")
        def demo():
            return jsonify({"message": "OpenContainer is working"})


container = OpenContainer()
app = container.app

if __name__ == "__main__":
    container.run(host="127.0.0.1", port=5010)
