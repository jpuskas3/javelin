/**
 * nexus/core/bus.js
 * ============================================================================
 * NEXUS EventBus — Async Local Message Broker
 *
 * The EventBus is the nervous system of the Nexus architecture.  Every module,
 * integration, and UI component communicates exclusively through named events.
 * No direct imports between modules; all coupling is by contract (event name +
 * payload schema).  This is the backbone of the serverless-async design.
 *
 * Design principles
 * -----------------
 * • Local-first: events are always processed in-process; remote bridging is
 *   opt-in via the RemoteBridge plugin.
 * • Async-first: all handlers receive a Promise chain; synchronous handlers are
 *   wrapped automatically.
 * • Replay-capable: the bus keeps a bounded circular log so late subscribers
 *   can catch up (e.g. after a module lazy-loads).
 * • Observable: every dispatch is traced via the GovernanceEngine so the owner
 *   has full audit visibility.
 *
 * Event catalog (canonical names)
 * --------------------------------
 *   auth:*          Authentication lifecycle
 *   projects:*      Project CRUD
 *   tasks:*         Task CRUD
 *   store:*         LocalStore mutations
 *   gateway:*       API Gateway telemetry
 *   governance:*    Policy decisions
 *   integrations:*  External system events
 *   ui:*            UI state changes
 *   system:*        System-level events (boot, offline, sync)
 *
 * Usage
 * -----
 * import { bus } from './bus.js';
 *
 * const unsub = bus.on('projects:created', async (payload) => { ... });
 * await bus.emit('projects:created', { id: 'proj_01', name: 'Alpha' });
 * bus.once('auth:ready', (payload) => { ... });
 * unsub();
 */

const MAX_LOG = 256;

class EventBus {
  #handlers = new Map();
  #log      = [];
  #plugins  = [];
  #paused   = false;
  #queue    = [];

  // --- Subscribe --------------------------------------------------------

  on(event, handler) {
    if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
    this.#handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapper = async (payload) => {
      await handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    this.#handlers.get(event)?.delete(handler);
  }

  // --- Emit -------------------------------------------------------------

  async emit(event, payload = {}) {
    if (this.#paused) {
      this.#queue.push({ event, payload });
      return;
    }

    const envelope = {
      event,
      payload,
      ts: Date.now(),
      id: crypto.randomUUID(),
    };

    let current = envelope;
    for (const plugin of this.#plugins) {
      current = await plugin(current) ?? current;
    }

    this.#log.push(current);
    if (this.#log.length > MAX_LOG) this.#log.shift();

    const handlers = this.#handlers.get(current.event);
    if (!handlers?.size) return;

    await Promise.allSettled(
      [...handlers].map(h => Promise.resolve(h(current.payload, current)))
    );
  }

  async emitPattern(pattern, payload = {}) {
    const regex   = new RegExp(pattern);
    const matched = [...this.#handlers.keys()].filter(k => regex.test(k));
    await Promise.all(matched.map(event => this.emit(event, payload)));
  }

  // --- Replay -----------------------------------------------------------

  replay(event, handler) {
    const past = this.#log.filter(e => e.event === event);
    past.forEach(e => Promise.resolve(handler(e.payload, e)));
  }

  // --- Flow control -----------------------------------------------------

  pause() { this.#paused = true; }

  async resume() {
    this.#paused = false;
    const queued = [...this.#queue];
    this.#queue  = [];
    for (const { event, payload } of queued) await this.emit(event, payload);
  }

  // --- Plugin middleware ------------------------------------------------

  use(plugin) { this.#plugins.push(plugin); }

  // --- Introspection ----------------------------------------------------

  events()  { return [...this.#handlers.keys()]; }
  log()     { return [...this.#log]; }
  stats()   {
    return {
      events:   this.#handlers.size,
      handlers: [...this.#handlers.values()].reduce((n, s) => n + s.size, 0),
      logDepth: this.#log.length,
      plugins:  this.#plugins.length,
    };
  }
}

export const bus = new EventBus();
export default bus;
