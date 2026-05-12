# NEXUS Architecture

> **Version:** 1.0.0 · **Date:** 2026 · **Status:** Production-ready stub

---

## Overview

Nexus is a **local-first, serverless-async, event-driven workstation** for project management, lab automation, and external system integration.  The central principle is **owner sovereignty**: the machine owner has unconditional control over every byte of data, every outbound connection, and every external service interaction.

Nexus unifies the workstation and javelin codebases under a shared architecture without replacing their existing functionality.  All new code lives inside the `nexus/` subdirectory, leaving legacy systems intact and runnable.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER / DESKTOP                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     nexus.html  (Reactive SPA)                    │  │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │  │
│  │  │Dashboard │  │ Projects  │  │   Labs   │  │  Integrations   │  │  │
│  │  │          │  │ + Kanban  │  │  Panel   │  │  Governance     │  │  │
│  │  └──────────┘  └───────────┘  └──────────┘  └─────────────────┘  │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
│                           │ ES Modules                                   │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │                    NEXUS CORE LAYER                                │  │
│  │                                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │  EventBus    │  │  LocalStore  │  │     GovernanceEngine     │ │  │
│  │  │  (bus.js)    │  │  (store.js)  │  │    (governance.js)       │ │  │
│  │  │              │  │  IndexedDB   │  │  Policy · Audit · ACL    │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘ │  │
│  │         │                 │                       │                 │  │
│  │  ┌──────▼─────────────────▼───────────────────────▼─────────────┐ │  │
│  │  │                    APIGateway (gateway.js)                    │ │  │
│  │  │   Local routes · Remote fallback · Retry · Telemetry         │ │  │
│  │  └──────────────────────────────┬───────────────────────────────┘ │  │
│  └─────────────────────────────────│──────────────────────────────────┘  │
│                                    │                                       │
│  ┌─────────────────────────────────▼──────────────────────────────────┐  │
│  │                   Service Worker (worker.js)                       │  │
│  │        Cache · Offline queue · Background sync · Push relay        │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
└────────────────────────────────────│───────────────────────────────────── ┘
                                     │ fetch / SSE
┌────────────────────────────────────▼───────────────────────────────────────┐
│                     NEXUS BACKEND  (FastAPI · Python)                      │
│                                                                            │
│  /api/nexus/projects    /api/nexus/tasks    /api/nexus/labs/run            │
│  /api/nexus/scraper     /api/nexus/data     /api/nexus/webhook/{source}    │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │  SQLite/JSON │  │ Subprocess   │  │       Webhook Receiver          │ │
│  │  Local Files │  │ Lab Runner   │  │  (Airtable · GitHub · Custom)   │ │
│  └──────────────┘  └──────────────┘  └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────  ┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────────┐
│                    INTEGRATIONS LAYER (governance-gated)                   │
│                                                                            │
│   📊 Airtable     🤖 AI (Claude)     ⚙ GitHub     🚀 Portals (any REST)  │
│   airtable.js      ai.js              github.js    portals.js             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Layer

### EventBus (`core/bus.js`)

The EventBus is the **only** communication channel between modules.  No module imports another module directly — all coupling is through named events and payload contracts.

**Properties:**
- Async-first: all handlers are awaited in parallel via `Promise.allSettled`
- Replay log: last 256 events are buffered for late subscribers
- Plugin middleware: transform or inspect every event before dispatch
- Pause/resume: buffer events during module initialization

**Event naming convention:**

| Pattern | Purpose |
|---------|---------|
| `system:*` | Boot, online/offline, sync ready |
| `auth:*` | Authentication lifecycle |
| `projects:*` | Project CRUD (created, updated, deleted) |
| `tasks:*` | Task CRUD |
| `store:*` | LocalStore mutations |
| `gateway:*` | Request telemetry |
| `governance:*` | Policy decisions, audit events |
| `integrations:*` | External system events |
| `ui:*` | Panel changes, modal open/close |

---

### LocalStore (`core/store.js`)

IndexedDB-backed reactive state store.  The single source of truth for all client-side data.

**Object stores (namespaces):**

| Namespace | Contents |
|-----------|----------|
| `projects` | Project records |
| `tasks` | Task records |
| `library` | Library assets |
| `media` | Media sources |
| `networks` | Network configs |
| `maps` | Map layers |
| `labs` | Lab configurations |
| `settings` | User and system settings |
| `integrations` | Integration configs and portal definitions |
| `audit_log` | Governance audit entries |

