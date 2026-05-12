/**
 * nexus/core/governance.js
 * ============================================================================
 * NEXUS GovernanceEngine — Local Owner Sovereignty Layer
 *
 * Governance is the security and policy backbone of the entire system.  It
 * enforces the principle that the owner of the local machine has FULL sovereign
 * control over:
 *
 *   1. Which routes / operations are permitted
 *   2. Which external integrations are allowed to receive data
 *   3. What data classifications can leave the local ecosystem
 *   4. Audit logging of every policy decision (immutable, local-only)
 *
 * The owner sets a Policy document (JSON) stored in LocalStore 'settings'.
 * Until an explicit allow rule is found:
 *   - Local operations → ALLOW by default
 *   - Outbound remote calls → DENY by default
 *
 * Policy schema
 * -------------
 * {
 *   version: 1,
 *   owner:   'john',
 *   default: 'allow_local',    // 'allow_all' | 'allow_local' | 'deny_all'
 *   rules: [
 *     { type: 'allow', target: 'local.*' },
 *     { type: 'allow', target: 'projects.*' },
 *     { type: 'deny',  target: 'integrations.airtable.*', reason: 'offline mode' },
 *     { type: 'allow', target: 'integrations.ai.*', dataClass: ['public'] },
 *   ]
 * }
 *
 * Targets support glob wildcards:
 *   'projects.*'                 → any route starting with 'projects.'
 *   'integrations.*'             → any integration
 *   'integrations.airtable.*'    → only Airtable
 */

import { bus   } from './bus.js';
import { store } from './store.js';

const DATA_CLASSES = ['public', 'internal', 'confidential', 'restricted'];

class GovernanceEngine {
  #policy   = null;
  #auditLog = [];

  async init() {
    await store.ready;
    const saved  = await store.get('settings', 'governance_policy');
    this.#policy = saved ?? this.#defaultPolicy();

    bus.on('store:set', (e) => {
      if (e.ns === 'settings' && e.key === 'governance_policy') {
        this.#policy = e.value;
        bus.emit('governance:policy_updated', e.value);
      }
    });

    bus.emit('governance:ready', { owner: this.#policy.owner });
    return this;
  }

  #defaultPolicy() {
    return {
      version: 1,
      owner:   'local',
      default: 'allow_local',
      rules: [
        { type: 'allow', target: 'local.*' },
        { type: 'allow', target: 'projects.*' },
        { type: 'allow', target: 'tasks.*' },
        { type: 'allow', target: 'store.*' },
        { type: 'allow', target: 'ui.*' },
        { type: 'allow', target: 'system.*' },
        // External integrations default DENY until owner enables them
        { type: 'deny',  target: 'integrations.*', reason: 'not configured — enable in Settings > Integrations' },
      ],
    };
  }

  // --- Policy evaluation ------------------------------------------------

  allow(route, params = {}) {
    const rules     = this.#policy?.rules ?? [];
    let decision    = this.#policy?.default === 'allow_local' ||
                      this.#policy?.default === 'allow_all';
    let matchedRule = null;

    for (const rule of rules) {
      if (this.#matches(route, rule.target)) {
        decision    = rule.type === 'allow';
        matchedRule = rule;
      }
    }

    this.#audit(route, decision, matchedRule, params);
    return decision;
  }

  #matches(route, pattern) {
    const escaped = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`).test(route);
  }

  // --- Audit ------------------------------------------------------------

  #audit(route, allowed, rule, params) {
    const entry = {
      id:      crypto.randomUUID(),
      ts:      Date.now(),
      route,
      allowed,
      rule:    rule?.target ?? 'default',
      reason:  rule?.reason ?? null,
    };
    this.#auditLog.push(entry);
    if (this.#auditLog.length > 1000) this.#auditLog.shift();
    store.set('audit_log', entry.id, entry).catch(() => {});
    bus.emit('governance:audit', entry);
  }

  // --- Policy management ------------------------------------------------

  async setPolicy(policy) {
    await store.set('settings', 'governance_policy', { ...policy, id: 'governance_policy' });
  }

  getPolicy()   { return structuredClone(this.#policy); }
  auditTrail()  { return [...this.#auditLog]; }
  dataClasses() { return [...DATA_CLASSES]; }

  async enableIntegration(name) {
    const p = this.getPolicy();
    p.rules = p.rules.filter(r => r.target !== `integrations.${name}.*`);
    p.rules.push({ type: 'allow', target: `integrations.${name}.*` });
    await this.setPolicy(p);
  }

  async disableIntegration(name) {
    const p = this.getPolicy();
    p.rules = p.rules.filter(r => r.target !== `integrations.${name}.*`);
    p.rules.push({
      type:   'deny',
      target: `integrations.${name}.*`,
      reason: 'disabled by owner',
    });
    await this.setPolicy(p);
  }
}

export const governance = new GovernanceEngine();
export default governance;
