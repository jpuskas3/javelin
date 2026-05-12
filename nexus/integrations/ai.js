/**
 * nexus/integrations/ai.js
 * ============================================================================
 * NEXUS AI Integration — Claude (Anthropic)
 *
 * Provides AI-powered project intelligence using the Claude API.  Capabilities:
 *
 *   • Project summaries and health analysis
 *   • Task generation from project descriptions
 *   • Smart search across local data
 *   • Code assistance for lab scripts
 *   • Natural-language governance rule suggestions
 *
 * All prompts include a system context that scopes Claude to the local
 * workstation data — no data is sent to AI without explicit governance allow.
 *
 * WIRE-UP CHECKLIST
 * -----------------
 * 1. User adds Anthropic API key in Integrations panel
 * 2. Call AIIntegration.connect({ apiKey, model })
 * 3. Use .ask(), .summarizeProject(), .generateTasks(), etc.
 * 4. All calls are gated by governance.allow('integrations.ai.*')
 *
 * Model IDs (2026)
 * ----------------
 *   claude-sonnet-4-6          Standard, balanced
 *   claude-opus-4-7            Most capable
 *   claude-haiku-4-5-20251001  Fastest, lowest cost
 */

import { bus      } from '../core/bus.js';
import { store    } from '../core/store.js';
import { gateway  } from '../core/gateway.js';
import { governance } from '../core/governance.js';

const ANTHROPIC_API  = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL  = 'claude-sonnet-4-6';
const MAX_TOKENS     = 2048;

const SYSTEM_PROMPT = `You are the AI assistant embedded in Nexus Workstation, a local-first
project management system running on the owner's personal machine.

Your role:
- Help the owner organize, plan, and execute projects efficiently
- Analyze project health, surface blockers, and suggest next steps
- Generate well-structured tasks from project descriptions
- Keep all responses concise and actionable
- Respect that this is a local sovereign ecosystem — never suggest uploading
  data to third parties unless the owner explicitly requests it

Response format: Always respond in plain prose or structured markdown.
For task lists, use checkboxes (- [ ] task).
For code, use fenced code blocks.`;

class AIIntegration {
  #apiKey    = null;
  #model     = DEFAULT_MODEL;
  #connected = false;

  // ─── Connection ────────────────────────────────────────────────────

  async connect({ apiKey, model = DEFAULT_MODEL }) {
    this.#apiKey = apiKey;
    this.#model  = model;

    const ok = await this.testConnection();
    if (!ok) throw new Error('AI connection test failed — check your Anthropic API key');

    this.#connected = true;
    this.#registerRoutes();

    await store.set('settings', 'ai_config', {
      model,
      connectedAt: Date.now(),
      status: 'connected',
    });

    bus.emit('integrations:ai:connected', { model });
    return true;
  }

  disconnect() {
    this.#connected = false;
    this.#apiKey    = null;
    bus.emit('integrations:ai:disconnected', {});
  }

  get connected() { return this.#connected; }

  // ─── Core request ──────────────────────────────────────────────────

  async #request(messages, opts = {}) {
    if (!this.#apiKey) throw new Error('AI: not connected — add API key in Integrations');

    if (!governance.allow('integrations.ai.request')) {
      throw new Error('[Governance] AI requests are blocked by policy');
    }

    bus.emit('integrations:ai:request', { messages });

    const response = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         this.#apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      opts.model ?? this.#model,
        max_tokens: opts.maxTokens ?? MAX_TOKENS,
        system:     opts.system ?? SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${err.error?.message ?? response.statusText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    bus.emit('integrations:ai:response', { text, usage: data.usage });
    return text;
  }

  async testConnection() {
    try {
      await this.#request([{ role: 'user', content: 'Reply with exactly: ok' }],
        { maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Gateway route registration ────────────────────────────────────

  #registerRoutes() {
    gateway.remote('ai', 'POST', '/ask',             (p) => this.ask(p.prompt, p.context));
    gateway.remote('ai', 'POST', '/summarize',       (p) => this.summarizeProject(p.project, p.tasks));
    gateway.remote('ai', 'POST', '/generate-tasks',  (p) => this.generateTasks(p.description));
    gateway.remote('ai', 'POST', '/analyze-health',  (p) => this.analyzeHealth(p.projects, p.tasks));
  }

  // ─── Public API ────────────────────────────────────────────────────

  async ask(prompt, context = null) {
    const messages = [{ role: 'user', content: context ? `Context:\n${context}\n\n${prompt}` : prompt }];
    return this.#request(messages);
  }

  async summarizeProject(project, tasks = []) {
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const context   = `Project: ${project.name}
Description: ${project.description ?? 'None'}
Status: ${project.status}
Tasks: ${tasks.length} total, ${doneTasks} done (${tasks.length ? Math.round(doneTasks/tasks.length*100) : 0}% complete)
Open tasks: ${tasks.filter(t => t.status !== 'done').map(t => t.title).join(', ') || 'None'}`;

    return this.ask('Write a 2-3 sentence project health summary and identify any blockers or next steps.', context);
  }

  async generateTasks(projectDescription) {
    const prompt = `Given this project description, generate 5-8 concrete, actionable tasks.
Format each as: - [ ] Task title (brief description if needed)

Project description:
${projectDescription}`;

    const response = await this.ask(prompt);
    return this.#parseTaskList(response);
  }

  async analyzeHealth(projects = [], tasks = []) {
    const context = `Total projects: ${projects.length}
Active: ${projects.filter(p => p.status === 'active').length}
Total tasks: ${tasks.length}
Done: ${tasks.filter(t => t.status === 'done').length}
Overdue: ${tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length}`;

    return this.ask('Give a brief ecosystem health check (2-4 bullets) with top priority recommendation.', context);
  }

  async searchLocal(query) {
    const [projects, tasks] = await Promise.all([
      store.getAll('projects'),
      store.getAll('tasks'),
    ]);

    const context = `Local data summary:
Projects: ${JSON.stringify(projects.map(p => ({ name: p.name, status: p.status, description: p.description })))}
Tasks: ${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, projectId: t.projectId })))}`;

    return this.ask(`Search query: "${query}"\nFind and summarize all relevant projects and tasks.`, context);
  }

  // ─── Streaming support ─────────────────────────────────────────────

  async *stream(prompt, onChunk) {
    if (!this.#apiKey) throw new Error('AI: not connected');
    if (!governance.allow('integrations.ai.stream')) {
      throw new Error('[Governance] AI streaming is blocked by policy');
    }

    const response = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         this.#apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      this.#model,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        stream:     true,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            const chunk = data.delta?.text ?? '';
            if (chunk && onChunk) onChunk(chunk);
            yield chunk;
          }
        } catch { /* skip malformed SSE */ }
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  #parseTaskList(text) {
    return text
      .split('\n')
      .filter(l => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [x]'))
      .map(l => ({
        id:     `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title:  l.replace(/^- \[[ x]\]\s*/, '').trim(),
        status: l.includes('[x]') ? 'done' : 'todo',
        _source:'ai',
      }));
  }
}

export const ai = new AIIntegration();
export default ai;
