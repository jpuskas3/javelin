# NEXUS Integration Guide

> Connect your external ecosystem while keeping full local control.

---

## Overview

Nexus integrations follow a consistent pattern:

1. **Configure** — Add credentials in the Integrations panel
2. **Connect** — Test the connection and register gateway routes
3. **Govern** — Enable the integration in the Governance panel
4. **Sync** — Pull/push data through the gateway

All integration calls are gated by the GovernanceEngine.  No data leaves your machine until you explicitly enable the integration.

---

## Airtable

### Setup

1. Go to **Integrations → Airtable**
2. Enter your Airtable **API Key** (Settings → Developer Hub → Personal Access Token)
3. Enter your **Base ID** (found in the Airtable API docs URL for your base)
4. Click **Connect** — Nexus will test the connection
5. Go to **Governance → Integration Permissions** and toggle Airtable **on**

### Required Base Structure

Create two tables in your Airtable base:

**Projects table**
| Field | Type |
|-------|------|
| Name | Single line text |
| Description | Long text |
| Status | Single select (active, paused, planning, completed) |
| Color | Single select (cyan, yellow, green, shale) |
| UpdatedAt | Date (ISO 8601) |

**Tasks table**
| Field | Type |
|-------|------|
| Title | Single line text |
| Description | Long text |
| Status | Single select (todo, in-progress, review, done) |
| ProjectId | Single line text |
| Tags | Multiple select |

### Sync Behavior

- **Pull** — Remote records overwrite local records (last `_updatedAt` wins)
- **Push** — Local records without an `airtableId` are created in Airtable
- **Auto-sync** — Enable polling via `airtable.startAutoSync(300000)` (5-minute interval)
- **Manual** — Click **↻ Sync Now** in the Integrations panel or on the Dashboard

### Code

```js
import { airtable } from './nexus/integrations/airtable.js';

await airtable.connect({ apiKey: '...', baseId: 'appXXXXXXXX' });
await airtable.syncAll();
const projects = await airtable.fetchProjects();
```

---

## AI (Claude)

### Setup

1. Go to **Integrations → AI (Claude)**
2. Enter your **Anthropic API Key** (console.anthropic.com → API Keys)
3. Select a model (Sonnet 4.6 is recommended)
4. Click **Connect**
5. Enable in **Governance → Integration Permissions**

### Capabilities

| Method | Description |
|--------|-------------|
| `ai.ask(prompt, context)` | General Q&A with local context |
| `ai.summarizeProject(project, tasks)` | 2-3 sentence project health summary |
| `ai.generateTasks(description)` | Parse description into task checklist |
| `ai.analyzeHealth(projects, tasks)` | Ecosystem health check |
| `ai.searchLocal(query)` | Natural-language search across all local data |
| `ai.stream(prompt, onChunk)` | Streaming response for real-time output |

### Code

```js
import { ai } from './nexus/integrations/ai.js';

await ai.connect({ apiKey: 'sk-ant-...', model: 'claude-sonnet-4-6' });

// Ask a question
const answer = await ai.ask('What are my top priorities today?');

// Generate tasks
const tasks = await ai.generateTasks(
  'Build a data pipeline that scrapes news headlines and categorizes them by topic'
);
// returns: [{ id, title, status:'todo', _source:'ai' }, ...]

// Stream a response
for await (const chunk of ai.stream('Summarize my project backlog')) {
  process.stdout.write(chunk);
}
```

### Data Privacy

By default, AI calls include a system prompt that scopes Claude to the local context.  The governance engine will block AI calls if the integration is disabled.  Credentials are stored in IndexedDB and never written to disk.

---

## GitHub

### Setup

1. Go to **Integrations → GitHub**
2. Create a **Personal Access Token** at github.com → Settings → Developer Settings → PAT
   - Required scopes: `repo`, `workflow`, `read:user`
3. Enter your PAT and default repository (`owner/repo`)
4. Click **Connect**
5. Enable in Governance

### Features

**Import issues as tasks:**
```js
import { github } from './nexus/integrations/github.js';

await github.connect({ token: 'ghp_...', defaultRepo: 'jpuskas3/javelin' });

// Link a project to a repo
await github.linkProject('proj_abc123', 'jpuskas3/javelin');

// Pull all open issues as tasks
const tasks = await github.syncIssues('proj_abc123');
```

**Trigger CI workflows:**
```js
await github.triggerWorkflow('jpuskas3/javelin', 'deploy.yml', 'main', {
  environment: 'production',
});
```

**Monitor CI status from Labs panel:**
```js
const run = await github.latestRunStatus('jpuskas3/javelin');
// { conclusion: 'success', status: 'completed', ... }
```

---

## Portals (Custom REST APIs)

Portals allow you to connect **any REST API** to Nexus without writing a custom integration module.

### Register a portal

```js
import { portals } from './nexus/integrations/portals.js';

portals.register({
  name:      'notion',
  label:     'Notion Workspace',
  baseUrl:   'https://api.notion.com/v1',
  auth:      { type: 'bearer', token: 'secret_xxx' },
  dataClass: 'internal',
  actions: {
    listDatabases: {
      method: 'GET',
      path:   '/databases',
    },
    queryDatabase: {
      method: 'POST',
      path:   '/databases/{databaseId}/query',
    },
    createPage: {
      method:       'POST',
      path:         '/pages',
      bodyTemplate: {
        parent: { database_id: '{databaseId}' },
        properties: { title: [{ text: { content: '{title}' } }] },
      },
    },
  },
});
```

### Invoke a portal action

```js
const pages = await portals.invoke('notion', 'queryDatabase', {
  databaseId: 'abc123',
});

await portals.invoke('notion', 'createPage', {
  databaseId: 'abc123',
  title: 'New Project Page',
});
```

### Auth types supported

| Type | Config fields |
|------|--------------|
| `none` | (no auth) |
| `bearer` | `token` |
| `apikey` | `header` (optional, default `X-API-Key`), `key` |
| `basic` | `username`, `password` |
| `oauth2` | `accessToken` (you manage the OAuth2 flow) |

### Governance for portals

Each portal can be individually enabled/disabled:

```js
await governance.enableIntegration('portals.notion');
await governance.disableIntegration('portals.notion');
```

Or toggle all portals:
```js
await governance.enableIntegration('portals');
```

---

## Writing a Custom Integration Module

If a Portal config isn't enough (e.g. you need OAuth2 flow, websocket, custom auth):

1. Create `nexus/integrations/{name}.js`
2. Export a singleton class following the pattern:

```js
class MyIntegration {
  #apiKey    = null;
  #connected = false;

  async connect({ apiKey }) {
    this.#apiKey   = apiKey;
    this.#connected = await this.testConnection();
    if (!this.#connected) throw new Error('Connection failed');
    this.#registerRoutes();
    bus.emit('integrations:myservice:connected', {});
    return true;
  }

  get connected() { return this.#connected; }

  #registerRoutes() {
    gateway.remote('myservice', 'GET', '/data', (p) => this.fetchData(p));
  }

  async fetchData(params) { /* ... */ }
}

export const myService = new MyIntegration();
export default myService;
```

3. Add a config card to the Integrations panel in `nexus.html`
4. Add a governance toggle in the Governance panel
5. Document the integration in this guide

---

## Integration Status Reference

| Status | Meaning |
|--------|---------|
| 🔴 Disconnected | Not configured or connection failed |
| 🟡 Connecting | Test in progress |
| 🟢 Connected | Active and governance-allowed |
| 🔒 Blocked | Governance policy is denying calls |
| ↻ Syncing | Bidirectional sync in progress |
