# NEXUS Governance — Local Owner Sovereignty

> The machine is yours.  The data is yours.  The policy is yours.

---

## Philosophy

Nexus is built on a single non-negotiable principle: **the owner of the local machine has unconditional sovereign control** over all data, all outbound connections, and all integrations.

No data leaves your machine without your explicit permission.  No integration is active by default.  Every gateway call is evaluated against your policy.  Every decision is audited.

---

## How It Works

### The Policy Engine

The `GovernanceEngine` (`core/governance.js`) sits between the APIGateway and all outbound calls.  Every `gateway.call()` invocation is checked against the owner's policy before execution.

**Default policy (safe baseline):**
```json
{
  "version": 1,
  "owner": "local",
  "default": "allow_local",
  "rules": [
    { "type": "allow", "target": "local.*" },
    { "type": "allow", "target": "projects.*" },
    { "type": "allow", "target": "tasks.*" },
    { "type": "allow", "target": "store.*" },
    { "type": "allow", "target": "ui.*" },
    { "type": "deny",  "target": "integrations.*", "reason": "not configured" }
  ]
}
```

All local operations are allowed.  All integrations are denied by default.

### Rule Evaluation

Rules are evaluated **in order, last match wins**.  This means:

```json
{ "type": "allow", "target": "integrations.*" },
{ "type": "deny",  "target": "integrations.airtable.*" }
```

This configuration allows all integrations **except** Airtable — the more specific rule wins.

### Wildcard Targets

| Pattern | Matches |
|---------|---------|
| `local.*` | Any local route |
| `projects.*` | projects.list, projects.create, projects.delete |
| `integrations.*` | Any integration |
| `integrations.airtable.*` | Only Airtable calls |
| `integrations.ai.stream` | Only AI streaming |

---

## Data Classification

Every integration and portal call carries a data classification tag.  The governance engine can enforce data-class-level rules:

| Class | Meaning |
|-------|---------|
| `public` | Safe to send to any enabled integration |
| `internal` | Send only to explicitly trusted integrations |
| `confidential` | Require explicit per-call owner approval |
| `restricted` | Never leave the local machine |

---

## Audit Log

Every gateway call is logged to the audit trail:

```json
{
  "id":      "a3f9b2d1",
  "ts":      1720000000000,
  "route":   "integrations.airtable.sync",
  "allowed": true,
  "rule":    "integrations.airtable.*",
  "reason":  null
}
```

The audit log is:
- Stored in IndexedDB (`nexus_local` → `audit_log`)
- Limited to the last 1000 entries in memory (full log on disk via backend)
- Visible in real-time in the Governance panel
- Exportable as JSON from the Governance panel

---

## Enabling an Integration

From the **Governance panel → Integration Permissions**, toggle an integration on.

Or programmatically:

```js
await governance.enableIntegration('airtable');
// Adds: { type: 'allow', target: 'integrations.airtable.*' } to policy
```

To disable:

```js
await governance.disableIntegration('airtable');
// Adds: { type: 'deny', target: 'integrations.airtable.*', reason: 'disabled by owner' }
```

Changes take effect **immediately** — no reload required.  The policy is persisted to IndexedDB.

---

## Policy Files

The policy can also be exported, version-controlled, and imported:

```bash
# Export from Governance panel → Export button
# Results in nexus-audit-{timestamp}.json

# Import: paste into the policy editor and click Save
```

This means your governance configuration is **auditable**, **shareable** (policy only, not credentials), and **reproducible** across machines.

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Malicious browser extension reads local data | IndexedDB is origin-scoped; served from localhost |
| Third-party script exfiltrates data | No CDN scripts loaded; all assets local or pre-approved Google Fonts |
| CSRF attack on backend API | CORS restricted to specific local origin |
| Backend exposed to network | Binds to 127.0.0.1 only by default |
| API keys leaked in logs | Keys stored in IndexedDB, never written to disk logs |
| Integration sends data without permission | GovernanceEngine deny-by-default enforces at gateway level |

---

## Multi-machine Sync (Future)

The governance architecture is designed to support future peer-to-peer sync between machines you own:

1. Each machine has its own governance policy
2. Sync events carry a source machine ID
3. Receiving machine's governance engine evaluates whether to accept the sync
4. No central server; sync is owner-to-owner via encrypted transport

This is a future capability — stub hooks are in the EventBus and LocalStore.
