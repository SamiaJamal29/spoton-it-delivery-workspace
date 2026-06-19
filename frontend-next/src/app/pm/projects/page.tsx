'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Project, TeamMember, getProjects, saveProjects, getTeam, saveTeam, setActiveProject } from '@/lib/api';

const COLORS = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4'];
const ROLES = ['Developer','Designer','QA Engineer','Product Manager','DevOps','Tech Lead','Analyst'];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProjectsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Record<string, TeamMember[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [form, setForm] = useState({ name: '', color: COLORS[0], description: '' });
  const [memberForm, setMemberForm] = useState<Record<string, { name: string; email: string; role: string }>>({});

  useEffect(() => {
    api.me().then(u => {
      setUserId(u.id);
      const projs = getProjects(u.id);
      setProjects(projs);
      const t: Record<string, TeamMember[]> = {};
      projs.forEach(p => { t[p.id] = getTeam(u.id, p.id); });
      setTeams(t);
    }).catch(() => router.push('/login'));
  }, []);

  const setf = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const createProject = () => {
    if (!form.name.trim()) return;
    const p: Project = { id: `proj_${Date.now()}`, name: form.name.trim(), color: form.color, description: form.description.trim(), createdAt: new Date().toISOString() };
    const updated = [p, ...projects];
    setProjects(updated);
    saveProjects(userId, updated);
    setTeams(t => ({ ...t, [p.id]: [] }));
    setForm({ name: '', color: COLORS[0], description: '' });
    setShowNewProject(false);
    setExpandedId(p.id);
  };

  const deleteProject = (id: string) => {
    if (!confirm('Delete this project and all its settings?')) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    saveProjects(userId, updated);
    if (expandedId === id) setExpandedId(null);
  };

  const openProject = (project: Project) => {
    setActiveProject(userId, project);
    router.push('/pm/dashboard');
  };

  const initMemberForm = (projectId: string) => {
    if (!memberForm[projectId]) setMemberForm(f => ({ ...f, [projectId]: { name: '', email: '', role: ROLES[0] } }));
  };

  const setMf = (projectId: string, field: string, val: string) => {
    setMemberForm(f => {
      const existing = f[projectId] ?? { name: '', email: '', role: ROLES[0] };
      return { ...f, [projectId]: { ...existing, [field]: val } };
    });
  };

  const addMember = (projectId: string) => {
    const mf = memberForm[projectId];
    if (!mf?.name?.trim()) return;
    const member: TeamMember = { id: `mem_${Date.now()}`, name: mf.name.trim(), email: (mf.email ?? '').trim(), role: mf.role ?? ROLES[0] };
    const updated = [...(teams[projectId] ?? []), member];
    setTeams(t => ({ ...t, [projectId]: updated }));
    saveTeam(userId, projectId, updated);
    setMemberForm(f => ({ ...f, [projectId]: { name: '', email: '', role: ROLES[0] } }));
  };

  const removeMember = (projectId: string, memberId: string) => {
    const updated = (teams[projectId] ?? []).filter(m => m.id !== memberId);
    setTeams(t => ({ ...t, [projectId]: updated }));
    saveTeam(userId, projectId, updated);
  };

  return (
    <div style={{ maxWidth: 860, animation: 'fadeUp .3s ease' }}>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <div className="page-title">Projects</div>
          <div className="page-sub">Select a project to start working, or create a new one</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewProject(v => !v)}>+ New Project</button>
      </div>

      {showNewProject && (
        <div className="card" style={{ marginBottom: 24, borderLeft: `4px solid ${form.color}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--text)' }}>New Project</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={e => setf('name', e.target.value)} placeholder="e.g. Mobile Revamp" onKeyDown={e => e.key === 'Enter' && createProject()} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setf('description', e.target.value)} placeholder="What is this project about?" />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setf('color', c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transform: form.color === c ? 'scale(1.25)' : 'scale(1)', transition: 'transform .12s' }} />
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={createProject}>Create Project</button>
              <button className="btn" onClick={() => setShowNewProject(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && !showNewProject && (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 8 }}>📁</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 6 }}>No projects yet</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 20 }}>Create your first project to start organizing your work</div>
          <button className="btn btn-primary" onClick={() => setShowNewProject(true)}>Create your first project</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {projects.map(project => {
          const members = teams[project.id] ?? [];
          const isExpanded = expandedId === project.id;

          return (
            <div key={project.id} className="card" style={{ borderLeft: `4px solid ${project.color}`, padding: 0, overflow: 'hidden' }}>
              {/* Project header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: project.color + '20', border: `2px solid ${project.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 20 }}>📁</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{project.name}</div>
                  {project.description && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{project.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    {/* Team avatars preview */}
                    <div style={{ display: 'flex', gap: -4 }}>
                      {members.slice(0, 5).map((m, i) => (
                        <div key={m.id} title={`${m.name} — ${m.role}`} style={{ width: 24, height: 24, borderRadius: '50%', background: project.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', marginLeft: i > 0 ? -6 : 0, zIndex: members.length - i }}>
                          {initials(m.name)}
                        </div>
                      ))}
                      {members.length > 5 && (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border)', color: 'var(--text-3)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', marginLeft: -6 }}>
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {members.length === 0 ? 'No team members' : `${members.length} member${members.length !== 1 ? 's' : ''}`}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={() => { initMemberForm(project.id); setExpandedId(isExpanded ? null : project.id); }}>
                    {isExpanded ? 'Close' : '👥 Team'}
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={() => openProject(project)}>
                    Open →
                  </button>
                  <button className="btn btn-sm btn-danger" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => deleteProject(project.id)}>✕</button>
                </div>
              </div>

              {/* Team members panel */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '18px 20px', background: 'var(--bg)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Team Members</div>

                  {members.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>No team members yet. Add people below.</div>
                  )}

                  {members.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {members.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: project.color, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {initials(m.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{m.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.role}{m.email ? ` · ${m.email}` : ''}</div>
                          </div>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '4px 6px', borderRadius: 4 }} onClick={() => removeMember(project.id, m.id)} title="Remove member">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="form-input" style={{ fontSize: 13 }} placeholder="Full name *" value={memberForm[project.id]?.name ?? ''} onChange={e => setMf(project.id, 'name', e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember(project.id)} />
                    <input className="form-input" style={{ fontSize: 13 }} placeholder="Email (optional)" value={memberForm[project.id]?.email ?? ''} onChange={e => setMf(project.id, 'email', e.target.value)} />
                    <select className="form-select" style={{ fontSize: 13 }} value={memberForm[project.id]?.role ?? ROLES[0]} onChange={e => setMf(project.id, 'role', e.target.value)}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 13 }} onClick={() => addMember(project.id)}>+ Add Member</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
