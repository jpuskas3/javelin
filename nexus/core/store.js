/**
 * nexus/core/store.js
 * ============================================================================
 * NEXUS LocalStore — IndexedDB-backed Reactive State
 *
 * LocalStore is the single source of truth for all client-side state.  It uses
 * IndexedDB for persistence so data survives page reloads and works entirely
 * offline.  Every mutation is also published on the EventBus so any subscriber
 * can react without polling.
 *
 * Architecture
 * ------------
 *   LocalStore
 *     └─ Namespace (e.g. 'projects')
 *           └─ Record  (key → value object, always has `id` field)
 *
 * Bus events emitted
 * ------------------
 *   store:set    { ns, key, value, prev }
 *   store:delete { ns, key, prev }
 *   store:clear  { ns }
 *
 * Usage
 * -----
 * import { store } from './store.js';
 * await store.ready;
 *
 * await store.set('projects', 'proj_01', { name: 'Alpha', status: 'active' });
 * const proj = await store.get('projects', 'proj_01');
 * const all  = await store.getAll('projects');
 * await store.delete('projects', 'proj_01');
 *
 * // Reactive binding
 * const unsub = store.watch('projects', null, (value, prev) => renderList());
 */

import { bus } from './bus.js';

const DB_NAME    = 'nexus_local';
const DB_VERSION = 1;

class LocalStore {
  #db = null;

  constructor() {
    this.ready = this.#open();
  }

  #open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db         = e.target.result;
        const namespaces = [
          'projects', 'tasks', 'library', 'media',
          'networks', 'maps', 'labs', 'settings',
          'integrations', 'audit_log',
        ];
        for (const ns of namespaces) {
          if (!db.objectStoreNames.contains(ns)) {
            db.createObjectStore(ns, { keyPath: 'id' });
          }
        }
      };

      req.onsuccess = (e) => { this.#db = e.target.result; resolve(this); };
      req.onerror   = (e) => reject(e.target.error);
    });
  }

  // --- Core CRUD --------------------------------------------------------

  async get(ns, key) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readonly');
      const req = tx.objectStore(ns).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = () => reject(req.error);
    });
  }

  async getAll(ns) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readonly');
      const req = tx.objectStore(ns).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async set(ns, key, value) {
    await this.ready;
    const prev   = await this.get(ns, key);
    const record = { id: key, ...value, _updatedAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readwrite');
      const req = tx.objectStore(ns).put(record);
      req.onsuccess = () => {
        bus.emit('store:set', { ns, key, value: record, prev });
        resolve(record);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(ns, key) {
    await this.ready;
    const prev = await this.get(ns, key);
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readwrite');
      const req = tx.objectStore(ns).delete(key);
      req.onsuccess = () => {
        bus.emit('store:delete', { ns, key, prev });
        resolve(prev);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clear(ns) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readwrite');
      const req = tx.objectStore(ns).clear();
      req.onsuccess = () => { bus.emit('store:clear', { ns }); resolve(); };
      req.onerror   = () => reject(req.error);
    });
  }

  // --- Query helpers ----------------------------------------------------

  async query(ns, predicate) {
    const all = await this.getAll(ns);
    return all.filter(predicate);
  }

  async count(ns) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const tx  = this.#db.transaction(ns, 'readonly');
      const req = tx.objectStore(ns).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // --- Reactive binding -------------------------------------------------

  watch(ns, key, handler) {
    return bus.on('store:set', (e) => {
      if (e.ns === ns && (key == null || e.key === key)) handler(e.value, e.prev);
    });
  }
}

export const store = new LocalStore();
export default store;
