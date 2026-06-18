'use client';

import { useEffect, useState } from 'react';
import { api, WorkItem, QaCheck } from '@/lib/api';

type Row = { item: WorkItem; check: QaCheck };

const STATUS_COLOR: Record<string, string> = { passed: '#16a34a', failed: '#ef4444', pending: '#f97316' };
const STATUS_BG: Record<string, string>    = { passed: '#ecfdf5', failed: '#fee2e2', pending: '#fff7ed' };
const NEXT_STATUS: Record<string, QaCheck['status']> = { pending: 'passed', passed: 'failed', failed: 'pending' };

export default function QaChecksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.workItems.list()
      .then(items => {
        const all: Row[] = [];
        items.forEach(item => {
          (item.qaChecks ?? []).forEach(check => all.push({ item, check }));
        });
        setRows(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cycleStatus = async (check: QaCheck) => {
    await api.qaChecks.update(check.id, { status: NEXT_STATUS[check.status] });
    load();
  };

  const passed  = rows.filter(r => r.check.status === 'passed').length;
  const failed  = rows.filter(r => r.check.status === 'failed').length;
  const pending = rows.filter(r => r.check.status === 'pending').length;

  return (
    <div style={{ maxWidth: 1000, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">QA Checks</div>
          <div className="page-sub">Every test across the workspace. Click a status to cycle pending → passed → failed.</div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
        <div style={{ flex: 1, background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>✓</span>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>{passed}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Passed</div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⏳</span>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>{pending}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>Pending</div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>✗</span>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{failed}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Failed</div>
          </div>
        </div>
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>No QA checks found</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Add checks from a task&apos;s detail page.</div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
                {['TEST / WORK ITEM', 'EXPECTED', 'ACTUAL', 'TESTER', 'STATUS'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, check }) => (
                <tr key={check.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{check.testTitle}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      WI-{item.id.slice(-6).toUpperCase()} · {item.title}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', maxWidth: 160 }}>
                    {check.expectedResult || <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', maxWidth: 160 }}>
                    {check.actualResult || <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {check.tester || <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => cycleStatus(check)} style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: STATUS_BG[check.status], color: STATUS_COLOR[check.status],
                      transition: 'opacity .14s',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[check.status], display: 'inline-block' }} />
                      {check.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
