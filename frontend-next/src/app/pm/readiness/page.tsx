'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, WorkItem } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready', released: 'Released',
};
const STATUS_COLOR: Record<string, string> = {
  backlog: 'var(--s-backlog)', planned: 'var(--s-planned)', in_progress: 'var(--s-progress)',
  qa: 'var(--s-qa)', ready_for_release: 'var(--s-ready)', released: 'var(--s-released)',
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

function riskLabel(score: number) {
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

export default function ReadinessPage() {
  const router = useRouter();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    api.workItems.list()
      .then(data => setItems(data.filter(i => i.status !== 'released')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scored = items
    .map(i => ({ item: i, risk: riskScore(i) }))
    .sort((a, b) => b.risk - a.risk)
    .filter(({ risk }) => {
      if (filter === 'high') return risk >= 60;
      if (filter === 'medium') return risk >= 30 && risk < 60;
      if (filter === 'low') return risk < 30;
      return true;
    });

  const highCount = items.filter(i => riskScore(i) >= 60).length;
  const medCount  = items.filter(i => { const r = riskScore(i); return r >= 30 && r < 60; }).length;
  const lowCount  = items.filter(i => riskScore(i) < 30).length;

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Release Readiness</div>
          <div className="page-sub">{items.length} active items · ranked by risk score</div>
        </div>
      </div>

      {/* Risk summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'all',    label: 'All',    count: items.length, color: 'var(--accent)',   bg: 'var(--accent-soft)' },
          { key: 'high',   label: 'High Risk',   count: highCount, color: '#ef4444', bg: '#fee2e2' },
          { key: 'medium', label: 'Medium Risk',  count: medCount,  color: '#f97316', bg: '#fff7ed' },
          { key: 'low',    label: 'Low Risk',     count: lowCount,  color: '#10b981', bg: '#ecfdf5' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              borderRadius: 10, border: `1.5px solid ${filter === f.key ? f.color : 'var(--border)'}`,
              background: filter === f.key ? f.bg : 'var(--surface)',
              color: filter === f.key ? f.color : 'var(--text-2)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .14s',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 16 }}>{f.count}</span>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}

      {!loading && scored.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>All clear!</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>No items match this filter.</div>
        </div>
      )}

      <div className="readiness-grid">
        {scored.map(({ item, risk }) => {
          const failed  = item.qaChecks?.filter(q => q.status === 'failed').length ?? 0;
          const pending = item.qaChecks?.filter(q => q.status === 'pending').length ?? 0;
          const passed  = item.qaChecks?.filter(q => q.status === 'passed').length ?? 0;
          const total   = item.qaChecks?.length ?? 0;

          const blockers: { label: string; color: string; bg: string }[] = [];
          if (failed > 0) blockers.push({ label: `${failed} QA failed`, color: '#ef4444', bg: '#fee2e2' });
          if (pending > 0) blockers.push({ label: `${pending} QA pending`, color: '#f97316', bg: '#fff7ed' });
          if (total === 0) blockers.push({ label: 'No QA checks', color: '#6b7280', bg: 'var(--surface-3)' });
          if (!item.assignee) blockers.push({ label: 'Unassigned', color: '#6b7280', bg: 'var(--surface-3)' });
          if (item.dueDate && new Date(item.dueDate) < new Date()) blockers.push({ label: 'Overdue', color: '#ef4444', bg: '#fee2e2' });

          const rc = riskColor(risk);

          return (
            <div key={item.id} className="readiness-row" onClick={() => router.push(`/pm/work-items/${item.id}`)}>
              <div className="risk-circle" style={{ background: `${rc}18`, color: rc }}>
                <div className="risk-circle-num">{risk}</div>
                <div className="risk-circle-label">{riskLabel(risk)}</div>
              </div>

              <div className="readiness-info">
                <div className="readiness-title">{item.title}</div>
                <div className="readiness-blockers">
                  {blockers.map(b => (
                    <span key={b.label} className="blocker-chip" style={{ color: b.color, background: b.bg }}>{b.label}</span>
                  ))}
                  {blockers.length === 0 && passed > 0 && (
                    <span className="blocker-chip" style={{ color: '#10b981', background: '#ecfdf5' }}>✓ {passed}/{total} QA passed</span>
                  )}
                </div>
              </div>

              <div className="readiness-status">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: STATUS_COLOR[item.status], fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[item.status], display: 'inline-block' }} />
                  {STATUS_LABEL[item.status]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  {item.priority} priority
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
