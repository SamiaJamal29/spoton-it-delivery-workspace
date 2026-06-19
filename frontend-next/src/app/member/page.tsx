'use client';

import { useEffect, useRef, useState } from 'react';
import { api, WorkItem } from '@/lib/api';

/* ── Constants ──────────────────────────────────── */

type ColId = 'todo' | 'inprogress' | 'done';

const COLS: { id: ColId; label: string; statuses: WorkItem['status'][]; accent: string; locked?: true }[] = [
  { id: 'todo',       label: 'To Do',       statuses: ['backlog', 'planned'],                        accent: '#64748b' },
  { id: 'inprogress', label: 'In Progress',  statuses: ['in_progress'],                              accent: '#f59e0b' },
  { id: 'done',       label: 'Done',         statuses: ['qa', 'ready_for_release', 'released'],      accent: '#10b981', locked: true },
];

const STATUS_CHIP: Record<string, { label: string; color: string }> = {
  backlog:           { label: 'Backlog',     color: '#64748b' },
  planned:           { label: 'Planned',     color: '#3b82f6' },
  in_progress:       { label: 'Working',     color: '#f59e0b' },
  qa:                { label: 'In QA',       color: '#a855f7' },
  ready_for_release: { label: 'Ready',       color: '#0d9488' },
  released:          { label: 'Released',    color: '#16a34a' },
};

const PRIORITY_PILL: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8',
};

const TYPE_ICON: Record<string, string> = {
  feature: '✨', bug: '🐛', improvement: '⚡', maintenance: '🔧',
};

function dueLabel(d: string | null | undefined) {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, red: true };
  if (days === 0) return { text: 'Due today', red: false };
  if (days === 1) return { text: 'Due tomorrow', red: false };
  return { text: `${days}d left`, red: false };
}

function colOf(item: WorkItem): ColId {
  return COLS.find(c => c.statuses.includes(item.status))?.id ?? 'todo';
}

/* ── Component ──────────────────────────────────── */

