# OpenContainer

OpenContainer is the base framework for all OJW/Javelin containers. It is not a service you run in production — it is a template you fork.

Every container in the Javelin project (DeckBoss, ZSkipper, DataFarm, Captain, Maps, Media, Library) extends the `OContainer` abstract base class defined here in `container_base.py`.

## What you get for free

Every container that extends `OContainer` automatically has:

| Route | Method | Description |
|-------|--------|-------------|
| `/health` | GET | Returns `{"status": "ok", "name": ...}` |
| `/status` | GET | Returns running state, uptime seconds, and started_at timestamp |
| `/start` | POST | Sets running=true, records start time, calls `on_start()` |
| `/stop` | POST | Sets running=false, clears start time, calls `on_stop()` |
| `/info` | GET | Returns the container's full manifest dict |

## How to fork this into a new container

1. Copy the `OpenContainer/` directory to a new folder, e.g. `MyService/`.
2. Open `app.py` and replace the `OpenContainer` class with your own.
3. Fill in `manifest` with your container's name, port, and capabilities.
4. Implement the three required methods:
   - `on_start()` — called when `POST /start` is hit. Set up connections, load config, etc.
   - `on_stop()` — called when `POST /stop` is hit. Clean up resources.
   - `register_routes(app)` — add your Flask routes here.
5. Update `manifest.json` to match.
6. Update `run.py` to use your port.
7. Run with `python run.py` or `python app.py`.

## Minimal example — a complete new container

```python
import sys, os
sys.path.insert(0, "/home/user/javelin/ocontainer/OpenContainer")

from flask import jsonify
from container_base import OContainer


class MyService(OContainer):
    manifest = {
        "name": "MyService",
        "version": "1.0.0",
        "description": "Does something useful",
        "port": 5099,
        "capabilities": ["example"],
    }

    def on_start(self):
        print("MyService starting up")

    def on_stop(self):
        print("MyService shutting down")

    def register_routes(self, app):
        @app.route("/hello")
        def hello():
            return jsonify({"message": "Hello from MyService"})


container = MyService()
app = container.app

if __name__ == "__main__":
    container.run(host="127.0.0.1", port=5099)
```

## Abstract methods reference

```python
class OContainer(ABC):
    manifest = { ... }               # Override — name, version, description, port, capabilities

    def on_start(self): ...          # Called on POST /start
    def on_stop(self): ...           # Called on POST /stop
    def register_routes(self, app):  # Register all Flask routes here
        ...
```

All three are `@abstractmethod` — Python will refuse to instantiate your class if any are missing.

## Containers in this project

| Container | Port | Purpose |
|-----------|------|---------|
| OpenContainer | 5010 | Base template (this repo) |
| DataFarm | 5001 | Data ingestion and processing |
| ZSkipper | 5002 | Network routing and proxy |
| Captain | — | Orchestration |
| DeckBoss | — | UI/dashboard |
| Maps | — | Geospatial services |
| Media | — | Media handling |
| Library | — | Content and file management |
