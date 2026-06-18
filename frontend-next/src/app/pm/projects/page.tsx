'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Project = { id: string; name: string; color: string; description: string; createdAt: string };

const STORAGE_KEY = 'spoton_projects';
const COLORS = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];

function loadProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveProjects(p: Project[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', color: COLORS[0], description: '' });

  useEffect(() => { setProjects(loadProjects()); }, []);

  const set = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const createProject = () => {
    if (!form.name.trim()) return;
    const p: Project = { id: `proj_${Date.now()}`, name: form.name.trim(), color: form.color, description: form.description.trim(), createdAt: new Date().toISOString() };
    const updated = [p, ...projects];
    setProjects(updated);
    saveProjects(updated);
    setForm({ name: '', color: COLORS[0], description: '' });
    setShowForm(false);
  };

  const deleteProject = (id: string) => {
    if (!confirm('Delete this project?')) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
  };

  return (
    <div style={{ maxWidth: 900, animation: 'fadeUp .3s ease' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ New Project</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 520 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>New Project</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mobile Revamp" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description" />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => set('color', c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transition: 'transform .12s', transform: form.color === c ? 'scale(1.2)' : 'scale(1)' }} />
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={createProject}>Create Project</button>
              <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>📁</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>No projects yet</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Create a project to group your tasks.</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create your first project</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {projects.map(p => (
          <div key={p.id} className="card" style={{ borderLeft: `4px solid ${p.color}`, cursor: 'pointer', transition: 'box-shadow .15s' }}
            onClick={() => router.push(`/pm/work-items?project=${encodeURIComponent(p.name)}`)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{p.name}</div>
              <button className="btn btn-sm btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={e => { e.stopPropagation(); deleteProject(p.id); }}>✕</button>
            </div>
            {p.description && <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>{p.description}</div>}
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
              Created {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Click to view tasks →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
