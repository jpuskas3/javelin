"""
nexus/backend/api/javelin_nexus.py
================================================================================
NEXUS Javelin Backend Extension

Extends the existing Javelin Flask app (backend/app/app.py) with Nexus routes.
Import and register this blueprint in the Javelin app:

    from nexus.backend.api.javelin_nexus import nexus_bp
    app.register_blueprint(nexus_bp)

This module adds:
  • /api/nexus/* routes consistent with the workstation backend
  • Container lifecycle management (start/stop/status)
  • Nexus-aware auth decorators (using existing Flask-Login)
  • SavedPoint integration for Maps module
  • WebSocket events for live container log streaming

Running alongside existing Javelin Flask app:
    python backend/app/app.py  (serves both Javelin routes + Nexus routes)
"""

from __future__ import annotations

import json
import os
import subprocess
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Optional

from flask import Blueprint, jsonify, request, Response, stream_with_context
from flask_login import login_required, current_user

# ─── Blueprint ─────────────────────────────────────────────────────────────

nexus_bp = Blueprint('nexus', __name__, url_prefix='/api/nexus')

# ─── Config ────────────────────────────────────────────────────────────────

DATA_DIR = Path(os.environ.get('NEXUS_DATA_DIR', './2data'))
LOG_DIR  = Path(os.environ.get('NEXUS_LOG_DIR',  './2data/logs'))

DATA_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ─── Helpers ───────────────────────────────────────────────────────────────

def _load_json(path: Path, default=None):
    if not path.exists():
        return default if default is not None else []
    return json.loads(path.read_text())

def _save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))

# ─── Health ────────────────────────────────────────────────────────────────

@nexus_bp.get('/health')
def health():
    return jsonify({
        'status':    'ok',
        'app':       'javelin',
        'version':   '1.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'user':      current_user.username if current_user.is_authenticated else None,
    })

# ─── Projects ──────────────────────────────────────────────────────────────

PROJECTS_FILE = DATA_DIR / 'projects.json'

@nexus_bp.get('/projects')
@login_required
def list_projects():
    projects = _load_json(PROJECTS_FILE)
    return jsonify([p for p in projects if p.get('owner') == current_user.username])

@nexus_bp.post('/projects')
@login_required
def create_project():
    body    = request.json or {}
    projects = _load_json(PROJECTS_FILE)
    project  = {
        'id':          f'proj_{uuid.uuid4().hex[:8]}',
        'name':        body.get('name', 'Untitled'),
        'description': body.get('description', ''),
        'status':      body.get('status', 'active'),
        'color':       body.get('color', 'cyan'),
        'owner':       current_user.username,
        'created_at':  datetime.now(timezone.utc).isoformat(),
    }
    projects.append(project)
    _save_json(PROJECTS_FILE, projects)
    return jsonify(project), 201

@nexus_bp.delete('/projects/<project_id>')
@login_required
def delete_project(project_id: str):
    projects = [p for p in _load_json(PROJECTS_FILE)
                if p['id'] != project_id or p.get('owner') != current_user.username]
    _save_json(PROJECTS_FILE, projects)
    return jsonify({'ok': True})

# ─── Tasks ─────────────────────────────────────────────────────────────────

TASKS_FILE = DATA_DIR / 'tasks.json'

@nexus_bp.get('/tasks')
@login_required
def list_tasks():
    project_id = request.args.get('project_id')
    tasks      = _load_json(TASKS_FILE)
    tasks      = [t for t in tasks if t.get('owner') == current_user.username]
    if project_id:
        tasks = [t for t in tasks if t.get('project_id') == project_id]
    return jsonify(tasks)

@nexus_bp.post('/tasks')
@login_required
def create_task():
    body  = request.json or {}
    tasks = _load_json(TASKS_FILE)
    task  = {
        'id':          f'task_{uuid.uuid4().hex[:8]}',
        'title':       body.get('title', 'Untitled'),
        'description': body.get('description', ''),
        'status':      body.get('status', 'todo'),
        'project_id':  body.get('project_id'),
        'tags':        body.get('tags', []),
        'owner':       current_user.username,
        'created_at':  datetime.now(timezone.utc).isoformat(),
    }
    tasks.append(task)
    _save_json(TASKS_FILE, tasks)
    return jsonify(task), 201

@nexus_bp.patch('/tasks/<task_id>')
@login_required
def update_task(task_id: str):
    body  = request.json or {}
    tasks = _load_json(TASKS_FILE)
    for t in tasks:
        if t['id'] == task_id and t.get('owner') == current_user.username:
            t.update(body)
            t['updated_at'] = datetime.now(timezone.utc).isoformat()
            break
    _save_json(TASKS_FILE, tasks)
    return jsonify({'ok': True})

# ─── Containers ────────────────────────────────────────────────────────────

