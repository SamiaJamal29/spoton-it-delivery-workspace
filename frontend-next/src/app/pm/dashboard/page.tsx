'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, WorkItem, ScoreSummary } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
};
const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready', released: 'Released',
};
const STATUSES = ['backlog','planned','in_progress','qa','ready_for_release','released'];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8',
};
const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature', bug: 'Bug', improvement: 'Impr.', maintenance: 'Maint.',
};

function riskScore(item: WorkItem): number {
  let score = 0;
  if (item.priority === 'urgent') score += 40;
  else if (item.priority === 'high') score += 25;
  else if (item.priority === 'medium') score += 10;
  const failed = item.qaChecks?.filter(q => q.status === 'failed').length ?? 0;
  const pending = item.qaChecks?.filter(q => q.status === 'pending').length ?? 0;
  score += failed * 20 + pending * 10;
  if (!item.assignee) score += 15;
  if (item.dueDate && new Date(item.dueDate) < new Date()) score += 30;
  return Math.min(score, 99);
}
function riskColor(score: number) {
  if (score >= 60) return '#ef4444';
  if (score >= 30) return '#f97316';
  return '#10b981';
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'board' | 'analytics'>('board');

  // Kanban scroll drag
  const kanbanRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, startX: 0, scrollLeft: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    const el = kanbanRef.current; if (!el) return;
    drag.current = { on: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onMouseLeave = () => { drag.current.on = false; };
  const onMouseUp = () => { drag.current.on = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.on || !kanbanRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanRef.current.offsetLeft;
    kanbanRef.current.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.5;
  };

  useEffect(() => {
    Promise.all([api.workItems.list(), api.score(), api.me()])
      .then(([wi, sc, me]) => { setItems(wi); setScore(sc); setUser(me); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="workspace-loading">Loading dashboard…</div>;

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const openCount = items.filter(i => i.status !== 'released').length;

  // Analytics data
  const kpis = [
    { label: 'Total Work Items', value: items.length, sub: 'across all stages', color: 'var(--accent)' },
    { label: 'In Progress', value: items.filter(i => i.status === 'in_progress').length, sub: 'being worked on', color: 'var(--s-progress)' },
    { label: 'Pending QA', value: items.filter(i => i.status === 'qa').length, sub: 'need testing', color: 'var(--s-qa)' },
    { label: 'Ready to Ship', value: items.filter(i => i.status === 'ready_for_release').length, sub: 'waiting for release', color: 'var(--s-ready)' },
  ];
  const total = items.length || 1;
  const pipeline = STATUSES.map(s => ({
    label: STATUS_LABEL[s], color: STATUS_COLOR[s],
    count: items.filter(i => i.status === s).length,
    pct: `${Math.round(items.filter(i => i.status === s).length / total * 100)}%`,
  }));
  const attention = items
    .filter(i => i.status !== 'released')
    .map(i => ({ item: i, risk: riskScore(i) }))
    .sort((a, b) => b.risk - a.risk).slice(0, 4);
  const myWork = items.filter(i => i.assignee).slice(0, 5);
  const activity = (score?.events ?? []).slice(0, 6).map(e => ({
    text: e.action.replace(/_/g, ' '), when: relativeTime(e.createdAt), dot: 'var(--s-released)',
  }));

  const openPanel = (id: string) => router.push(`/pm/dashboard?panel=${id}`);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-greeting">{greeting()}, {firstName} 👋</div>
          <div className="dashboard-sub">{today} · {openCount} open work items across the pipeline</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, gap: 2 }}>
            {(['board', 'analytics'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-3)',
                boxShadow: tab === t ? 'var(--shadow)' : 'none',
                transition: 'all .14s',
              }}>{t === 'board' ? '⊞ Board' : '📊 Analytics'}</button>
            ))}
          </div>
          <div className="score-chip">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <div>
              <div className="score-chip-num">{score?.total ?? 0}</div>
              <div className="score-chip-sub">points · Lv 2</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOARD TAB */}
      {tab === 'board' && (
        <div
          className="kanban"
          ref={kanbanRef}
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          style={{ minHeight: 500 }}
        >
          {STATUSES.map(status => {
            const colItems = items.filter(i => i.status === status);
            const col = { color: STATUS_COLOR[status], label: STATUS_LABEL[status] };
            return (
              <div key={status} className="kanban-col">
                <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                  <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-col-count" style={{ background: col.color }}>{colItems.length}</span>
                </div>
                <div className="kanban-cards">
                  {colItems.length === 0 && <div className="kanban-empty">No work items</div>}
                  {colItems.map(item => {
                    const passed = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
                    const totalQa = item.qaChecks?.length ?? 0;
                    return (
                      <div key={item.id} className="kanban-card" style={{ cursor: 'pointer' }} onClick={() => openPanel(item.id)}>
                        <div className="kanban-card-top" style={{ marginBottom: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4 }}>
                            WI-{item.id.slice(-6).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: PRIORITY_COLOR[item.priority] + '22', color: PRIORITY_COLOR[item.priority] }}>
                            {item.priority.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', marginBottom: 8 }}>{item.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-3)' }}>{TYPE_LABEL[item.type] ?? item.type}</span>
                          {item.assignee && (
                            <span title={item.assignee} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginLeft: 'auto' }}>
                              {initials(item.assignee)}
                            </span>
                          )}
                          {totalQa > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: passed === totalQa ? '#16a34a' : '#f59e0b' }}>✓ {passed}/{totalQa}</span>
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
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && (
        <>
          <div className="kpi-grid">
            {kpis.map(k => (
              <div key={k.label} className="kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="kpi-label">{k.label}</span>
                  <span style={{ background: k.color, width: 9, height: 9, borderRadius: '50%', display: 'block' }} />
                </div>
                <div className="kpi-num">{k.value}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-col">
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Delivery pipeline</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {pipeline.map(p => (
                    <div key={p.label} className="pipeline-row">
                      <div className="pipeline-label">
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
                        {p.label}
                      </div>
                      <div className="pipeline-bar-track">
                        <div className="pipeline-bar-fill" style={{ width: p.pct, background: p.color }} />
                      </div>
                      <div className="pipeline-count">{p.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Needs attention</div>
                  <Link href="/pm/readiness" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Readiness board →</Link>
                </div>
                {attention.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>All clear! 🎉</div>}
                {attention.map(({ item, risk }) => {
                  const blockers: { label: string; color: string; bg: string }[] = [];
                  const failed = item.qaChecks?.filter(q => q.status === 'failed').length ?? 0;
                  const pending = item.qaChecks?.filter(q => q.status === 'pending').length ?? 0;
                  if (failed > 0) blockers.push({ label: `${failed} QA failed`, color: '#ef4444', bg: '#fee2e2' });
                  if (pending > 0) blockers.push({ label: `${pending} QA pending`, color: '#f97316', bg: '#fff7ed' });
                  if (!item.assignee) blockers.push({ label: 'Unassigned', color: '#6b7280', bg: '#f3f4f7' });
                  if (item.dueDate && new Date(item.dueDate) < new Date()) blockers.push({ label: 'Overdue', color: '#ef4444', bg: '#fee2e2' });
                  return (
                    <div key={item.id} className="attention-row" onClick={() => openPanel(item.id)}>
                      <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
                        <div className="risk-score" style={{ color: riskColor(risk) }}>{risk}</div>
                        <div className="risk-label">risk</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{item.title}</div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                          {blockers.map(b => <span key={b.label} className="blocker-chip" style={{ color: b.color, background: b.bg }}>{b.label}</span>)}
                          {blockers.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Low risk</span>}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>#{item.id.slice(-4)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-col">
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>My work</div>
                {myWork.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>Nothing assigned. 🎉</div>}
                {myWork.map(item => (
                  <div key={item.id} className="my-work-row" onClick={() => openPanel(item.id)} style={{ textDecoration: 'none' }}>
                    <span className="my-work-dot" style={{ background: STATUS_COLOR[item.status] }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="my-work-title">{item.title}</div>
                      <div className="my-work-status">{STATUS_LABEL[item.status]}</div>
                    </div>
                    {item.dueDate && (
                      <span className="my-work-due" style={{ color: new Date(item.dueDate) < new Date() ? '#ef4444' : 'var(--text-3)' }}>
                        {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Recent activity</div>
                {activity.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No activity yet.</div>}
                {activity.map((a, i) => (
                  <div key={i} className="activity-row">
                    <span className="activity-dot" style={{ background: a.dot }} />
                    <div>
                      <div className="activity-text">{a.text}</div>
                      <div className="activity-when">{a.when}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
