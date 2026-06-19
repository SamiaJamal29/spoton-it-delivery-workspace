'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, clearToken, getProjects, getActiveProjectId, saveToken, Project, WorkItem } from '@/lib/api';

const AVATAR_COLORS = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#0ea5e9','#a855f7'];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_COLOR: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
};
const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA', ready_for_release: 'Ready', released: 'Released',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(u => {
      setUser(u);
      setEditName(u.name);
      setEditRole(u.role);
      const savedColor = localStorage.getItem(`spoton_avatar_color_${u.id}`);
      if (savedColor) setAvatarColor(savedColor);
      setProjects(getProjects(u.id));

      const pid = getActiveProjectId();
      return Promise.all([
        api.workItems.list(pid ? { projectId: pid } : {}),
        api.score(),
      ]).then(([items, sc]) => {
        setWorkItems(items);
        setScore(sc.total);
      });
    }).catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  const saveAvatarColor = (color: string) => {
    setAvatarColor(color);
    if (user) localStorage.setItem(`spoton_avatar_color_${user.id}`, color);
  };

  const saveName = async () => {
    if (!editName.trim() || !user) return;
    setSaving(true);
    try {
      const result = await api.updateProfile(editName.trim(), editRole.trim() || undefined);
      saveToken(result.accessToken);
      setUser(result.user);
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const logout = () => { clearToken(); router.push('/login'); };

  if (loading) return <div className="workspace-loading">Loading profile…</div>;
  if (!user) return null;

  const byStatus = (s: string) => workItems.filter(i => i.status === s).length;

  return (
    <div style={{ maxWidth: 860, animation: 'fadeUp .3s ease' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-title">My Profile</div>
        <button className="btn btn-sm btn-danger" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign Out
        </button>
      </div>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: avatarColor, color: '#fff', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${avatarColor}60` }}>
              {initials(user.name)}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 120 }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => saveAvatarColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: avatarColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', transform: avatarColor === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform .1s' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Avatar color</div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ fontSize: 16, fontWeight: 700, maxWidth: 220 }} placeholder="Full name" />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-input" value={editRole} onChange={e => setEditRole(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()} style={{ fontSize: 13, maxWidth: 220 }} placeholder="Job title (e.g. Frontend Developer)" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveName} disabled={saving}>{saving ? '…' : 'Save'}</button>
                  <button className="btn btn-sm" onClick={() => { setEditing(false); setEditName(user.name); setEditRole(user.role); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{user.name}</div>
                <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, padding: '2px 6px', borderRadius: 4 }} title="Edit profile">✏️</button>
              </div>
            )}
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 6 }}>{user.email}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
              {user.role === 'intern' || user.role === 'Member' ? 'Member' : user.role}
            </div>
          </div>

          {/* Score */}
          <div style={{ textAlign: 'center', padding: '12px 24px', background: 'linear-gradient(135deg, var(--accent), #7c79f0)', borderRadius: 12, color: '#fff', minWidth: 110 }}>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 11, opacity: .85, marginTop: 4, fontWeight: 600 }}>POINTS</div>
            <div style={{ fontSize: 10, opacity: .7, marginTop: 2 }}>Level 2 Engineer</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Projects', value: projects.length, icon: '📁' },
          { label: 'Work Items', value: workItems.length, icon: '📋' },
          { label: 'In Progress', value: byStatus('in_progress'), icon: '⚡' },
          { label: 'Released', value: byStatus('released'), icon: '🚀' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Projects */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>My Projects</div>
            <Link href="/pm/projects" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Manage →</Link>
          </div>
          {projects.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>No projects yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Work Items */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Work Items</div>
            <Link href="/pm/work-items" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {workItems.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>No work items yet.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workItems.slice(0, 8).map(item => (
              <Link key={item.id} href={`/pm/work-items/${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, background: 'var(--bg)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[item.status], flexShrink: 0, display: 'inline-block' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{STATUS_LABEL[item.status]}</span>
              </Link>
            ))}
            {workItems.length > 8 && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', paddingTop: 4 }}>+{workItems.length - 8} more</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
