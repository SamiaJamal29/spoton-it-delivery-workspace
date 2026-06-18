'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, WorkItem } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready', released: 'Released',
};
const STATUS_COLOR: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
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
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f97316';
  return '#10b981';
}

function riskLabel(score: number) {
  if (score >= 70) return 'HIGH RISK';
  if (score >= 40) return 'MED RISK';
  return 'LOW RISK';
}

export default function ReadinessPage() {
  const router = useRouter();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.workItems.list()
      .then(data => setItems(data.filter(i => i.status !== 'released')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scored = items
    .map(i => ({ item: i, risk: riskScore(i) }))
    .sort((a, b) => b.risk - a.risk);

  const openPanel = (id: string) => router.push(`/pm/readiness?panel=${id}`);

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div className="page-title">Release Readiness</div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: 'var(--accent-soft)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.08em' }}>RISK ENGINE</span>
          </div>
          <div className="page-sub">Risk scored from priority, failing &amp; missing QA, overdue dates and ownership. Highest risk first — fix the blockers to clear each item for release.</div>
        </div>
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}

      {!loading && scored.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>All clear!</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>No active items to assess.</div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {scored.map(({ item, risk }) => {
          const rc = riskColor(risk);
          const rl = riskLabel(risk);

          const failed  = item.qaChecks?.filter(q => q.status === 'failed').length ?? 0;
          const pending = item.qaChecks?.filter(q => q.status === 'pending').length ?? 0;
          const total   = item.qaChecks?.length ?? 0;

          const blockers: { label: string; color: string; bg: string }[] = [];
          if (failed > 0) blockers.push({ label: `${failed} QA failed`, color: '#ef4444', bg: '#fee2e2' });
          if (pending > 0) blockers.push({ label: `${pending} QA pending`, color: '#f97316', bg: '#fff7ed' });
          if (total === 0) blockers.push({ label: 'No QA checks', color: '#6b7280', bg: 'var(--surface-3)' });
          if (!item.assignee) blockers.push({ label: 'Unassigned', color: '#6b7280', bg: 'var(--surface-3)' });
          if (item.dueDate && new Date(item.dueDate) < new Date()) blockers.push({ label: 'Overdue', color: '#ef4444', bg: '#fee2e2' });

          const shortId = `WI-${item.id.slice(-6).toUpperCase()}`;

          return (
            <div key={item.id}
              onClick={() => openPanel(item.id)}
              style={{
                background: 'var(--surface)', borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: 'var(--shadow)', cursor: 'pointer',
                borderLeft: `3px solid ${rc}`,
                border: `1px solid var(--border)`,
                borderLeftWidth: 3, borderLeftColor: rc,
                transition: 'box-shadow .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
            >
              {/* Risk score */}
              <div style={{ textAlign: 'center', flexShrink: 0, width: 56 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: rc, lineHeight: 1 }}>{risk}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: rc, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{rl}</div>
              </div>

              {/* Center info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{shortId}</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: STATUS_COLOR[item.status] + '22', color: STATUS_COLOR[item.status], whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', marginBottom: 6, maxWidth: 300 }}>
                  <div style={{ height: '100%', borderRadius: 4, background: rc, width: `${risk}%`, transition: 'width .4s' }} />
                </div>
                {/* Blocker chips */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {blockers.map(b => (
                    <span key={b.label} className="blocker-chip" style={{ color: b.color, background: b.bg }}>{b.label}</span>
                  ))}
                  {blockers.length === 0 && <span className="blocker-chip" style={{ color: '#16a34a', background: '#ecfdf5' }}>✓ Clear for release</span>}
                </div>
              </div>

              {/* Chevron */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" flexShrink="0">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
