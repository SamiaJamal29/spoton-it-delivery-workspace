'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem } from '@/lib/api';

type Column = { key: string; label: string; color: string; isCustom?: boolean };

const DEFAULT_COLS: Column[] = [
  { key: 'backlog',           label: 'Backlog',           color: '#94a3b8' },
  { key: 'planned',           label: 'Planned',           color: '#3b82f6' },
  { key: 'in_progress',       label: 'In Progress',       color: '#6366f1' },
  { key: 'qa',                label: 'QA',                color: '#a855f7' },
  { key: 'ready_for_release', label: 'Ready for Release', color: '#0d9488' },
  { key: 'released',          label: 'Released',          color: '#16a34a' },
];

const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa'],
  released: [],
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#94a3b8',
};
const PRIORITY_BG: Record<string, string> = {
  urgent: '#fef2f2', high: '#fff7ed', medium: '#eff6ff', low: '#f8fafc',
};
const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature', bug: 'Bug', improvement: 'Impr.', maintenance: 'Maint.',
};
const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316'];

const STORAGE_KEY = 'spoton_kanban_cols';

function loadCols(): Column[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : DEFAULT_COLS; }
  catch { return DEFAULT_COLS; }
}
function saveCols(c: Column[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function DragIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
      <circle cx="4" cy="6" r="1.2"/><circle cx="8" cy="6" r="1.2"/>
      <circle cx="4" cy="9" r="1.2"/><circle cx="8" cy="9" r="1.2"/>
    </svg>
  );
}