export default function MemberKanban() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag state
  const [dragging, setDragging]   = useState<WorkItem | null>(null);
  const [overCol, setOverCol]     = useState<ColId | null>(null);
  const enterCount                = useRef<Partial<Record<ColId, number>>>({});

  // Optimistic overlay
  const [moving, setMoving]       = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  /* load */
  const load = async () => {
    const data = await api.workItems.assignedToMe();
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  /* ── Drag handlers ── */
  const onDragStart = (e: React.DragEvent, item: WorkItem) => {
    if (item.status === 'qa' || item.status === 'ready_for_release' || item.status === 'released') {
      e.preventDefault(); return;            // locked — PM owns these
    }
    setDragging(item);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent ghost (optional; remove if you prefer the default)
    const ghost = document.createElement('div');
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const onDragEnter = (e: React.DragEvent, col: ColId) => {
    e.preventDefault();
    enterCount.current[col] = (enterCount.current[col] ?? 0) + 1;
    if (!dragging) return;
    const from = colOf(dragging);
    if (from === col || col === 'todo') return;
    setOverCol(col);
  };

  const onDragLeave = (_e: React.DragEvent, col: ColId) => {
    enterCount.current[col] = Math.max(0, (enterCount.current[col] ?? 1) - 1);
    if (enterCount.current[col] === 0) setOverCol(v => v === col ? null : v);
  };

  const onDragOver = (e: React.DragEvent, col: ColId) => {
    e.preventDefault();
    if (!dragging) return;
    const from = colOf(dragging);
    if (from === col || col === 'todo') { e.dataTransfer.dropEffect = 'none'; return; }
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, col: ColId) => {
    e.preventDefault();
    enterCount.current = {};
    setOverCol(null);
    if (!dragging || colOf(dragging) === col || col === 'todo') { setDragging(null); return; }

    const item = dragging;
    setDragging(null);
    setMoving(item.id);

    // Optimistic UI — move card immediately
    const nextStatus: WorkItem['status'] = col === 'inprogress' ? 'in_progress' : 'qa';
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));

    try {
      if (col === 'inprogress') {
        if (item.status === 'backlog') await api.workItems.update(item.id, { status: 'planned' });
        await api.workItems.update(item.id, { status: 'in_progress' });
      } else {
        // → done (qa)
        if (item.status === 'backlog') {
          await api.workItems.update(item.id, { status: 'planned' });
          await api.workItems.update(item.id, { status: 'in_progress' });
        } else if (item.status === 'planned') {
          await api.workItems.update(item.id, { status: 'in_progress' });
        }
        await api.workItems.update(item.id, { status: 'qa' });
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 3500);
      }
    } catch {
      // Revert optimistic update
      await load();
    } finally {
      setMoving(null);
    }
  };

  const onDragEnd = () => { setDragging(null); setOverCol(null); enterCount.current = {}; };

  /* ── Render ── */
  if (loading) return (
    <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Loading your board…</div>
    </div>
  );

  const colItems = (col: typeof COLS[number]) =>
    items.filter(i => col.statuses.includes(i.status));

  const totalDone    = items.filter(i => i.status === 'released').length;
  const totalActive  = items.filter(i => i.status === 'in_progress').length;
  const totalOverdue = items.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'released').length;

  return (
    <div style={{ animation: 'fadeUp .3s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)', margin: 0 }}>My Board</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>Drag cards to update your progress. PM takes over when you move to Done.</p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-3)' }}>
          <span><strong style={{ color: 'var(--text)' }}>{totalActive}</strong> active</span>
          <span><strong style={{ color: '#10b981' }}>{totalDone}</strong> done</span>
          {totalOverdue > 0 && <span><strong style={{ color: '#ef4444' }}>{totalOverdue}</strong> overdue</span>}
        </div>
      </div>

      {/* Celebration banner */}
      {celebrate && (
        <div style={{ marginBottom: 20, padding: '14px 20px', borderRadius: 14, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeUp .3s ease', boxShadow: '0 4px 20px #10b98140' }}>
          <span style={{ fontSize: 28 }}>🎉</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Task moved to Done — great work!</div>
            <div style={{ fontSize: 12, opacity: .88, marginTop: 2 }}>Your PM will now run QA and handle the release. You can keep going.</div>
          </div>
        </div>
      )}

      {/* Empty board */}
      {items.length === 0 && (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No tasks assigned yet</div>
          <div style={{ fontSize: 13 }}>Your PM hasn't assigned you anything yet. Check back soon!</div>
        </div>
      )}

      {/* Kanban grid */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
          {COLS.map(col => {
            const list    = colItems(col);
            const isOver  = overCol === col.id;
            const canDrop = col.id !== 'todo' && !!dragging && colOf(dragging) !== col.id;

            return (
              <div
                key={col.id}
                onDragEnter={e => onDragEnter(e, col.id)}
                onDragLeave={e => onDragLeave(e, col.id)}
                onDragOver={e => onDragOver(e, col.id)}
                onDrop={e => onDrop(e, col.id)}
                style={{
                  borderRadius: 16,
                  border: `2px solid ${isOver && canDrop ? col.accent : 'var(--border)'}`,
                  background: isOver && canDrop ? col.accent + '0d' : 'var(--surface)',
                  minHeight: 360,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                {/* Column header */}
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.accent, flexShrink: 0 }} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{col.label}</span>
                  {col.locked && (
                    <span style={{ fontSize: 10, color: col.accent, background: col.accent + '18', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>PM</span>
                  )}
                  <div style={{ marginLeft: 'auto', minWidth: 22, height: 22, borderRadius: '50%', background: col.accent + '20', color: col.accent, fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {list.length}
                  </div>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Empty column hint */}
                  {list.length === 0 && !isOver && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
                      <div style={{ border: `2px dashed ${col.accent}40`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, marginBottom: 6, opacity: .6 }}>
                          {col.id === 'todo' ? '📌' : col.id === 'inprogress' ? '⚡' : '✅'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                          {col.id === 'todo' ? 'No tasks yet' : col.id === 'inprogress' ? 'Drag here to start' : 'Drag here when done'}
                        </div>
                      </div>
                    </div>
                  )}

                  {list.map(item => {
                    const chip    = STATUS_CHIP[item.status];
                    const due     = dueLabel(item.dueDate);
                    const locked  = col.locked;
                    const isMoving = moving === item.id;
                    const isDraggingThis = dragging?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable={!locked}
                        onDragStart={e => onDragStart(e, item)}
                        onDragEnd={onDragEnd}
                        style={{
                          background: 'var(--bg)',
                          borderRadius: 12,
                          border: `1px solid ${due?.red ? '#fca5a5' : 'var(--border)'}`,
                          padding: '12px 14px',
                          cursor: locked ? 'default' : 'grab',
                          opacity: isMoving ? .35 : isDraggingThis ? .45 : 1,
                          transition: 'opacity .15s, box-shadow .15s',
                          boxShadow: isDraggingThis ? '0 10px 30px rgba(0,0,0,.18)' : '0 1px 4px rgba(0,0,0,.04)',
                          userSelect: 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Drag handle hint */}
                        {!locked && (
                          <div style={{ position: 'absolute', top: 10, right: 10, color: 'var(--text-3)', fontSize: 13, lineHeight: 1, letterSpacing: '.05em', opacity: .4 }}>⠿</div>
                        )}

                        {/* Top row: type + priority */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                          <span style={{ fontSize: 14 }}>{TYPE_ICON[item.type] ?? '📄'}</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: PRIORITY_PILL[item.priority], background: PRIORITY_PILL[item.priority] + '1a', padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                            {item.priority}
                          </span>
                          {locked && chip && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: chip.color, background: chip.color + '18', padding: '2px 7px', borderRadius: 20 }}>
                              {chip.label}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div style={{ fontWeight: 700, fontSize: 13, color: locked ? 'var(--text-2)' : 'var(--text)', lineHeight: 1.4, marginBottom: 10, paddingRight: locked ? 0 : 20 }}>
                          {item.title}
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {due && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: due.red ? '#ef4444' : 'var(--text-3)', background: due.red ? '#fef2f2' : 'var(--surface)', border: `1px solid ${due.red ? '#fecaca' : 'var(--border)'}`, padding: '2px 7px', borderRadius: 6 }}>
                              {due.red ? '⚠ ' : '📅 '}{due.text}
                            </span>
                          )}
                          {locked ? (
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>🔒 PM reviewing</span>
                          ) : (
                            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>drag to move</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Drop zone highlight */}
                  {isOver && canDrop && (
                    <div style={{ borderRadius: 12, border: `2px dashed ${col.accent}`, background: col.accent + '0a', padding: '18px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: col.accent, marginTop: 2 }}>
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
