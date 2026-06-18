'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem } from '@/lib/api';

const STATUS_COLS: { key: WorkItem['status']; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: '#6b7280' },
  { key: 'planned', label: 'Planned', color: '#3b82f6' },
  { key: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { key: 'qa', label: 'QA', color: '#8b5cf6' },
  { key: 'ready_for_release', label: 'Ready', color: '#10b981' },
  { key: 'released', label: 'Released', color: '#059669' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

export default function ItWorkspacePage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.workItems.list()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = (status: WorkItem['status']) => items.filter((i) => i.status === status);

  if (loading) return <div className="workspace-loading">Loading workspace…</div>;
  if (error) return <div className="workspace-error">Error: {error}</div>;

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">IT Delivery Workspace</h1>
          <p className="workspace-subtitle">{items.length} work items across all stages</p>
        </div>
        <Link href="/pm/work-items/new" className="btn btn-primary">+ New Work Item</Link>
      </div>

      <div className="kanban">
        {STATUS_COLS.map((col) => {
          const colItems = byStatus(col.key);
          return (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{colItems.length}</span>
              </div>
              <div className="kanban-cards">
                {colItems.length === 0 && (
                  <div className="kanban-empty">No items</div>
                )}
                {colItems.map((item) => (
                  <Link key={item.id} href={`/pm/work-items/${item.id}`} className="kanban-card">
                    <div className="kanban-card-title">{item.title}</div>
                    <div className="kanban-card-meta">
                      <span className="badge" style={{ background: PRIORITY_COLORS[item.priority] }}>
                        {item.priority}
                      </span>
                      <span className="kanban-card-type">{item.type}</span>
                    </div>
                    {item.assignee && (
                      <div className="kanban-card-assignee">👤 {item.assignee}</div>
                    )}
                    {item.qaChecks && item.qaChecks.length > 0 && (
                      <div className="kanban-card-qa">
                        ✓ {item.qaChecks.filter(q => q.status === 'passed').length}/{item.qaChecks.length} QA
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