export default function ItWorkspacePage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [cols, setCols] = useState<Column[]>(DEFAULT_COLS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number>(-1);
  const [selected, setSelected] = useState<string | null>(null);

  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(COLORS[0]);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const kanbanRef = useRef<HTMLDivElement>(null);
  const scrollDrag = useRef({ on: false, startX: 0, scrollLeft: 0 });

  const load = () =>
    api.workItems.list().then(setItems).catch(e => setError(e.message)).finally(() => setLoading(false));

  useEffect(() => { setCols(loadCols()); load(); }, []);

  // Horizontal scroll drag
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.kanban-card')) return;
    const el = kanbanRef.current; if (!el) return;
    scrollDrag.current = { on: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const stopScroll = () => { scrollDrag.current.on = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!scrollDrag.current.on || !kanbanRef.current || dragId) return;
    e.preventDefault();
    const x = e.pageX - kanbanRef.current.offsetLeft;
    kanbanRef.current.scrollLeft = scrollDrag.current.scrollLeft - (x - scrollDrag.current.startX) * 1.5;
  };

  // DnD
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id); setSelected(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onCardDragOver = (e: React.DragEvent, col: string, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setOverCol(col); setDropIndex(idx);
  };
  const onColDragOver = (e: React.DragEvent, col: string, len: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverCol(col); setDropIndex(len);
  };
  const onDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setOverCol(null); setDropIndex(-1);
    if (!dragId) return;
    const item = items.find(i => i.id === dragId);
    if (!item || item.status === targetKey) { setDragId(null); return; }

    const isNative = DEFAULT_COLS.some(c => c.key === targetKey);
    if (isNative) {
      const allowed = VALID_TRANSITIONS[item.status] ?? [];
      if (!allowed.includes(targetKey)) {
        alert(`Cannot move from "${item.status.replace(/_/g,' ')}" → "${targetKey.replace(/_/g,' ')}"\n\nCheck workflow rules.`);
        setDragId(null); return;
      }
      setItems(prev => prev.map(i => i.id === dragId ? { ...i, status: targetKey as WorkItem['status'] } : i));
      setDragId(null);
      try { await api.workItems.update(dragId, { status: targetKey as WorkItem['status'] }); }
      catch { load(); }
    } else {
      setItems(prev => prev.map(i => i.id === dragId ? { ...i, _customCol: targetKey } as WorkItem & { _customCol: string } : i));
      setDragId(null);
    }
  };
  const onDragEnd = () => { setDragId(null); setOverCol(null); setDropIndex(-1); };

  const deleteTask = async (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Delete "${title}"?`)) return;
    setItems(prev => prev.filter(i => i.id !== id));
    if (selected === id) setSelected(null);
    await api.workItems.delete(id);
  };

  const addColumn = () => {
    if (!newColName.trim()) return;
    const c: Column = { key: `custom_${Date.now()}`, label: newColName.trim(), color: newColColor, isCustom: true };
    const updated = [...cols, c];
    setCols(updated); saveCols(updated);
    setNewColName(''); setShowAddCol(false);
  };

  const removeColumn = (key: string) => {
    if (!confirm('Remove this column?')) return;
    const updated = cols.filter(c => c.key !== key);
    setCols(updated); saveCols(updated);
  };

  const quickAdd = async (colKey: string) => {
    if (!quickTitle.trim()) return;
    setQuickSaving(true);
    try {
      const status = DEFAULT_COLS.some(c => c.key === colKey) ? colKey as WorkItem['status'] : 'backlog';
      const task = await api.workItems.create({ title: quickTitle.trim(), status } as Partial<WorkItem> & { status: WorkItem['status'] });
      setItems(prev => [task, ...prev]);
      setQuickTitle(''); setAddingTo(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally { setQuickSaving(false); }
  };

  const byCol = (col: Column) => {
    if (DEFAULT_COLS.some(c => c.key === col.key))
      return items.filter(i => i.status === col.key && !(i as WorkItem & { _customCol?: string })._customCol);
    return items.filter(i => (i as WorkItem & { _customCol?: string })._customCol === col.key);
  };

  if (loading) return <div className="workspace-loading">Loading workspace…</div>;
  if (error) return <div className="workspace-error">Error: {error}</div>;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">IT Delivery Workspace</h1>
          <p className="workspace-subtitle">{items.length} work items · drag cards between columns</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowAddCol(!showAddCol)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Column
          </button>
          <Link href="/pm/work-items/new" className="btn btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New Work Item
          </Link>
        </div>
      </div>

      {showAddCol && (
        <div className="add-col-form">
          <input className="form-input" placeholder="Column name…" value={newColName}
            onChange={e => setNewColName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addColumn()} autoFocus />
          <div className="color-picker">
            {COLORS.map(c => (
              <button key={c} className={`color-dot${newColColor === c ? ' color-dot-selected' : ''}`}
                style={{ background: c }} onClick={() => setNewColColor(c)} />
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={addColumn}>Add</button>
          <button className="btn btn-sm" onClick={() => setShowAddCol(false)}>Cancel</button>
        </div>
      )}

      <div className="kanban" ref={kanbanRef}
        onMouseDown={onMouseDown} onMouseLeave={stopScroll} onMouseUp={stopScroll} onMouseMove={onMouseMove}
      >
        {cols.map(col => {
          const colItems = byCol(col);
          const isOver = overCol === col.key;

          return (
            <div key={col.key} className={`kanban-col${isOver ? ' kanban-col-over' : ''}`}
              onDragOver={e => onColDragOver(e, col.key, colItems.length)}
              onDrop={e => onDrop(e, col.key)}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setOverCol(null); setDropIndex(-1); } }}
            >
              {/* Column header */}
              <div className="kanban-col-header" style={{ background: col.color + '15', borderBottom: `1px solid ${col.color}30` }}>
                <div className="kanban-col-header-left">
                  <span className="kanban-col-dot" style={{ background: col.color }} />
                  <span className="kanban-col-title">{col.label}</span>
                </div>
                <div className="kanban-col-actions">
                  <span className="kanban-col-count" style={{ background: col.color }}>{colItems.length}</span>
                  <button className="col-remove-btn" onClick={() => removeColumn(col.key)} title="Remove column">✕</button>
                </div>
              </div>

              {/* Cards */}
              <div className="kanban-cards">
                {colItems.length === 0 && (
                  <div className={`kanban-empty${isOver ? ' kanban-empty-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOverCol(col.key); setDropIndex(0); }}>
                    <span className="kanban-empty-icon">📭</span>
                    <span>{isOver ? 'Drop here' : 'No items'}</span>
                  </div>
                )}

                {colItems.map((item, idx) => {
                  const passed = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
                  const total = item.qaChecks?.length ?? 0;
                  const isDragging = dragId === item.id;
                  const isSelected = selected === item.id && !isDragging;
                  const showIndicatorBefore = isOver && dropIndex === idx;

                  return (
                    <div key={item.id}>
                      {showIndicatorBefore && <div className="kanban-drop-indicator" />}
                      <div
                        className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}${isSelected ? ' kanban-card-selected' : ''}`}
                        draggable
                        onDragStart={e => onDragStart(e, item.id)}
                        onDragEnd={onDragEnd}
                        onDragOver={e => onCardDragOver(e, col.key, idx)}
                        onClick={() => setSelected(selected === item.id ? null : item.id)}
                      >
                        {/* Colored top bar */}
                        <div className="kanban-card-bar" style={{ background: col.color }} />

                        <div className="kanban-card-body">
                          <div className="kanban-card-top">
                            <span className="kanban-card-id">WI-{item.id.slice(-5).toUpperCase()}</span>
                            <div className="kanban-card-top-right">
                              <span className="kanban-drag-handle"><DragIcon /></span>
                              <button className="kanban-delete-btn" onClick={e => deleteTask(e, item.id, item.title)}>×</button>
                            </div>
                          </div>

                          <Link href={`/pm/work-items/${item.id}`} className="kanban-card-title" onClick={e => e.stopPropagation()}>
                            {item.title}
                          </Link>

                          <div className="kanban-card-footer">
                            <span className="kanban-priority-pill"
                              style={{ color: PRIORITY_COLOR[item.priority], background: PRIORITY_BG[item.priority] }}>
                              {item.priority}
                            </span>
                            <span className="kanban-type-chip">{TYPE_LABEL[item.type] ?? item.type}</span>

                            {item.assignee && (
                              <span className="kanban-assignee-avatar" style={{ background: col.color }} title={item.assignee}>
                                {initials(item.assignee)}
                              </span>
                            )}
                            {total > 0 && (
                              <span className="kanban-qa-badge"
                                style={{ color: passed === total ? '#059669' : '#d97706', background: passed === total ? '#ecfdf5' : '#fffbeb' }}>
                                ✓ {passed}/{total}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drop indicator at bottom */}
                {isOver && dropIndex >= colItems.length && colItems.length > 0 && (
                  <div className="kanban-drop-indicator" />
                )}

                {/* Quick add */}
                {addingTo === col.key ? (
                  <div className="quick-add-form">
                    <input className="quick-add-input" placeholder="Work item title…" value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') quickAdd(col.key); if (e.key === 'Escape') { setAddingTo(null); setQuickTitle(''); } }}
                      autoFocus />
                    <div className="quick-add-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => quickAdd(col.key)} disabled={quickSaving}>
                        {quickSaving ? '…' : 'Add'}
                      </button>
                      <button className="btn btn-sm" onClick={() => { setAddingTo(null); setQuickTitle(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="quick-add-btn" onClick={() => setAddingTo(col.key)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Add work item
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
