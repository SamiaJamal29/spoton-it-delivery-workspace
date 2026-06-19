'use client';

import { useEffect, useState } from 'react';
import { api, Release, WorkItem } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', scheduled: '#3b82f6', deployed: '#10b981', rolled_back: '#ef4444',
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [readyItems, setReadyItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ version: '', releaseDate: '', summary: '', workItemIds: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rels, items] = await Promise.all([
        api.releases.list(),
        api.workItems.list({ status: 'ready_for_release' }),
      ]);
      setReleases(rels);
      setReadyItems(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleWorkItem = (id: string) => {
    setForm((f) => ({
      ...f,
      workItemIds: f.workItemIds.includes(id)
        ? f.workItemIds.filter((x) => x !== id)
        : [...f.workItemIds, id],
    }));
  };

  const createRelease = async () => {
    if (!form.version.trim()) { setFormError('Version is required'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await api.releases.create(form);
      setForm({ version: '', releaseDate: '', summary: '', workItemIds: [] });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const deploy = async (id: string) => {
    if (!confirm('Deploy this release? Linked work items will be marked as released.')) return;
    try {
      await api.releases.update(id, { deploymentStatus: 'deployed' });
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Deploy failed');
    }
  };

  const deleteRelease = async (id: string) => {
    if (!confirm('Delete this release?')) return;
    await api.releases.delete(id);
    await load();
  };

  if (loading) return <div className="workspace-loading">Loading…</div>;
  if (error) return <div className="workspace-error">{error}</div>;

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Releases</div>
          <div className="page-sub">{releases.length} release{releases.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + New Release
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2 className="form-section-title">Create Release</h2>
          {formError && <div className="workspace-error">{formError}</div>}
          <div className="form-group">
            <label className="form-label">Version *</label>
            <input className="form-input" placeholder="e.g. v1.2.0" value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Release Date</label>
            <input className="form-input" type="date" value={form.releaseDate}
              onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Summary</label>
            <textarea className="form-textarea" placeholder="What's in this release?" value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Link Ready Work Items ({readyItems.length} available)</label>
            {readyItems.length === 0 && <p className="form-hint">No items in ready_for_release status yet.</p>}
            {readyItems.map((item) => (
              <label key={item.id} className="checkbox-row">
                <input type="checkbox" checked={form.workItemIds.includes(item.id)}
                  onChange={() => toggleWorkItem(item.id)} />
                <span>{item.title}</span>
                <span className="item-type">{item.priority}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={createRelease} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Release'}
            </button>
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {releases.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No releases yet.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create your first release</button>
        </div>
      )}

      <div className="release-list">
        {releases.map((release) => (
          <div key={release.id} className="release-card">
            <div className="release-card-header">
              <div>
                <div className="release-version">{release.version}</div>
                {release.releaseDate && <div className="release-date">📅 {release.releaseDate}</div>}
              </div>
              <div className="release-card-actions">
                <span className="badge" style={{ background: STATUS_COLORS[release.deploymentStatus] }}>
                  {release.deploymentStatus}
                </span>
                {release.deploymentStatus !== 'deployed' && release.deploymentStatus !== 'rolled_back' && (
                  <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff' }}
                    onClick={() => deploy(release.id)}>
                    Deploy
                  </button>
                )}
                {release.deploymentStatus === 'draft' && (
                  <button className="btn btn-sm btn-danger" onClick={() => deleteRelease(release.id)}>Delete</button>
                )}
              </div>
            </div>
            {release.summary && <p className="release-summary">{release.summary}</p>}
            {release.workItems?.length > 0 && (
              <div className="release-items">
                <label className="release-items-label">Work Items ({release.workItems.length})</label>
                {release.workItems.map((item) => (
                  <div key={item.id} className="release-item-chip">{item.title}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

