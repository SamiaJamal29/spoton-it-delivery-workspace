'use client';

import { useEffect, useState } from 'react';
import { api, Release, WorkItem } from '@/lib/api';

const DEPLOY_COLOR: Record<string, string> = {
  draft: '#6b7280', scheduled: '#3b82f6', deployed: '#10b981', rolled_back: '#ef4444',
};
const DEPLOY_BG: Record<string, string> = {
  draft: '#f3f4f6', scheduled: '#eff6ff', deployed: '#ecfdf5', rolled_back: '#fee2e2',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8',
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
      // fetch ALL ready items for this user — no projectId filter so nothing gets excluded
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

  const toggleItem = (id: string) =>
    setForm(f => ({
      ...f,
      workItemIds: f.workItemIds.includes(id) ? f.workItemIds.filter(x => x !== id) : [...f.workItemIds, id],
    }));

  const selectAll = () => setForm(f => ({ ...f, workItemIds: readyItems.map(i => i.id) }));
  const clearAll  = () => setForm(f => ({ ...f, workItemIds: [] }));

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
  if (error)   return <div className="workspace-error">{error}</div>;

  const alreadyLinkedIds = new Set(releases.flatMap(r => r.workItems?.map(i => i.id) ?? []));
  const unlinkedReady = readyItems.filter(i => !alreadyLinkedIds.has(i.id));

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">Releases</div>
          <div className="page-sub">{releases.length} release{releases.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ New Release'}
        </button>
      </div>

      {/* Ready for Release banner */}
      {unlinkedReady.length > 0 && (
        <div style={{ marginBottom: 20, padding: '16px 18px', borderRadius: 12, background: '#ecfdf5', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🚀</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46', marginBottom: 8 }}>
              {unlinkedReady.length} item{unlinkedReady.length !== 1 ? 's' : ''} ready for release
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {unlinkedReady.map(item => (
                <span key={item.id} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                  {item.title}
                  <span style={{ marginLeft: 5, fontSize: 10, color: PRIORITY_COLOR[item.priority] }}>· {item.priority}</span>
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', flexShrink: 0 }} onClick={() => {
            setForm(f => ({ ...f, workItemIds: unlinkedReady.map(i => i.id) }));
            setShowForm(true);
          }}>
            + New Release with these
          </button>
        </div>
      )}

      {/* New Release Form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Create Release</div>
          {formError && <div className="workspace-error" style={{ marginBottom: 12 }}>{formError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Version *</label>
              <input className="form-input" placeholder="e.g. v1.2.0" value={form.version}
                onChange={e => setForm({ ...form, version: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Release Date</label>
              <input className="form-input" type="date" value={form.releaseDate}
                onChange={e => setForm({ ...form, releaseDate: e.target.value })} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Summary</label>
            <textarea className="form-textarea" placeholder="What's in this release?" value={form.summary}
              onChange={e => setForm({ ...form, summary: e.target.value })} rows={2} />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>Link Work Items ({form.workItemIds.length} selected)</label>
              {readyItems.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={selectAll}>Select all</button>
                  <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={clearAll}>Clear</button>
                </div>
              )}
            </div>

            {readyItems.length === 0 && (
              <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--bg)', border: '1px dashed var(--border)', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
                No work items in "ready for release" status yet. Move tasks to that stage first.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {readyItems.map(item => {
                const selected = form.workItemIds.includes(item.id);
                return (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, background: selected ? 'var(--accent-soft)' : 'var(--bg)', cursor: 'pointer', transition: 'all .12s' }}>
                    <input type="checkbox" checked={selected} onChange={() => toggleItem(item.id)} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[item.priority], background: PRIORITY_COLOR[item.priority] + '18', padding: '2px 7px', borderRadius: 20 }}>{item.priority}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={createRelease} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Release'}
            </button>
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {releases.length === 0 && !showForm && (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No releases yet</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create your first release</button>
        </div>
      )}

      {/* Releases list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {releases.map(release => (
          <div key={release.id} style={{ borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Release header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: release.summary || (release.workItems?.length ?? 0) > 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{release.version}</div>
                {release.releaseDate && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>📅 {release.releaseDate}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: DEPLOY_BG[release.deploymentStatus], color: DEPLOY_COLOR[release.deploymentStatus] }}>
                  {release.deploymentStatus.replace('_', ' ')}
                </span>
                {release.deploymentStatus !== 'deployed' && release.deploymentStatus !== 'rolled_back' && (
                  <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', fontSize: 12 }} onClick={() => deploy(release.id)}>
                    🚀 Deploy
                  </button>
                )}
                {release.deploymentStatus === 'draft' && (
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 12 }} onClick={() => deleteRelease(release.id)}>Delete</button>
                )}
              </div>
            </div>

            {/* Body */}
            {(release.summary || (release.workItems?.length ?? 0) > 0) && (
              <div style={{ padding: '14px 20px' }}>
                {release.summary && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.5 }}>{release.summary}</p>}
                {(release.workItems?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      Work Items ({release.workItems.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {release.workItems.map(item => (
                        <span key={item.id} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
