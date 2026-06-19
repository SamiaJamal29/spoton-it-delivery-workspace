'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Member = { id: string; name: string; email: string; role: string; createdAt: string };

const ROLE_OPTIONS = ['Member', 'Project Manager', 'Developer', 'Designer', 'QA Engineer', 'DevOps'];

const ROLE_COLOR: Record<string, string> = {
  'Member':          '#6b7280',
  'Project Manager': '#5b57d6',
  'Developer':       '#3b82f6',
  'Designer':        '#ec4899',
  'QA Engineer':     '#a855f7',
  'DevOps':          '#0d9488',
};

function roleColor(role: string) {
  return ROLE_COLOR[role] ?? '#6b7280';
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_PALETTE = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#0ea5e9','#a855f7'];
function avatarColor(id: string) {
  let n = 0; for (const c of id) n += c.charCodeAt(0);
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Member' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string; role: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetShowPwd, setResetShowPwd] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setMembers(await api.members.list());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim())     { setFormError('Name is required'); return; }
    if (!form.email.trim())    { setFormError('Email is required'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await api.members.create(form);
      setCreated({ ...form });
      setForm({ name: '', email: '', password: '', role: 'Member' });
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to create member');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    if (!resetTarget || resetPwd.length < 6) { setResetError('Password must be at least 6 characters'); return; }
    setResetting(true); setResetError('');
    try {
      await api.members.resetPassword(resetTarget.id, resetPwd);
      setResetDone(resetPwd);
      setResetPwd('');
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="workspace-loading">Loading…</div>;
  if (error)   return <div className="workspace-error">{error}</div>;

  return (
    <div style={{ maxWidth: 860, animation: 'fadeUp .3s ease' }}>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="page-title">Team Members</div>
          <div className="page-sub">{members.length} account{members.length !== 1 ? 's' : ''} in workspace</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setFormError(''); setCreated(null); }}>
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {/* Success credential card */}
      {created && (
        <div style={{ marginBottom: 20, padding: '18px 20px', borderRadius: 14, background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#065f46' }}>Account created! Share these credentials with {created.name}:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Email',    value: created.email },
              { label: 'Password', value: created.password },
              { label: 'Role',     value: created.role },
            ].map(f => (
              <div key={f.label} style={{ background: '#fff', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#065f46', fontFamily: 'monospace' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setCreated(null)} style={{ marginTop: 12, fontSize: 12, color: '#065f46', background: 'none', border: 'none', cursor: 'pointer', opacity: .7 }}>Dismiss</button>
        </div>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => { if (e.target === e.currentTarget) { setResetTarget(null); setResetDone(null); setResetPwd(''); setResetError(''); } }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '32px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>Reset Password</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>Set a new password for <strong>{resetTarget.name}</strong></div>

            {resetDone ? (
              <div>
                <div style={{ padding: '16px 20px', borderRadius: 12, background: '#ecfdf5', border: '1px solid #6ee7b7', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>✅ Password updated! Share with {resetTarget.name.split(' ')[0]}:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 900, color: '#047857', background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid #a7f3d0' }}>{resetDone}</div>
                </div>
                <button onClick={() => { setResetTarget(null); setResetDone(null); }} style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>New password (min. 6 characters)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={resetShowPwd ? 'text' : 'password'}
                      value={resetPwd}
                      onChange={e => { setResetPwd(e.target.value); setResetError(''); }}
                      placeholder="Enter new password"
                      style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setResetShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, fontWeight: 700 }}>
                      {resetShowPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {resetError && <div style={{ fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>{resetError}</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={submitReset} disabled={resetting || resetPwd.length < 6} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: (resetting || resetPwd.length < 6) ? 'not-allowed' : 'pointer', opacity: (resetting || resetPwd.length < 6) ? .6 : 1 }}>
                    {resetting ? 'Saving…' : 'Save New Password'}
                  </button>
                  <button onClick={() => { setResetTarget(null); setResetPwd(''); setResetError(''); }} style={{ padding: '11px 20px', borderRadius: 12, background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Create Member Account</div>
          {formError && <div className="workspace-error" style={{ marginBottom: 12 }}>{formError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="e.g. Sara Ahmed" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="sara@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>
                  {showPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Account'}
            </button>
            <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Members table */}
      {members.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No members yet</div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add your first member</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => {
            const color = avatarColor(m.id);
            const rc = roleColor(m.role);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', transition: 'box-shadow .15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: color, color: '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${color}40` }}>
                  {initials(m.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{m.email}</div>
                </div>

                {/* Role badge */}
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, background: rc + '15', color: rc, border: `1px solid ${rc}30`, flexShrink: 0 }}>
                  {m.role}
                </span>

                {/* Joined */}
                <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>Joined</div>
                  <div>{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>

                {/* Reset password */}
                <button
                  onClick={() => { setResetTarget(m); setResetDone(null); setResetPwd(''); setResetError(''); }}
                  title="Reset password"
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Reset
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