**Key features:**
- All writes emit `store:set` on the EventBus → any component can watch reactively
- `store.watch(ns, key, handler)` provides a clean reactive binding API
- `store.query(ns, predicate)` for client-side filtering
- All records receive an `_updatedAt` timestamp automatically

---

### APIGateway (`core/gateway.js`)

The gateway is the **single exit point** for all data operations and external calls.

**Request flow:**
```
module.call('route', params)
  → Governance check (allow/deny)
  → Local handler (if registered)
  → Remote fallback with retry (if opts.remote)
  → Bus emit: gateway:response | gateway:error | gateway:blocked
```

**Local route registration (in nexus.html bootstrap):**
```js
gateway.register('projects.list',   async () => store.getAll('projects'));
gateway.register('projects.create', async (p) => store.set('projects', p.id, p));
gateway.register('tasks.list',      async (p) => store.query('tasks', t => t.projectId === p.projectId));
```

**Remote handler registration (in integration modules):**
```js
gateway.remote('airtable', 'POST', '/projects', (p) => airtable.pushProject(p));
```

---

### GovernanceEngine (`core/governance.js`)

The governance engine enforces **owner sovereignty** at the API Gateway level.

**Policy evaluation:**
- Rules are evaluated top-to-bottom; the last matching rule wins
- Default: `allow_local` — local operations are allowed, outbound remote calls are denied
- Integrations start in `deny` state and must be explicitly enabled by the owner

**Policy document example:**
```json
{
  "version": 1,
  "owner": "john",
  "default": "allow_local",
  "rules": [
    { "type": "allow", "target": "local.*" },
    { "type": "allow", "target": "projects.*" },
    { "type": "allow", "target": "integrations.airtable.*" },
    { "type": "deny",  "target": "integrations.ai.*", "reason": "offline session" }
  ]
}
```

**Audit trail:**
Every policy decision is logged to `store:audit_log` and the `governance:audit` bus event.  The audit log is visible in the Governance panel and exportable as JSON.

---

### Service Worker (`core/worker.js`)

Provides offline capability and background sync.

