# Javelin

> **OJW Trifecta — Node 2 of 3**
> Samsung Archlinux · Gateway · Remote access · USB-C key auth · oContainer orchestrator

---

## What Is Javelin?

Javelin is the **secure gateway** of the OJW distributed system.
It runs on the **Samsung Archlinux machine** and controls all inbound remote access to the home network.

Javelin does three things:

1. **Physical-first authentication** — remote access requires a USB-C drive carrying a machine-specific hash key physically inserted into the user's hardware before any session is granted.
2. **oContainer orchestration** — manages the lifecycle of modular application containers (DeckBoss, ZSkipper, DataFarm, Captain, Maps, Media, Library, OpenContainer) that can be started, stopped, and monitored from Outpost or remotely.
3. **Secured remote control** — exposes a Flask API (auth-gated via Flask-Login) that lets authorized remote users interact with the home ecosystem without direct network exposure.

Javelin is the **only node in OJW that faces the internet**.  Outpost and Compiler are network-local only.

---

## OJW Trifecta

```
┌────────────────────────────────────────────────────────────────────┐
│                        OJW DISTRIBUTED SYSTEM                      │
│                                                                    │
│  ┌─────────────────┐      ┌──────────────────┐      ┌──────────┐  │
│  │   OUTPOST       │◄────►│    JAVELIN       │◄────►│COMPILER  │  │
│  │   Mac mini      │      │  Samsung Arch    │      │  Win PC  │  │
│  │                 │      │                  │      │          │  │
│  │ • Webstation    │      │ • Gateway / VPN  │      │ • Builds │  │
│  │ • Project hub   │      │ • USB-C key auth │      │ • Compile│  │
│  │ • Data & scrape │      │ • oContainers    │      │ • Assets │  │
│  │ • Nexus core    │      │ • Remote access  │      │ • CI/CD  │  │
│  └────────┬────────┘      └────────┬─────────┘      └────┬─────┘  │
│           │                        │                      │         │
│           └────────────────────────┴──────────────────────┘         │
│                      Local network + Javelin gateway                │
└────────────────────────────────────────────────────────────────────┘
```

| Repo | Machine | Role |
|------|---------|------|
| **[outpost](https://github.com/jpuskas3/outpost)** | Mac mini | Home base |
| **[javelin](https://github.com/jpuskas3/javelin)** | Samsung Archlinux | Gateway ← you are here |
| **[compiler](https://github.com/jpuskas3/compiler)** | Windows gaming laptop | Build engine |

---

## USB-C Hash Key Authentication

Javelin implements a **physical handshake** security model.  No remote session is established until:

1. The authorized user **physically inserts** their designated USB-C drive into their remote machine.
2. The drive carries a **machine-bound hash** — a cryptographic key derived from the user's hardware fingerprint and a shared secret stored in Javelin.
3. Javelin reads the key (via a client-side agent on the remote machine), verifies it against its stored hash table, and only then issues a session token.
4. The USB-C drive must remain inserted for the duration of the session (or the session is revoked on removal, configurable).

### Why physical?

Software-only authentication can be phished, leaked, or brute-forced.  A physical key that must be present means:
- Stolen passwords alone are useless
- Sessions are bounded to physical presence
- Revocation is instant — pull the drive

### Key derivation (planned implementation)

```
key = HKDF(
  ikm  = HMAC-SHA256(hardware_fingerprint, shared_secret),
  salt = machine_id,
  info = b"javelin-access-v1",
  length = 32
)
```

The derived key is written to the USB-C drive at enrollment time.  The Javelin server stores only the expected hash — never the raw key.

---

## oContainer System

Javelin hosts eight modular application containers in `ocontainer/`:

| Container | Purpose |
|-----------|---------|
| **DeckBoss** | Command deck — primary user dashboard and control surface |
| **ZSkipper** | Network skipper — routes and proxies requests across the local net |
| **DataFarm** | Data ingestion and processing pipeline |
| **Captain** | Orchestration controller — manages inter-container communication |
| **Maps** | Spatial data, geolocation overlays, and map rendering |
| **Media** | Media source management and stream control |
| **Library** | Asset library — documents, volumes, reference data |
| **OpenContainer** | Base template for custom application containers |

Each container exposes a `run.py` entrypoint and is managed via:
- The Javelin web interface (`/api/nexus/containers/*`)
- The Nexus SPA (`nexus/nexus.html` → Labs panel)
- Direct API calls from Outpost

---

## Directory Structure

```
javelin/
│
├── backend/
│   └── app/
│       ├── app.py           # Flask app (Flask-Login, SQLAlchemy, session management)
│       ├── models.py        # User + SavedPoint models
│       └── __init__.py
│
├── nexus/                   # Nexus async layer (mirrors Outpost nexus/)
│   ├── core/                # EventBus, LocalStore, APIGateway, GovernanceEngine, Worker
│   ├── integrations/        # Airtable, AI, GitHub, Portals
│   ├── backend/api/
│   │   └── javelin_nexus.py # Flask Blueprint — /api/nexus/* routes
│   ├── nexus.html           # Javelin-branded Nexus SPA
│   ├── nexus.css
│   └── docs/
│
├── ocontainer/              # Modular application containers
│   ├── DeckBoss/
│   ├── ZSkipper/
│   ├── DataFarm/
│   ├── Captain/
│   ├── Maps/
│   ├── Media/
│   ├── Library/
│   └── OpenContainer/
│
├── frontend/
│   ├── static/
│   │   ├── javelin.css
│   │   └── index.html
│   └── gui/
│       ├── app_gui.py       # PyQt5 main GUI
│       └── toolbar_gui.py
│
├── 1scripts/                # Startup and management scripts
│   ├── JAVELIN.sh           # Main launch script
│   ├── intro.sh
│   ├── butler.sh
│   └── mom.sh
│
├── 2data/                   # Persistent data (logs, cache, user accounts)
├── 3docker/                 # Docker / nginx config
├── 4instance/               # SQLite database (users.db)
├── shared/                  # Shared logs and cache between containers
├── templates/               # Jinja2 HTML templates
│
├── javelin.css              # Global styles
├── index.html               # Entry / splash
├── login_gui.py             # PyQt login interface
└── requirements.txt
```

---

## Getting Started (Samsung Archlinux)

### Prerequisites

```bash
sudo pacman -S python docker docker-compose python-pip
pip install -r requirements.txt
```

### Launch Javelin

```bash
# Initialize and start all services
./1scripts/JAVELIN.sh

# Or step by step:
docker-compose -f 3docker/docker-compose.yml up --build -d
python backend/app/app.py
```

### Register the Nexus Blueprint

In `backend/app/app.py`, add:

```python
from nexus.backend.api.javelin_nexus import nexus_bp
app.register_blueprint(nexus_bp)
```

This adds all `/api/nexus/*` routes to the existing Flask app.

### Enroll a USB-C key (future CLI)

```bash
# On the remote user's machine (client agent):
javelin-key enroll --server https://javelin.home --user john

# Writes derived key to inserted USB-C drive
# Registers expected hash in Javelin's key table
```

---

## Security Model

| Layer | Control |
|-------|---------|
| Physical | USB-C key must be inserted at session start |
| Network | Javelin binds only to `127.0.0.1` locally; external access via reverse proxy with TLS |
| Auth | Flask-Login session management; bcrypt password hashing |
| Governance | Nexus GovernanceEngine denies all outbound integration calls by default |
| Audit | Every gateway call logged; audit trail in IndexedDB + backend JSONL |
| Revocation | USB-C drive removal triggers session invalidation (configurable) |

---

## License

MIT — personal use, collaborative development with invited contributors.