CONTAINER_MODULES = {
    'DeckBoss':      './ocontainer/DeckBoss',
    'ZSkipper':      './ocontainer/ZSkipper',
    'DataFarm':      './ocontainer/DataFarm',
    'Captain':       './ocontainer/Captain',
    'Maps':          './ocontainer/Maps',
    'Media':         './ocontainer/Media',
    'Library':       './ocontainer/Library',
    'OpenContainer': './ocontainer/OpenContainer',
}

_running: dict[str, subprocess.Popen] = {}

@nexus_bp.get('/containers')
@login_required
def list_containers():
    return jsonify([
        {
            'name':   name,
            'path':   path,
            'status': 'running' if (
                name in _running and _running[name].poll() is None
            ) else 'idle',
        }
        for name, path in CONTAINER_MODULES.items()
    ])

@nexus_bp.post('/containers/<name>/start')
@login_required
def start_container(name: str):
    if name not in CONTAINER_MODULES:
        return jsonify({'error': f'Unknown container: {name}'}), 400

    if name in _running and _running[name].poll() is None:
        return jsonify({'error': f'{name} is already running'}), 409

    log_file = LOG_DIR / f'{name.lower()}_{int(time.time())}.log'
    try:
        with open(log_file, 'w') as lf:
            proc = subprocess.Popen(
                ['python', 'run.py'],
                cwd   = CONTAINER_MODULES[name],
                stdout= lf,
                stderr= subprocess.STDOUT,
            )
        _running[name] = proc
        return jsonify({'ok': True, 'pid': proc.pid, 'log': str(log_file)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@nexus_bp.post('/containers/<name>/stop')
@login_required
def stop_container(name: str):
    proc = _running.get(name)
    if not proc or proc.poll() is not None:
        return jsonify({'ok': True, 'message': 'Not running'})
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    return jsonify({'ok': True})

@nexus_bp.get('/containers/<name>/status')
@login_required
def container_status(name: str):
    proc = _running.get(name)
    if not proc:
        return jsonify({'name': name, 'status': 'idle'})
    if proc.poll() is None:
        return jsonify({'name': name, 'status': 'running', 'pid': proc.pid})
    return jsonify({'name': name, 'status': 'stopped', 'returncode': proc.returncode})

@nexus_bp.get('/containers/<name>/log')
@login_required
def stream_container_log(name: str):
    """Server-sent events stream of container log."""
    log_files = sorted(
        LOG_DIR.glob(f'{name.lower()}_*.log'),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not log_files:
        return Response('data: {"error": "No log found"}\n\n', mimetype='text/event-stream')

    log_file = log_files[0]

    def generate():
        import time as time_mod
        with open(log_file) as f:
            while True:
                line = f.readline()
                if line:
                    yield f'data: {json.dumps({"line": line.rstrip()})}\n\n'
                else:
                    proc = _running.get(name)
                    if not proc or proc.poll() is not None:
                        yield 'data: {"done": true}\n\n'
                        break
                    time_mod.sleep(0.25)

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

# ─── Saved points (existing Javelin feature, nexus-aware) ──────────────────

@nexus_bp.get('/saved-points')
@login_required
def get_saved_points():
    """Proxy to existing SavedPoint model — available at /api/nexus/saved-points."""
    try:
        from models import SavedPoint
        points = SavedPoint.query.filter_by(user_id=current_user.id).all()
        return jsonify([{
            'id':       p.id,
            'image':    p.image_filename,
            'volume':   p.volume,
            'date':     p.date_saved.isoformat() if p.date_saved else None,
        } for p in points])
    except ImportError:
        return jsonify([])

# ─── Webhook receiver ──────────────────────────────────────────────────────

WEBHOOK_LOG = DATA_DIR / 'webhook_events.jsonl'

@nexus_bp.post('/webhook/<source>')
def receive_webhook(source: str):
    payload  = request.json or {}
    event_id = uuid.uuid4().hex[:8]
    entry    = {
        'id':      event_id,
        'source':  source,
        'payload': payload,
        'ts':      datetime.now(timezone.utc).isoformat(),
    }
    with open(WEBHOOK_LOG, 'a') as f:
        f.write(json.dumps(entry) + '\n')
    return jsonify({'ok': True, 'event_id': event_id})

# ─── System info ───────────────────────────────────────────────────────────

@nexus_bp.get('/system')
@login_required
def system_info():
    import sys as _sys
    return jsonify({
        'app':       'javelin',
        'platform':  _sys.platform,
        'python':    _sys.version,
        'data_dir':  str(DATA_DIR.resolve()),
        'log_dir':   str(LOG_DIR.resolve()),
        'containers':list(CONTAINER_MODULES.keys()),
        'running':   [n for n, p in _running.items() if p.poll() is None],
    })