- **Cache-first** for static assets (nexus.html, nexus.css, core/*.js)
- **Network-with-fallback** for `/api/*` calls — returns 503 offline stub
- **Background Sync API** — registers `nexus-pending-mutations` tag when offline
- **Push notifications** — relays push events to the correct client window

---

## Integrations Layer

All integrations are **opt-in** and **governance-gated**.  The owner must explicitly enable an integration in the Governance panel before any data leaves the local machine.

### Airtable (`integrations/airtable.js`)

Bidirectional sync between LocalStore and Airtable bases.

- Connect via API key + Base ID
- `syncAll()` merges remote records into local store (last-write-wins by `_updatedAt`)
- Pushes new local records (without `airtableId`) to Airtable
- Auto-sync polling via `startAutoSync(intervalMs)`

**Required Airtable tables:**
- `Projects` with fields: Name, Description, Status, Color, UpdatedAt
- `Tasks` with fields: Title, Description, Status, ProjectId, Tags

### AI / Claude (`integrations/ai.js`)

Project intelligence via the Claude API.

- `ask(prompt, context)` — general Q&A with local context injection
- `summarizeProject(project, tasks)` — health summary and blocker analysis
- `generateTasks(description)` — parse a description into a task checklist
- `analyzeHealth(projects, tasks)` — ecosystem health check
- `stream(prompt, onChunk)` — streaming response for the AI quick panel

**Models available:**
| Model ID | Use case |
|----------|----------|
| `claude-sonnet-4-6` | Default, balanced speed/quality |
| `claude-opus-4-7` | Most capable, complex reasoning |
| `claude-haiku-4-5-20251001` | Fastest, simple queries |

### GitHub (`integrations/github.js`)

- Import issues as tasks (`syncIssues(projectId, repo)`)
- Create issues from tasks (`createIssue(repo, title, body)`)
- Monitor CI run status (`latestRunStatus(repo)`)
- Trigger workflow dispatches (`triggerWorkflow(repo, workflowId, ref, inputs)`)
- Link projects to repos (`linkProject(projectId, repo)`)

### Portals (`integrations/portals.js`)

Generic connector for any REST API.  Define a portal config with:
- `baseUrl`, `auth`, and `actions` (method + path + optional body template)
- Register via `portals.register(config)` — no code required for standard REST APIs
- Invoke via `portals.invoke(name, action, params)`

---

## Backend API

The FastAPI backend handles operations that require filesystem or subprocess access.

**Base URL:** `http://127.0.0.1:8765`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/nexus/health` | GET | Health check |
| `/api/nexus/projects` | GET, POST | Project CRUD |
| `/api/nexus/projects/{id}` | DELETE | Delete project |
| `/api/nexus/tasks` | GET, POST | Task CRUD |
| `/api/nexus/tasks/{id}` | PATCH, DELETE | Update/delete task |
| `/api/nexus/labs/run` | POST | Run a lab container |
| `/api/nexus/labs/status/{container}` | GET | Container run status |
| `/api/nexus/labs/stop/{container}` | POST | Stop running container |
| `/api/nexus/labs/log/{container}` | GET (SSE) | Stream container log |
| `/api/nexus/scraper/run` | POST | Queue a URL scrape |
| `/api/nexus/scraper/result/{id}` | GET | Get scrape result |
| `/api/nexus/webhook/{source}` | POST | Receive external webhooks |
| `/api/nexus/data` | GET | List local data files |
| `/api/nexus/system` | GET | System info |

---

## Module Panels

| Panel | Route key | Description |
|-------|-----------|-------------|
| Dashboard | `dashboard` | KPI stats, recent projects, activity feed, integration status |
| Projects | `projects` | Project list + Kanban task board |
| Library | `library` | Assets, volumes, documents |
| Labs | `labs` | Container runner with log streaming |
| Networks | `networks` | Connection topology |
| Media | `media` | Sources and stream management |
| Maps | `maps` | Spatial data and overlays |
| Integrations | `integrations` | Configuration for all external systems |
| Governance | `governance` | Policy editor and audit log |
| Settings | `settings` | Owner profile and system config |

---

## Data Flow: Project Creation

```
User clicks "＋ New Project"
  → openNewProjectModal()
  → User fills form, clicks "Create"
  → gateway.call('projects.create', { id, name, description, status, color })
    → governance.allow('projects.create') → ALLOW
    → store.set('projects', id, project)
      → IndexedDB.put(record)
      → bus.emit('store:set', { ns:'projects', key:id, value, prev:null })
        → renderProjects() re-renders project list
        → addActivityItem('Project created: Alpha')
        → sidebar project tree updates
  → bus.emit('projects:created', { name })
  → toast('Project "Alpha" created', 'success')
```

---

## Data Flow: Airtable Sync

```
User clicks "↻ Sync Now" in Integrations panel
  → airtable.syncAll()
    → governance.allow('integrations.airtable.sync') → checked
    → airtable.fetchProjects() → GET api.airtable.com/v0/{baseId}/Projects
    → airtable.fetchTasks()    → GET api.airtable.com/v0/{baseId}/Tasks
    → for each remote record:
        store.set(ns, id, record)  → bus.emit('store:set')
    → store.query('projects', p => !p.airtableId)  ← local-only records
    → airtable.pushProject(p)  → POST api.airtable.com/…
    → bus.emit('integrations:airtable:sync_complete', stats)
```

---

## Security Model

1. **Network isolation** — the backend binds to `127.0.0.1` only; never `0.0.0.0` by default
2. **No ambient credentials** — API keys are stored in IndexedDB (not cookies, not localStorage) and only accessed after the Governance policy is checked
3. **CORS** — configured to the specific local frontend origin
4. **Governance deny-by-default** — all integration routes start as `deny`; owner explicitly enables them
5. **Audit trail** — every gateway call is logged; audit log is local-only and owner-accessible

---

## Extending Nexus

### Adding a new panel module

1. Add a `<section class="nexus-panel" id="panel-{name}">` to `nexus.html`
2. Add a `<button class="nexus-nav-btn" data-panel="{name}">` to the header nav
3. Implement the panel logic in `nexus/modules/{name}/index.js`
4. Register gateway routes in the bootstrap `<script>` block

### Adding a new integration

1. Create `nexus/integrations/{name}.js` following the pattern of `airtable.js`
2. Add a config card to the Integrations panel in `nexus.html`
3. Register the integration with the GovernanceEngine as a toggleable permission
4. Wire the connect button to your integration's `connect()` method

### Adding a portal (no-code)

```js
import { portals } from './nexus/integrations/portals.js';

portals.register({
  name:    'notion',
  label:   'Notion',
  baseUrl: 'https://api.notion.com/v1',
  auth:    { type: 'bearer', token: 'secret_xxx' },
  dataClass: 'internal',
  actions: {
    listDatabases: { method: 'GET', path: '/databases' },
    queryDatabase: { method: 'POST', path: '/databases/{databaseId}/query' },
  },
});
```
