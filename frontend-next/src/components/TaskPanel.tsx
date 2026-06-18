'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, WorkItem, QaCheck, WorkItemStatus } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
};
const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready for Release', released: 'Released',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280',
};
const MOVE_TO: Record<string, WorkItemStatus[]> = {
  backlog: ['planned'],
  planned: ['in_progress'],
  in_progress: ['qa'],
  qa: ['ready_for_release'],
  ready_for_release: ['released'],
  released: [],
};

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function TaskPanel({ taskId }: { taskId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [item, setItem] = useState<WorkItem | null>(null);
  const [qaChecks, setQaChecks] = useState<QaCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [qaForm, setQaForm] = useState({ title: '', show: false });
  const [qaAdding, setQaAdding] = useState(false);

  const load = async () => {
    try {
      const [wi, checks] = await Promise.all([api.workItems.get(taskId), api.qaChecks.listByWorkItem(taskId)]);
      setItem(wi);
      setQaChecks(checks);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // Trigger animation
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [taskId]);

  const close = () => {
    setVisible(false);
    setTimeout(() => router.replace(pathname), 250);
  };

  const moveStatus = async (status: WorkItemStatus) => {
    if (!item) return;
    try {
      const updated = await api.workItems.update(item.id, { status });
      setItem(updated);
    } catch { /* ignore */ }
  };

  const nextAction = () => {
    if (!item) return null;
    switch (item.status) {
      case 'backlog': return { label: 'Plan this task', next: 'planned' as WorkItemStatus };
      case 'planned': return { label: 'Start development', next: 'in_progress' as WorkItemStatus };
      case 'in_progress': return { label: 'Send to QA', next: 'qa' as WorkItemStatus };
      case 'qa': return { label: 'Mark Ready for Release', next: 'ready_for_release' as WorkItemStatus };
      default: return null;
    }
  };

  const addQaCheck = async () => {
    if (!qaForm.title.trim() || !item) return;
    setQaAdding(true);
    try {
      await api.qaChecks.create({ workItemId: item.id, testTitle: qaForm.title.trim(), status: 'pending' });
      setQaForm({ title: '', show: false });
      await load();
    } finally { setQaAdding(false); }
  };

  const cycleQaStatus = async (check: QaCheck) => {
    const next: Record<string, QaCheck['status']> = { pending: 'passed', passed: 'failed', failed: 'pending' };
    await api.qaChecks.update(check.id, { status: next[check.status] });
    await load();
  };

  const action = nextAction();
  const passed = qaChecks.filter(q => q.status === 'passed').length;
  const shortId = item ? `WI-${item.id.slice(-6).toUpperCase()}` : '';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999,
          opacity: visible ? 1 : 0, transition: 'opacity .25s',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100vh', width: 480, zIndex: 1000,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: '-4px 0 30px rgba(0,0,0,.12)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .25s cubic-bezier(.22,.61,.36,1)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: 32, color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
        ) : !item ? (
          <div style={{ padding: 32, color: 'var(--text-3)' }}>Task not found.</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '2px 7px', borderRadius: 5 }}>{shortId}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: 'var(--surface-3)', color: 'var(--text-2)' }}>{item.type}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: STATUS_COLOR[item.status] + '22', color: STATUS_COLOR[item.status] }}>{STATUS_LABEL[item.status]}</span>
              <div style={{ flex: 1 }} />
              <button onClick={close} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-3)', lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}>×</button>
            </div>

            <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Title */}
              <h2 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, color: 'var(--text)', letterSpacing: '-.02em' }}>{item.title}</h2>

              {/* Smart Next Action */}
              {item.status !== 'released' && (
                <div style={{ background: '#f0effd', borderLeft: '3px solid #5b57d6', borderRadius: '0 10px 10px 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#5b57d6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Smart Next Action</div>
                    {action ? (
                      <button onClick={() => moveStatus(action.next)} style={{ fontSize: 13, fontWeight: 700, color: '#5b57d6', background: 'none', border: '1.5px solid #5b57d6', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
                        {action.label} →
                      </button>
                    ) : item.status === 'ready_for_release' ? (
                      <a href="/pm/releases" style={{ fontSize: 13, fontWeight: 700, color: '#5b57d6' }}>View Releases →</a>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>Shipped ✓</span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.6 }}>{item.description}</div>
                </div>
              )}

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  {
                    label: 'Assignee',
                    content: item.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{initials(item.assignee)}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.assignee}</span>
                      </div>
                    ) : <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Unassigned</span>,
                  },
                  {
                    label: 'Priority',
                    content: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: PRIORITY_COLOR[item.priority], display: 'inline-block' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{item.priority}</span>
                      </div>
                    ),
                  },
                  {
                    label: 'Due Date',
                    content: <span style={{ fontSize: 13, fontWeight: 600, color: item.dueDate && new Date(item.dueDate) < new Date() ? '#ef4444' : 'var(--text)' }}>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>,
                  },
                  {
                    label: 'Created by',
                    content: <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.createdBy || '—'}</span>,
                  },
                ].map(({ label, content }) => (
                  <div key={label} style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
                    {content}
                  </div>
                ))}
              </div>

              {/* QA Checks */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>QA Checks</div>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{passed} / {qaChecks.length} passed</span>
                </div>
                {qaChecks.map(check => (
                  <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{check.testTitle}</div>
                      {check.notes && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{check.notes}</div>}
                    </div>
                    <button onClick={() => cycleQaStatus(check)} style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: check.status === 'passed' ? '#ecfdf5' : check.status === 'failed' ? '#fee2e2' : '#fff7ed',
                      color: check.status === 'passed' ? '#16a34a' : check.status === 'failed' ? '#ef4444' : '#f97316',
                    }}>{check.status}</button>
                  </div>
                ))}
                {qaForm.show ? (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input className="form-input" style={{ flex: 1 }} placeholder="Test title…" value={qaForm.title} onChange={e => setQaForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addQaCheck()} autoFocus />
                    <button className="btn btn-primary btn-sm" onClick={addQaCheck} disabled={qaAdding}>Add</button>
                    <button className="btn btn-sm" onClick={() => setQaForm({ title: '', show: false })}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setQaForm(f => ({ ...f, show: true }))}>+ Add QA check</button>
                )}
              </div>

              {/* Timeline */}
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Created by {item.createdBy || 'unknown'} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>

              {/* Move to */}
              {MOVE_TO[item.status]?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Move to</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {MOVE_TO[item.status].map(s => (
                      <button key={s} onClick={() => moveStatus(s)} style={{
                        fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
                        border: `1.5px solid ${STATUS_COLOR[s]}`, background: STATUS_COLOR[s] + '18',
                        color: STATUS_COLOR[s], cursor: 'pointer',
                      }}>{STATUS_LABEL[s]}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
