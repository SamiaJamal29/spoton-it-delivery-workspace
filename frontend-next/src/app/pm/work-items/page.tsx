'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, WorkItem, getActiveProjectId } from '@/lib/api';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8',
};
const STATUS_COLORS: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
};
const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready for Release', released: 'Released',
};
const STATUSES = ['backlog','planned','in_progress','qa','ready_for_release','released'];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function WorkItemsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [myWork, setMyWork] = useState(false);
  const [view, setView] = useState<'table' | 'board'>('table');

  // Kanban scroll
  const kanbanRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, startX: 0, scrollLeft: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    const el = kanbanRef.current; if (!el) return;
    drag.current = { on: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onMouseUp = () => { drag.current.on = false; };
  const onMouseLeave = () => { drag.current.on = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.on || !kanbanRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanRef.current.offsetLeft;
    kanbanRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.5;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('spoton_wi_view') as 'table' | 'board' | null;
      if (saved) setView(saved);
    } catch {}
  }, []);

  const setViewAndSave = (v: 'table' | 'board') => {
    setView(v);
    try { localStorage.setItem('spoton_wi_view', v); } catch {}
  };

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (myWork) params.myWork = 'true';
    const pid = getActiveProjectId();
    if (pid) params.projectId = pid;
    api.workItems.list(params)
      .then(data => {
        // client-side project filter
        const project = searchParams.get('project');
        setItems(project ? data.filter(i => i.assignee?.toLowerCase().includes(project.toLowerCase()) || i.title?.toLowerCase().includes(project.toLowerCase())) : data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter, priorityFilter, myWork]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await api.workItems.delete(id);
    load();
  };

  const openPanel = (id: string) => router.push(`/pm/work-items?panel=${id}`);

  const projectFilter = searchParams.get('project');

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">Work Items{projectFilter ? ` · ${projectFilter}` : ''}</h1>
          <p className="workspace-subtitle">{items.length} tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 9, padding: 3, gap: 2 }}>
            <button onClick={() => setViewAndSave('table')} title="Table view" style={{
              width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === 'table' ? 'var(--surface)' : 'transparent',
              color: view === 'table' ? 'var(--accent)' : 'var(--text-3)',
              boxShadow: view === 'table' ? 'var(--shadow)' : 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
            </button>
            <button onClick={() => setViewAndSave('board')} title="Board view" style={{
              width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === 'board' ? 'var(--surface)' : 'transparent',
              color: view === 'board' ? 'var(--accent)' : 'var(--text-3)',
              boxShadow: view === 'board' ? 'var(--shadow)' : 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
          </div>
          <Link href="/pm/work-items/new" className="btn btn-primary">+ New Task</Link>
        </div>
      </div>

      <div className="filters">
        <input
          className="filter-input"
          placeholder="Search title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="filter-checkbox">
          <input type="checkbox" checked={myWork} onChange={(e) => setMyWork(e.target.checked)} />
          My Work
        </label>
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}
      {error && <div className="workspace-error">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>No tasks found.</p>
          <Link href="/pm/work-items/new" className="btn btn-primary">Create your first task</Link>
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading && items.length > 0 && view === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', transition: 'box-shadow .15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              {/* Status dot */}
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[item.status], flexShrink: 0, display: 'inline-block' }} />

              {/* ID */}
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 5, flexShrink: 0 }}>
                WI-{item.id.slice(-5).toUpperCase()}
              </span>

              {/* Title */}
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onClick={() => openPanel(item.id)}>
                {item.title}
              </span>

              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: STATUS_COLORS[item.status] + '20', color: STATUS_COLORS[item.status] }}>
                  {STATUS_LABELS[item.status]}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: PRIORITY_COLORS[item.priority] + '18', color: PRIORITY_COLORS[item.priority] }}>
                  {item.priority}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>{item.type}</span>
                {item.assignee && (
                  <span title={item.assignee} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initials(item.assignee)}
                  </span>
                )}
                {item.dueDate && (
                  <span style={{ fontSize: 11, color: new Date(item.dueDate) < new Date() ? '#ef4444' : 'var(--text-3)', flexShrink: 0 }}>
                    {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <Link href={`/pm/work-items/${item.id}/edit`} className="btn btn-sm" style={{ fontSize: 12 }}>Edit</Link>
                <button className="btn btn-sm btn-danger" style={{ fontSize: 12 }} onClick={() => handleDelete(item.id, item.title)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BOARD VIEW */}
      {!loading && items.length > 0 && view === 'board' && (
        <div
          className="kanban"
          ref={kanbanRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
        >
          {STATUSES.map(status => {
            const colItems = items.filter(i => i.status === status);
            const color = STATUS_COLORS[status];
            const label = STATUS_LABELS[status];
            return (
              <div key={status} className="kanban-col">
                <div className="kanban-col-header" style={{ background: color + '15', borderBottom: `1px solid ${color}30` }}>
                  <div className="kanban-col-header-left">
                    <span className="kanban-col-dot" style={{ background: color }} />
                    <span className="kanban-col-title">{label}</span>
                  </div>
                  <span className="kanban-col-count" style={{ background: color }}>{colItems.length}</span>
                </div>
                <div className="kanban-cards">
                  {colItems.length === 0 && <div className="kanban-empty"><span className="kanban-empty-icon">📭</span><span>No tasks</span></div>}
                  {colItems.map(item => {
                    const passed = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
                    const totalQa = item.qaChecks?.length ?? 0;
                    return (
                      <div key={item.id} className="kanban-card" style={{ cursor: 'pointer' }} onClick={() => openPanel(item.id)}>
                        <div className="kanban-card-bar" style={{ background: color }} />
                        <div className="kanban-card-body">
                          <div className="kanban-card-top">
                            <span className="kanban-card-id">WI-{item.id.slice(-5).toUpperCase()}</span>
                            <button className="kanban-delete-btn" onClick={e => { e.stopPropagation(); handleDelete(item.id, item.title); }}>×</button>
                          </div>
                          <Link href={`/pm/work-items/${item.id}`} className="kanban-card-title" onClick={e => e.stopPropagation()}>{item.title}</Link>
                          <div className="kanban-card-footer">
                            <span className="kanban-priority-pill" style={{ color: PRIORITY_COLORS[item.priority], background: PRIORITY_COLORS[item.priority] + '18' }}>{item.priority}</span>
                            <span className="kanban-type-chip">{item.type}</span>
                            {item.assignee && (
                              <span className="kanban-assignee-avatar" style={{ background: color }} title={item.assignee}>{initials(item.assignee)}</span>
                            )}
                            {totalQa > 0 && (
                              <span className="kanban-qa-badge" style={{ color: passed === totalQa ? '#059669' : '#d97706', background: passed === totalQa ? '#ecfdf5' : '#fffbeb' }}>✓ {passed}/{totalQa}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkItemsPage() {
  return (
    <Suspense fallback={<div className="workspace-loading">Loading…</div>}>
      <WorkItemsInner />
    </Suspense>
  );
}

