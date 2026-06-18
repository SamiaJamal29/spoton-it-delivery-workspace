'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem, QaCheck } from '@/lib/api';

type Row = { item: WorkItem; check: QaCheck };

const STATUS_COLOR: Record<string, string> = { passed: '#10b981', failed: '#ef4444', pending: '#f97316' };
const STATUS_BG: Record<string, string>    = { passed: '#ecfdf5', failed: '#fee2e2', pending: '#fff7ed' };

export default function QaChecksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
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
  }, []);

  const filtered = filter ? rows.filter(r => r.check.status === filter) : rows;
  const passed  = rows.filter(r => r.check.status === 'passed').length;
  const failed  = rows.filter(r => r.check.status === 'failed').length;
  const pending = rows.filter(r => r.check.status === 'pending').length;

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">QA Checks</div>
          <div className="page-sub">{rows.length} checks across all work items</div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: '',        label: 'All',     count: rows.length, color: 'var(--accent)', bg: 'var(--accent-soft)' },
          { key: 'passed',  label: 'Passed',  count: passed,  color: '#10b981', bg: '#ecfdf5' },
          { key: 'failed',  label: 'Failed',  count: failed,  color: '#ef4444', bg: '#fee2e2' },
          { key: 'pending', label: 'Pending', count: pending, color: '#f97316', bg: '#fff7ed' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
            border: `1.5px solid ${filter === f.key ? f.color : 'var(--border)'}`,
            background: filter === f.key ? f.bg : 'var(--surface)',
            color: filter === f.key ? f.color : 'var(--text-2)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .14s',
          }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{f.count}</span>{f.label}
          </button>
        ))}
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>No QA checks found</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Add checks from a work item's detail page.</div>
        </div>
      )}

      <div className="item-list">
        {filtered.map(({ item, check }) => (
          <div key={check.id} className="item-row">
            <div className="item-row-main">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{check.testTitle}</div>
              <div className="item-row-meta">
                <span className="badge" style={{ background: STATUS_COLOR[check.status], color: '#fff' }}>{check.status}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>on</span>
                <Link href={`/pm/work-items/${item.id}`} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{item.title}</Link>
                {check.tester && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {check.tester}</span>}
              </div>
              {check.notes && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{check.notes}</div>}
            </div>
            <Link href={`/pm/work-items/${item.id}`} className="btn btn-sm">View Item</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
