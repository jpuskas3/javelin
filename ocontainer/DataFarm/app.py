import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "OpenContainer"))

import json
from datetime import datetime, timezone
from flask import jsonify, request
from container_base import OContainer

STORAGE_FILE = os.path.join(os.path.dirname(__file__), "records.json")

SOURCES = [
    {"id": "hn", "name": "Hacker News", "url": "https://news.ycombinator.com"},
    {"id": "lobsters", "name": "Lobste.rs", "url": "https://lobste.rs"},
]


def _load_records():
    if not os.path.exists(STORAGE_FILE):
        return []
    with open(STORAGE_FILE) as f:
        return json.load(f)


def _save_records(records):
    with open(STORAGE_FILE, "w") as f:
        json.dump(records, f, indent=2)


class DataFarm(OContainer):
    manifest = {
        "name": "DataFarm",
        "version": "1.0.0",
        "description": "Data ingestion and processing container",
        "port": 5001,
        "capabilities": ["ingest", "storage", "sources"],
    }

    def on_start(self):
        if not os.path.exists(STORAGE_FILE):
            _save_records([])

    def on_stop(self):
        pass

    def register_routes(self, app):

        @app.route("/sources")
        def sources():
            return jsonify({"sources": SOURCES})

        @app.route("/ingest", methods=["POST"])
        def ingest():
            body = request.get_json(silent=True) or {}
            source_id = body.get("source_id")
            raw = body.get("data")

            if not source_id or raw is None:
                return jsonify({"ok": False, "message": "source_id and data are required"}), 400

            source = next((s for s in SOURCES if s["id"] == source_id), None)
            if source is None:
                return jsonify({"ok": False, "message": f"Unknown source: {source_id}"}), 404

            records = _load_records()
            record = {
                "id": len(records) + 1,
                "source_id": source_id,
                "source_name": source["name"],
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "data": raw,
            }
            records.append(record)
            _save_records(records)

            return jsonify({"ok": True, "record": record}), 201

        @app.route("/records")
        def records():
            source_filter = request.args.get("source_id")
            all_records = _load_records()
            if source_filter:
                all_records = [r for r in all_records if r["source_id"] == source_filter]
            return jsonify({"count": len(all_records), "records": all_records})


container = DataFarm()
app = container.app

if __name__ == "__main__":
    container.run(host="127.0.0.1", port=5001)
