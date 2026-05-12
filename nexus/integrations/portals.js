/**
 * nexus/integrations/portals.js
 * ============================================================================
 * NEXUS Portal Integration — Multi-service Connector
 *
 * Portals are generic, configurable connectors to external web services and
 * APIs.  Each portal has:
 *   • A name and base URL
 *   • Authentication configuration (Bearer, API key header, Basic, OAuth2)
 *   • A set of actions (GET/POST endpoints)
 *   • Governance data-classification tags
 *
 * This design allows the owner to wire any REST API into Nexus without writing
 * custom integration code.  Power users can also write Portal plugins (JS
 * modules that export a portalDefinition object).
 *
 * WIRE-UP CHECKLIST
 * -----------------
 * 1. Define a portal config (see example below)
 * 2. Call portals.register(config)
 * 3. Call portals.invoke(portalName, actionName, params)
 * 4. All calls are gated by governance.allow('integrations.portals.*')
 *
 * Example portal config
 * ---------------------
 * {
 *   name:      'jira',
 *   label:     'Jira Cloud',
 *   baseUrl:   'https://yourteam.atlassian.net/rest/api/3',
 *   auth:      { type: 'basic', username: '...', password: '...' },
 *   dataClass: 'internal',
 *   actions: {
 *     listIssues: { method: 'GET',  path: '/search?jql=project=PROJ' },
 *     createIssue: { method: 'POST', path: '/issue', bodyTemplate: { fields: { summary: '{title}', project: { key: 'PROJ' } } } },
 *   }
 * }
 */

import { bus      } from '../core/bus.js';
import { store    } from '../core/store.js';
import { gateway  } from '../core/gateway.js';
import { governance } from '../core/governance.js';

class PortalRegistry {
  #portals = new Map();

  // ─── Registration ──────────────────────────────────────────────────

  register(config) {
    if (!config.name)    throw new Error('Portal config requires a name');
    if (!config.baseUrl) throw new Error('Portal config requires a baseUrl');

    const portal = {
      name:      config.name,
      label:     config.label ?? config.name,
      baseUrl:   config.baseUrl.replace(/\/$/, ''),
      auth:      config.auth ?? { type: 'none' },
      actions:   config.actions ?? {},
      dataClass: config.dataClass ?? 'public',
      enabled:   config.enabled ?? true,
      createdAt: Date.now(),
    };

    this.#portals.set(portal.name, portal);
    this.#registerGatewayRoute(portal);

    store.set('integrations', `portal_${portal.name}`, portal);
    bus.emit('integrations:portals:registered', { name: portal.name });

    return portal;
  }

  remove(name) {
    this.#portals.delete(name);
    store.delete('integrations', `portal_${name}`);
    bus.emit('integrations:portals:removed', { name });
  }

  get(name) { return this.#portals.get(name); }

  list() { return [...this.#portals.values()]; }

  enable(name)  { this.#setEnabled(name, true); }
  disable(name) { this.#setEnabled(name, false); }

  #setEnabled(name, enabled) {
    const p = this.#portals.get(name);
    if (!p) return;
    p.enabled = enabled;
    bus.emit(`integrations:portals:${enabled ? 'enabled' : 'disabled'}`, { name });
  }

  // ─── Gateway route ─────────────────────────────────────────────────

  #registerGatewayRoute(portal) {
    gateway.remote('portals', 'POST', `/${portal.name}`, async (params) => {
      return this.invoke(portal.name, params.action, params.data);
    });
  }

  // ─── Invocation ────────────────────────────────────────────────────

  async invoke(portalName, actionName, params = {}) {
    const portal = this.#portals.get(portalName);
    if (!portal)  throw new Error(`Portal not found: ${portalName}`);
    if (!portal.enabled) throw new Error(`Portal disabled: ${portalName}`);

    if (!governance.allow(`integrations.portals.${portalName}`)) {
      throw new Error(`[Governance] Portal blocked: ${portalName}`);
    }

    const action = portal.actions[actionName];
    if (!action)  throw new Error(`Action not found: ${actionName} on ${portalName}`);

    const url     = `${portal.baseUrl}${this.#interpolate(action.path, params)}`;
    const headers = this.#buildHeaders(portal.auth);
    const body    = action.bodyTemplate ? this.#interpolateObj(action.bodyTemplate, params) : null;

    bus.emit('integrations:portals:invoke', { portal: portalName, action: actionName, url });

    const response = await fetch(url, {
      method:  action.method ?? 'GET',
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Portal ${portalName}/${actionName}: ${response.status} ${err}`);
    }

    const result = await response.json().catch(() => response.text());

    bus.emit('integrations:portals:result', { portal: portalName, action: actionName });
    return result;
  }

  // ─── Auth header builder ───────────────────────────────────────────

  #buildHeaders(auth) {
    const headers = { 'Content-Type': 'application/json' };

    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;
      case 'apikey':
        headers[auth.header ?? 'X-API-Key'] = auth.key;
        break;
      case 'basic':
        headers['Authorization'] = 'Basic ' + btoa(`${auth.username}:${auth.password}`);
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${auth.accessToken}`;
        break;
      // 'none' — no auth header
    }

    return headers;
  }

  // ─── Template interpolation ────────────────────────────────────────

  #interpolate(template, params) {
    return template.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] ?? ''));
  }

  #interpolateObj(obj, params) {
    const json = JSON.stringify(obj);
    const interpolated = json.replace(/"\{(\w+)\}"/g, (_, key) => {
      const val = params[key];
      return val === undefined ? '""' : JSON.stringify(val);
    });
    return JSON.parse(interpolated);
  }

  // ─── Persistence (load saved portals on init) ───────────────────────

  async loadSaved() {
    await store.ready;
    const saved = await store.query('integrations', r => r.id?.startsWith('portal_'));
    for (const p of saved) {
      if (!this.#portals.has(p.name)) {
        this.#portals.set(p.name, p);
        this.#registerGatewayRoute(p);
      }
    }
    return saved.length;
  }
}

export const portals = new PortalRegistry();

// Load persisted portals on module load
portals.loadSaved().catch(() => {});

export default portals;
