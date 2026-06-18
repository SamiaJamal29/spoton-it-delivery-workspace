'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, WorkItem } from '@/lib/api';

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
          <h1 className="workspace-title">Tasks{projectFilter ? ` · ${projectFilter}` : ''}</h1>
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
        <div className="item-list">
          {items.map((item) => (
            <div key={item.id} className="item-row">
              <div className="item-row-main">
                <span className="item-row-title" style={{ cursor: 'pointer' }} onClick={() => openPanel(item.id)}>
                  {item.title}
                </span>
                <div className="item-row-meta">
                  <span className="badge" style={{ background: STATUS_COLORS[item.status] }}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="badge" style={{ background: PRIORITY_COLORS[item.priority] }}>
                    {item.priority}
                  </span>
                  <span className="item-type">{item.type}</span>
                  {item.assignee && <span className="item-assignee">👤 {item.assignee}</span>}
                  {item.dueDate && <span className="item-due">📅 {item.dueDate}</span>}
                </div>
              </div>
              <div className="item-row-actions">
                <button className="btn btn-sm" onClick={() => openPanel(item.id)}>View</button>
                <Link href={`/pm/work-items/${item.id}/edit`} className="btn btn-sm">Edit</Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.title)}>Delete</button>
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
                <div className="kanban-col-header" style={{ borderTopColor: color }}>
                  <span className="kanban-col-title" style={{ color }}>{label}</span>
                  <span className="kanban-col-count" style={{ background: color }}>{colItems.length}</span>
                </div>
                <div className="kanban-cards">
                  {colItems.length === 0 && <div className="kanban-empty">No tasks</div>}
                  {colItems.map(item => {
                    const passed = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
                    const totalQa = item.qaChecks?.length ?? 0;
                    return (
                      <div key={item.id} className="kanban-card" style={{ cursor: 'pointer' }} onClick={() => openPanel(item.id)}>
                        <div className="kanban-card-top">
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>
                            WI-{item.id.slice(-6).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: PRIORITY_COLORS[item.priority] + '22', color: PRIORITY_COLORS[item.priority] }}>
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', marginBottom: 8 }}>{item.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-3)' }}>{item.type}</span>
                          {item.assignee && (
                            <span title={item.assignee} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginLeft: 'auto' }}>
                              {initials(item.assignee)}
                            </span>
                          )}
                          {totalQa > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: passed === totalQa ? '#16a34a' : '#f59e0b' }}>✓ {passed}/{totalQa}</span>}
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

