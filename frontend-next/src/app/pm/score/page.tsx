'use client';

import { useEffect, useState } from 'react';
import { api, ScoreSummary } from '@/lib/api';

const LEVEL_THRESHOLDS = [0, 5, 15, 30, 60, 100];
function getLevel(pts: number) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  return Math.min(lvl, LEVEL_THRESHOLDS.length);
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

export default function ScorePage() {
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.score().then(setScore).catch(e => setError(e.message));
  }, []);

  const total = score?.total ?? 0;
  const level = getLevel(total);
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? total;
  const prevThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const pct = nextThreshold > prevThreshold
    ? Math.round(((total - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100;

  return (
    <div style={{ maxWidth: 700, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Score</div>
          <div className="page-sub">Earned by completing meaningful engineering actions</div>
        </div>
      </div>

      {error && <div className="workspace-error">{error}</div>}

      {/* Hero */}
      <div className="score-hero" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Total Points</div>
        <div className="score-hero-num">{total}</div>
        <div style={{ fontSize: 14, opacity: .8, marginTop: 4 }}>Level {level} Engineer</div>

        {/* Progress bar */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: .7, marginBottom: 6 }}>
            <span>Level {level}</span>
            <span>{total} / {nextThreshold} pts → Level {level + 1}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,.8)', borderRadius: 10, transition: 'width .6s' }} />
          </div>
        </div>
      </div>

      {/* How to earn points */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>How to earn points</div>
        {[
          { action: 'Create a work item', pts: 1 },
          { action: 'Move a work item to QA', pts: 1 },
          { action: 'Complete a QA check', pts: 1 },
          { action: 'Move to ready for release', pts: 2 },
          { action: 'Deploy a release', pts: 3 },
        ].map(row => (
          <div key={row.action} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
            <span>{row.action}</span>
            <span style={{ fontWeight: 800, color: 'var(--s-released)' }}>+{row.pts} pt{row.pts > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Activity log</div>
        {!score || score.events.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>No events yet — start creating work items!</div>
        ) : (
          score.events.map(e => (
            <div key={e.id} className="score-event-row">
              <span className="score-event-action">{e.action.replace(/_/g, ' ')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="score-event-time">{relativeTime(e.createdAt)}</span>
                <span className="score-event-pts">+{e.points}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
