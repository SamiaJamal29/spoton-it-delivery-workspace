'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem } from '@/lib/api';

const STATUS_COLS: { key: WorkItem['status']; label: string; color: string; bg: string }[] = [
  { key: 'backlog',          label: 'Backlog',           color: '#94a3b8', bg: '#f8fafc' },
  { key: 'planned',          label: 'Planned',           color: '#3b82f6', bg: '#eff6ff' },
  { key: 'in_progress',      label: 'In Progress',       color: '#f59e0b', bg: '#fffbeb' },
  { key: 'qa',               label: 'QA',                color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'ready_for_release',label: 'Ready for Release', color: '#10b981', bg: '#ecfdf5' },
  { key: 'released',         label: 'Released',          color: '#059669', bg: '#d1fae5' },
];

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#94a3b8',
};

const TYPE_ICON: Record<string, string> = {
  feature: '✦', bug: '⚠', improvement: '↑', maintenance: '⚙',
};

const VALID_TRANSITIONS: Record<WorkItem['status'], WorkItem['status'][]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa'],
  released: [],
};

export default function ItWorkspacePage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<WorkItem['status'] | null>(null);
  const kanbanRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

  const load = () =>
    api.workItems.list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Scroll-drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const el = kanbanRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onMouseLeave = () => { dragState.current.dragging = false; };
  const onMouseUp = () => { dragState.current.dragging = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging || !kanbanRef.current || dragId) return;
    e.preventDefault();
    const x = e.pageX - kanbanRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    kanbanRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  // Drag-and-drop handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent, col: WorkItem['status']) => {
    e.preventDefault();
    setOverCol(col);
  };
  const onDrop = async (e: React.DragEvent, targetStatus: WorkItem['status']) => {
    e.preventDefault();
    setOverCol(null);
    if (!dragId) return;
    const item = items.find((i) => i.id === dragId);
    if (!item || item.status === targetStatus) { setDragId(null); return; }
    const allowed = VALID_TRANSITIONS[item.status];
    if (!allowed.includes(targetStatus)) {
      alert(`Cannot move from "${item.status.replace(/_/g,' ')}" to "${targetStatus.replace(/_/g,' ')}"`);
      setDragId(null);
      return;
    }
    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === dragId ? { ...i, status: targetStatus } : i));
    setDragId(null);
    try {
      await api.workItems.update(dragId, { status: targetStatus });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Move failed');
      load();
    }
  };
  const onDragEnd = () => { setDragId(null); setOverCol(null); };

  const deleteItem = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${title}"?`)) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await api.workItems.delete(id);
  };

  const byStatus = (status: WorkItem['status']) => items.filter((i) => i.status === status);

  if (loading) return <div className="workspace-loading">Loading workspace…</div>;
  if (error) return <div className="workspace-error">Error: {error}</div>;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">IT Delivery Workspace</h1>
          <p className="workspace-subtitle">{items.length} work items · drag cards between columns</p>
        </div>
        <Link href="/pm/work-items/new" className="btn btn-primary">+ New Work Item</Link>
      </div>

      <div
        className="kanban"
        ref={kanbanRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        {STATUS_COLS.map((col) => {
          const colItems = byStatus(col.key);
          const isOver = overCol === col.key;
          return (
            <div
              key={col.key}
              className={`kanban-col${isOver ? ' kanban-col-over' : ''}`}
              style={{ background: isOver ? col.bg : undefined, borderColor: isOver ? col.color : undefined }}
              onDragOver={(e) => onDragOver(e, col.key)}
              onDrop={(e) => onDrop(e, col.key)}
              onDragLeave={() => setOverCol(null)}
            >
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-col-count" style={{ background: col.color }}>{colItems.length}</span>
              </div>

              <div className="kanban-cards">
                {colItems.length === 0 && (
                  <div className={`kanban-empty${isOver ? ' kanban-empty-over' : ''}`}>
                    {isOver ? 'Drop here' : 'No items'}
                  </div>
                )}
                {colItems.map((item) => {
                  const passed = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
                  const total = item.qaChecks?.length ?? 0;
                  return (
                    <div
                      key={item.id}
                      className={`kanban-card${dragId === item.id ? ' kanban-card-dragging' : ''}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.id)}
                      onDragEnd={onDragEnd}
                    >
                      <div className="kanban-card-top">
                        <span className="kanban-type-icon" title={item.type}>{TYPE_ICON[item.type] ?? '•'}</span>
                        <button
                          className="kanban-delete-btn"
                          title="Delete"
                          onClick={(e) => deleteItem(e, item.id, item.title)}
                        >✕</button>
                      </div>

                      <Link href={`/pm/work-items/${item.id}`} className="kanban-card-title">
                        {item.title}
                      </Link>

                      <div className="kanban-card-footer">
                        <span className="priority-dot" style={{ background: PRIORITY_DOT[item.priority] }} title={item.priority} />
                        <span className="kanban-card-priority">{item.priority}</span>
                        {item.assignee && <span className="kanban-assignee">· {item.assignee}</span>}
                        {total > 0 && (
                          <span className="kanban-qa-badge" style={{ color: passed === total ? '#059669' : '#f59e0b' }}>
                            ✓ {passed}/{total}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
