'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, WorkItem, QaCheck, WorkItemStatus } from '@/lib/api';

const NEXT_STATUSES: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['planned'],
  planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'],
  qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa'],
  released: [],
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280', planned: '#3b82f6', in_progress: '#f59e0b',
  qa: '#8b5cf6', ready_for_release: '#10b981', released: '#059669',
};
const QA_COLORS: Record<string, string> = { pending: '#f59e0b', passed: '#10b981', failed: '#ef4444' };

export default function WorkItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<WorkItem | null>(null);
  const [qaChecks, setQaChecks] = useState<QaCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');

  // New QA form
  const [showQaForm, setShowQaForm] = useState(false);
  const [qaForm, setQaForm] = useState({ testTitle: '', expectedResult: '', tester: '', notes: '' });
  const [qaSubmitting, setQaSubmitting] = useState(false);

  const load = async () => {
    try {
      const [wi, checks] = await Promise.all([
        api.workItems.get(id),
        api.qaChecks.listByWorkItem(id),
      ]);
      setItem(wi);
      setQaChecks(checks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const moveStatus = async (status: WorkItemStatus) => {
    setStatusError('');
    try {
      const updated = await api.workItems.update(id, { status });
      setItem(updated);
    } catch (e: unknown) {
      setStatusError(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const updateQaStatus = async (checkId: string, status: QaCheck['status']) => {
    await api.qaChecks.update(checkId, { status });
    await load();
  };

  const deleteQaCheck = async (checkId: string) => {
    if (!confirm('Delete this QA check?')) return;
    await api.qaChecks.delete(checkId);
    await load();
  };

  const submitQaCheck = async () => {
    if (!qaForm.testTitle) return;
    setQaSubmitting(true);
    try {
      await api.qaChecks.create({ ...qaForm, workItemId: id });
      setQaForm({ testTitle: '', expectedResult: '', tester: '', notes: '' });
      setShowQaForm(false);
      await load();
    } finally {
      setQaSubmitting(false);
    }
  };

  const deleteItem = async () => {
    if (!confirm('Delete this work item?')) return;
    await api.workItems.delete(id);
    router.push('/pm/work-items');
  };

  if (loading) return <div className="workspace-loading">Loading…</div>;
  if (error) return <div className="workspace-error">Error: {error}</div>;
  if (!item) return null;

  const nextStatuses = NEXT_STATUSES[item.status] ?? [];
  const passedCount = qaChecks.filter(q => q.status === 'passed').length;

  return (
    <div className="workspace">
      <div className="detail-nav">
        <Link href="/pm/work-items" className="back-link">← Work Items</Link>
        <div className="detail-nav-actions">
          <Link href={`/pm/work-items/${id}/edit`} className="btn btn-sm">Edit</Link>
          <button className="btn btn-sm btn-danger" onClick={deleteItem}>Delete</button>
        </div>
      </div>

      <div className="detail-header">
        <div>
          <div className="detail-meta-row">
            <span className="badge" style={{ background: STATUS_COLORS[item.status] }}>
              {item.status.replace(/_/g, ' ')}
            </span>
            <span className="detail-type">{item.type}</span>
            <span className="detail-priority">Priority: {item.priority}</span>
          </div>
          <h1 className="detail-title">{item.title}</h1>
          {item.description && <p className="detail-description">{item.description}</p>}
        </div>
      </div>

      <div className="detail-info-grid">
        {item.assignee && <div className="info-item"><label>Assignee</label><span>{item.assignee}</span></div>}
        {item.dueDate && <div className="info-item"><label>Due Date</label><span>{item.dueDate}</span></div>}
        <div className="info-item"><label>Created</label><span>{new Date(item.createdAt).toLocaleDateString()}</span></div>
        <div className="info-item"><label>Updated</label><span>{new Date(item.updatedAt).toLocaleDateString()}</span></div>
      </div>

      {nextStatuses.length > 0 && (
        <div className="status-actions">
          <label className="status-actions-label">Move to:</label>
          {nextStatuses.map((s) => (
            <button key={s} className="btn btn-sm btn-outline" onClick={() => moveStatus(s)}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
      {statusError && <div className="workspace-error">{statusError}</div>}

      {/* QA Checks Section */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">
            QA Checks
            <span className="qa-progress"> ({passedCount}/{qaChecks.length} passed)</span>
          </h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowQaForm(!showQaForm)}>
            + Add Check
          </button>
        </div>

        {showQaForm && (
          <div className="qa-form">
            <input
              className="form-input"
              placeholder="Test title *"
              value={qaForm.testTitle}
              onChange={(e) => setQaForm({ ...qaForm, testTitle: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Expected result"
              value={qaForm.expectedResult}
              onChange={(e) => setQaForm({ ...qaForm, expectedResult: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="Tester name"
              value={qaForm.tester}
              onChange={(e) => setQaForm({ ...qaForm, tester: e.target.value })}
            />
            <textarea
              className="form-textarea"
              placeholder="Notes"
              value={qaForm.notes}
              onChange={(e) => setQaForm({ ...qaForm, notes: e.target.value })}
            />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={submitQaCheck} disabled={qaSubmitting}>
                {qaSubmitting ? 'Saving…' : 'Save Check'}
              </button>
              <button className="btn" onClick={() => setShowQaForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {qaChecks.length === 0 && !showQaForm && (
          <div className="empty-state-sm">No QA checks yet. Add one to enable release readiness.</div>
        )}

        {qaChecks.map((check) => (
          <div key={check.id} className="qa-check-row">
            <div className="qa-check-info">
              <span className="qa-check-title">{check.testTitle}</span>
              {check.expectedResult && (
                <span className="qa-check-detail">Expected: {check.expectedResult}</span>
              )}
              {check.tester && <span className="qa-check-detail">Tester: {check.tester}</span>}
            </div>
            <div className="qa-check-actions">
              <span className="badge" style={{ background: QA_COLORS[check.status] }}>{check.status}</span>
              {check.status !== 'passed' && (
                <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff' }}
                  onClick={() => updateQaStatus(check.id, 'passed')}>Pass</button>
              )}
              {check.status !== 'failed' && (
                <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff' }}
                  onClick={() => updateQaStatus(check.id, 'failed')}>Fail</button>
              )}
              {check.status !== 'pending' && (
                <button className="btn btn-sm"
                  onClick={() => updateQaStatus(check.id, 'pending')}>Reset</button>
              )}
              <button className="btn btn-sm btn-danger" onClick={() => deleteQaCheck(check.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
