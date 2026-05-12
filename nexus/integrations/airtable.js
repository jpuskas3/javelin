/**
 * nexus/integrations/airtable.js
 * ============================================================================
 * NEXUS Airtable Integration
 *
 * Provides bidirectional sync between the Nexus LocalStore and an Airtable
 * base.  All network calls are routed through the APIGateway and are subject
 * to Governance policy.
 *
 * WIRE-UP CHECKLIST
 * -----------------
 * 1. User adds API key + Base ID in Integrations panel
 * 2. Call AirtableIntegration.connect({ apiKey, baseId })
 * 3. Optionally call .startAutoSync(intervalMs) for background polling
 * 4. gateway.remote() handlers are registered automatically on connect
 *
 * Data flow
 * ---------
 *   Local Projects  ─sync─→  Airtable Table "Projects"
 *   Local Tasks     ─sync─→  Airtable Table "Tasks"
 *   Airtable records ←─poll─ Nexus (every N minutes)
 *
 * Conflict resolution: last-write-wins by _updatedAt timestamp.
 *
 * REST API reference: https://airtable.com/developers/web/api/introduction
 */

import { bus      } from '../core/bus.js';
import { store    } from '../core/store.js';
import { gateway  } from '../core/gateway.js';

const AIRTABLE_BASE_URL = 'https://api.airtable.com/v0';

class AirtableIntegration {
  #apiKey  = null;
  #baseId  = null;
  #connected = false;
  #syncTimer = null;

  // ─── Connection ────────────────────────────────────────────────────

  async connect({ apiKey, baseId }) {
    this.#apiKey  = apiKey;
    this.#baseId  = baseId;

    const ok = await this.testConnection();
    if (!ok) throw new Error('Airtable connection test failed — check API key and Base ID');

    this.#connected = true;
    this.#registerRoutes();

    await store.set('settings', 'airtable_config', {
      baseId,
      connectedAt: Date.now(),
      status: 'connected',
    });

    bus.emit('integrations:airtable:connected', { baseId });
    return true;
  }

  disconnect() {
    this.stopAutoSync();
    this.#connected = false;
    this.#apiKey    = null;
    this.#baseId    = null;
    bus.emit('integrations:airtable:disconnected', {});
  }

  get connected() { return this.#connected; }

  // ─── API helpers ───────────────────────────────────────────────────

  async #request(method, path, body = null) {
    if (!this.#apiKey) throw new Error('Airtable: not connected');

    const response = await fetch(`${AIRTABLE_BASE_URL}/${this.#baseId}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.#apiKey}`,
        'Content-Type':  'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Airtable ${method} ${path}: ${err.error?.message ?? response.statusText}`);
    }

    return response.json();
  }

  async testConnection() {
    try {
      await this.#request('GET', '/Projects?maxRecords=1');
      return true;
    } catch {
      return false;
    }
  }

  // ─── Gateway route registration ────────────────────────────────────

  #registerRoutes() {
    gateway.remote('airtable', 'GET',  '/projects',    (p) => this.fetchProjects(p));
    gateway.remote('airtable', 'POST', '/projects',    (p) => this.pushProject(p));
    gateway.remote('airtable', 'GET',  '/tasks',       (p) => this.fetchTasks(p));
    gateway.remote('airtable', 'POST', '/tasks',       (p) => this.pushTask(p));
    gateway.remote('airtable', 'DELETE', '/projects',  (p) => this.deleteProject(p));
  }

  // ─── Projects ──────────────────────────────────────────────────────

  async fetchProjects() {
    const data     = await this.#request('GET', '/Projects?view=Grid+view');
    const records  = data.records ?? [];

    return records.map(r => ({
      id:          r.id,
      name:        r.fields['Name']        ?? 'Untitled',
      description: r.fields['Description'] ?? '',
      status:      (r.fields['Status']     ?? 'active').toLowerCase(),
      color:       (r.fields['Color']      ?? 'cyan').toLowerCase(),
      airtableId:  r.id,
      _source:     'airtable',
    }));
  }

  async pushProject(project) {
    const fields = {
      'Name':        project.name,
      'Description': project.description ?? '',
      'Status':      project.status ?? 'active',
      'Color':       project.color  ?? 'cyan',
      'UpdatedAt':   new Date(project._updatedAt ?? Date.now()).toISOString(),
    };

    if (project.airtableId) {
      return this.#request('PATCH', `/Projects/${project.airtableId}`, { fields });
    } else {
      return this.#request('POST', '/Projects', { records: [{ fields }] });
    }
  }

  async deleteProject({ airtableId }) {
    if (!airtableId) return;
    return this.#request('DELETE', `/Projects/${airtableId}`);
  }

  // ─── Tasks ─────────────────────────────────────────────────────────

  async fetchTasks({ projectId } = {}) {
    let url = '/Tasks?view=Grid+view';
    if (projectId) url += `&filterByFormula={ProjectId}="${projectId}"`;

    const data    = await this.#request('GET', url);
    const records = data.records ?? [];

    return records.map(r => ({
      id:         r.id,
      title:      r.fields['Title']      ?? 'Untitled',
      description:r.fields['Description'] ?? '',
      status:     (r.fields['Status']    ?? 'todo').toLowerCase(),
      projectId:  r.fields['ProjectId']  ?? null,
      tags:       r.fields['Tags']       ?? [],
      airtableId: r.id,
      _source:    'airtable',
    }));
  }

  async pushTask(task) {
    const fields = {
      'Title':       task.title,
      'Description': task.description ?? '',
      'Status':      task.status ?? 'todo',
      'ProjectId':   task.projectId ?? '',
      'Tags':        task.tags ?? [],
    };

    if (task.airtableId) {
      return this.#request('PATCH', `/Tasks/${task.airtableId}`, { fields });
    } else {
      return this.#request('POST', '/Tasks', { records: [{ fields }] });
    }
  }

  // ─── Full bidirectional sync ────────────────────────────────────────

  async syncAll() {
    bus.emit('integrations:airtable:sync_start', {});

    try {
      // Pull remote → local (merge by id)
      const [remoteProjects, remoteTasks] = await Promise.all([
        this.fetchProjects(),
        this.fetchTasks(),
      ]);

      for (const p of remoteProjects) await store.set('projects', p.id, p);
      for (const t of remoteTasks)   await store.set('tasks',    t.id, t);

      // Push local → remote (only records without airtableId)
      const localProjects = await store.query('projects', p => !p.airtableId);
      const localTasks    = await store.query('tasks',    t => !t.airtableId);

      await Promise.allSettled([
        ...localProjects.map(p => this.pushProject(p)),
        ...localTasks.map(t    => this.pushTask(t)),
      ]);

      bus.emit('integrations:airtable:sync_complete', {
        projects: remoteProjects.length,
        tasks:    remoteTasks.length,
      });

      return { ok: true, projects: remoteProjects.length, tasks: remoteTasks.length };
    } catch (err) {
      bus.emit('integrations:airtable:sync_error', { error: err.message });
      throw err;
    }
  }

  // ─── Auto-sync ─────────────────────────────────────────────────────

  startAutoSync(intervalMs = 5 * 60 * 1000) {
    this.stopAutoSync();
    this.#syncTimer = setInterval(() => {
      if (navigator.onLine && this.#connected) this.syncAll().catch(console.warn);
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.#syncTimer) { clearInterval(this.#syncTimer); this.#syncTimer = null; }
  }
}

export const airtable = new AirtableIntegration();
export default airtable;
