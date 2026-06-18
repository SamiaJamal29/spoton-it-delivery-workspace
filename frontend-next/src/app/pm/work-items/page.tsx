'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, WorkItem } from '@/lib/api';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#3b82f6', low: '#6b7280',
};
const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280', planned: '#3b82f6', in_progress: '#f59e0b',
  qa: '#8b5cf6', ready_for_release: '#10b981', released: '#059669',
};

export default function WorkItemsPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [myWork, setMyWork] = useState(false);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (myWork) params.myWork = 'true';
    api.workItems.list(params)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusFilter, priorityFilter, myWork]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await api.workItems.delete(id);
    load();
  };

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-title">Work Items</h1>
          <p className="workspace-subtitle">{items.length} items</p>
        </div>
        <Link href="/pm/work-items/new" className="btn btn-primary">+ New Work Item</Link>
      </div>

      <div className="filters">
        <input
          className="filter-input"
          placeholder="Search title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['backlog','planned','in_progress','qa','ready_for_release','released'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select className="filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          {['low','medium','high','urgent'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <label className="filter-checkbox">
          <input type="checkbox" checked={myWork} onChange={(e) => setMyWork(e.target.checked)} />
          My Work
        </label>
      </div>

      {loading && <div className="workspace-loading">Loading…</div>}
      {error && <div className="workspace-error">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>No work items found.</p>
          <Link href="/pm/work-items/new" className="btn btn-primary">Create your first work item</Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="item-list">
          {items.map((item) => (
            <div key={item.id} className="item-row">
              <div className="item-row-main">
                <Link href={`/pm/work-items/${item.id}`} className="item-row-title">
                  {item.title}
                </Link>
                <div className="item-row-meta">
                  <span className="badge" style={{ background: STATUS_COLORS[item.status] }}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                  <span className="badge" style={{ background: PRIORITY_COLORS[item.priority] }}>
                    {item.priority}
                  </span>
                  <span className="item-type">{item.type}</span>
                  {item.assignee && <span className="item-assignee">👤 {item.assignee}</span>}
                  {item.dueDate && <span className="item-due">📅 {item.dueDate}</span>}
                </div>
              </div>
              <div className="item-row-actions">
                <Link href={`/pm/work-items/${item.id}`} className="btn btn-sm">View</Link>
                <Link href={`/pm/work-items/${item.id}/edit`} className="btn btn-sm">Edit</Link>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.title)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
