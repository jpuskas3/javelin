/**
 * nexus/integrations/github.js
 * ============================================================================
 * NEXUS GitHub Integration
 *
 * Links GitHub repositories to Nexus projects, enabling:
 *   • Import GitHub Issues as Nexus tasks
 *   • Create GitHub Issues from Nexus tasks
 *   • Monitor CI/CD status for linked repos
 *   • Trigger workflow dispatches from the Labs panel
 *   • Sync commit activity to the Dashboard activity feed
 *
 * WIRE-UP CHECKLIST
 * -----------------
 * 1. User adds Personal Access Token (PAT) + default repo in Integrations panel
 * 2. Call GitHubIntegration.connect({ token, defaultRepo })
 * 3. Link a project to a repo via .linkProject(projectId, 'owner/repo')
 * 4. Call .syncIssues(projectId) to pull issues as tasks
 *
 * Required PAT scopes: repo, workflow, read:user
 */

import { bus      } from '../core/bus.js';
import { store    } from '../core/store.js';
import { gateway  } from '../core/gateway.js';
import { governance } from '../core/governance.js';

const GITHUB_API  = 'https://api.github.com';

class GitHubIntegration {
  #token       = null;
  #defaultRepo = null;
  #connected   = false;

  // ─── Connection ────────────────────────────────────────────────────

  async connect({ token, defaultRepo }) {
    this.#token       = token;
    this.#defaultRepo = defaultRepo;

    const user = await this.getMe();
    if (!user) throw new Error('GitHub connection failed — check Personal Access Token');

    this.#connected = true;
    this.#registerRoutes();

    await store.set('settings', 'github_config', {
      login:       user.login,
      defaultRepo,
      connectedAt: Date.now(),
      status:      'connected',
    });

    bus.emit('integrations:github:connected', { login: user.login, defaultRepo });
    return user;
  }

  disconnect() {
    this.#connected = false;
    this.#token     = null;
    bus.emit('integrations:github:disconnected', {});
  }

  get connected() { return this.#connected; }

  // ─── API helpers ───────────────────────────────────────────────────

  async #request(method, path, body = null) {
    if (!this.#token) throw new Error('GitHub: not connected');
    if (!governance.allow('integrations.github.request')) {
      throw new Error('[Governance] GitHub requests are blocked by policy');
    }

    const response = await fetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.#token}`,
        'Accept':        'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`GitHub ${method} ${path}: ${err.message ?? response.statusText}`);
    }

    return response.json();
  }

  // ─── Gateway routes ────────────────────────────────────────────────

  #registerRoutes() {
    gateway.remote('github', 'GET',  '/issues',   (p) => this.listIssues(p.repo, p.state));
    gateway.remote('github', 'POST', '/issues',   (p) => this.createIssue(p.repo, p.title, p.body));
    gateway.remote('github', 'GET',  '/commits',  (p) => this.listCommits(p.repo));
    gateway.remote('github', 'GET',  '/workflows',(p) => this.listWorkflows(p.repo));
    gateway.remote('github', 'POST', '/dispatch', (p) => this.triggerWorkflow(p.repo, p.workflowId, p.ref, p.inputs));
  }

  // ─── User ──────────────────────────────────────────────────────────

  async getMe() {
    try {
      return await this.#request('GET', '/user');
    } catch {
      return null;
    }
  }

  // ─── Issues ────────────────────────────────────────────────────────

  async listIssues(repo = this.#defaultRepo, state = 'open') {
    const data = await this.#request('GET', `/repos/${repo}/issues?state=${state}&per_page=50`);
    return data.map(i => ({
      id:          `gh_issue_${i.number}`,
      title:       i.title,
      description: i.body ?? '',
      status:      i.state === 'closed' ? 'done' : 'todo',
      tags:        i.labels.map(l => l.name),
      githubIssue: i.number,
      githubRepo:  repo,
      url:         i.html_url,
      _source:     'github',
    }));
  }

  async createIssue(repo = this.#defaultRepo, title, body = '') {
    return this.#request('POST', `/repos/${repo}/issues`, { title, body });
  }

  // ─── Issues → Tasks sync ───────────────────────────────────────────

  async syncIssues(projectId, repo = this.#defaultRepo) {
    const issues = await this.listIssues(repo);
    for (const issue of issues) {
      const existing = await store.get('tasks', issue.id);
      if (!existing || existing._updatedAt < issue._updatedAt) {
        await store.set('tasks', issue.id, { ...issue, projectId });
      }
    }
    bus.emit('integrations:github:issues_synced', { projectId, count: issues.length });
    return issues;
  }

  // ─── Commits ───────────────────────────────────────────────────────

  async listCommits(repo = this.#defaultRepo, perPage = 20) {
    const data = await this.#request('GET', `/repos/${repo}/commits?per_page=${perPage}`);
    return data.map(c => ({
      sha:     c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      author:  c.commit.author.name,
      date:    c.commit.author.date,
      url:     c.html_url,
    }));
  }

  // ─── Workflows / CI ────────────────────────────────────────────────

  async listWorkflows(repo = this.#defaultRepo) {
    const data = await this.#request('GET', `/repos/${repo}/actions/workflows`);
    return data.workflows ?? [];
  }

  async triggerWorkflow(repo = this.#defaultRepo, workflowId, ref = 'main', inputs = {}) {
    return this.#request('POST', `/repos/${repo}/actions/workflows/${workflowId}/dispatches`, {
      ref,
      inputs,
    });
  }

  async latestRunStatus(repo = this.#defaultRepo) {
    try {
      const data = await this.#request('GET', `/repos/${repo}/actions/runs?per_page=1`);
      return data.workflow_runs?.[0] ?? null;
    } catch {
      return null;
    }
  }

  // ─── Link project to repo ──────────────────────────────────────────

  async linkProject(projectId, repo) {
    const project = await store.get('projects', projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);
    await store.set('projects', projectId, { ...project, githubRepo: repo });
    bus.emit('integrations:github:project_linked', { projectId, repo });
  }
}

export const github = new GitHubIntegration();
export default github;
