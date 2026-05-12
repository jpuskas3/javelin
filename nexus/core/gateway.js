/**
 * nexus/core/gateway.js
 * ============================================================================
 * NEXUS APIGateway — Local-First Request Router
 *
 * The Gateway is the single exit point for ALL external calls.  Every module
 * calls the gateway instead of fetch() directly, providing:
 *
 *   • Local-first: requests are intercepted and served from LocalStore when
 *     offline or when the local handler is registered.
 *   • Governance enforcement: the GovernanceEngine approves or blocks every
 *     outbound call based on the owner policy.
 *   • Retry + backoff: transient network failures are retried automatically.
 *   • Request/response telemetry: all calls are logged to the audit trail.
 *   • Integration swapping: replace the remote endpoint for any route without
 *     changing module code.
 *
 * Route naming convention
 * -----------------------
 *   <module>.<action>    e.g. 'projects.list', 'tasks.create'
 *   integrations.<name>.<action>   e.g. 'integrations.airtable.sync'
 *
 * Usage
 * -----
 * gateway.register('projects.list', async (params) => { ... });
 * const projects = await gateway.call('projects.list', { filter: 'active' });
 *
 * Remote fallback (wired by integrations layer)
 * ----------------------------------------------
 * gateway.remote('airtable', 'POST', '/projects', handler);
 * await gateway.call('projects.sync', {}, { remote: { provider: 'airtable', method: 'POST', path: '/projects' }});
 */

import { bus   } from './bus.js';
import { store } from './store.js';

const RETRY_DELAYS = [500, 1500, 4000];

class APIGateway {
  #local   = new Map();
  #remotes = new Map();
  #policy  = null;

  setPolicy(engine) { this.#policy = engine; }

  // --- Registration -----------------------------------------------------

  register(route, handler) {
    this.#local.set(route, handler);
    return this;
  }

  remote(provider, method, path, handler) {
    this.#remotes.set(`${provider}:${method}:${path}`, handler);
    return this;
  }

  // --- Dispatch ---------------------------------------------------------

  async call(route, params = {}, opts = {}) {
    const traceId = crypto.randomUUID();
    const start   = Date.now();

    bus.emit('gateway:request', { route, params, traceId });

    if (this.#policy && !this.#policy.allow(route, params)) {
      const err = new Error(`[Governance] Route blocked: ${route}`);
      bus.emit('gateway:blocked', { route, traceId, reason: err.message });
      throw err;
    }

    if (this.#local.has(route)) {
      try {
        const result = await this.#local.get(route)(params);
        bus.emit('gateway:response', {
          route, traceId, duration: Date.now() - start, source: 'local',
        });
        return result;
      } catch (err) {
        bus.emit('gateway:error', { route, traceId, err: err.message });
        throw err;
      }
    }

    if (opts.remote) {
      return this.#callRemote(
        opts.remote.provider, opts.remote.method,
        opts.remote.path, params, traceId, start
      );
    }

    throw new Error(`[Gateway] No handler for route: ${route}`);
  }

  async #callRemote(provider, method, path, params, traceId, start) {
    const key     = `${provider}:${method}:${path}`;
    const handler = this.#remotes.get(key);
    if (!handler) throw new Error(`[Gateway] No remote registered: ${key}`);

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const result = await handler(params);
        bus.emit('gateway:response', {
          route: key, traceId,
          duration: Date.now() - start,
          source: 'remote', provider, attempt,
        });
        return result;
      } catch (err) {
        if (attempt < RETRY_DELAYS.length) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
        } else {
          bus.emit('gateway:error', { route: key, traceId, err: err.message, attempt });
          throw err;
        }
      }
    }
  }

  async batch(calls) {
    return Promise.allSettled(
      calls.map(([route, params, opts]) => this.call(route, params, opts))
    );
  }

  routes()  { return [...this.#local.keys()]; }
  remotes() { return [...this.#remotes.keys()]; }
}

export const gateway = new APIGateway();
export default gateway;
