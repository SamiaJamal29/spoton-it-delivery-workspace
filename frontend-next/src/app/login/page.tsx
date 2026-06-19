'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.login(email, password);
      saveToken(result.accessToken);
      // PMs get the full workspace; all other roles get the member-focused view
      const isPM = ['Project Manager', 'Admin'].includes(result.user.role);
      router.push(isPM ? '/pm/projects' : '/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--accent-soft)' }}>
            <div style={{ width: 13, height: 13, borderRadius: '50%', border: '3px solid rgba(255,255,255,.9)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>SpotOn</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Delivery</div>
          </div>
        </div>
        <div className="login-title">Welcome back</div>
        <div className="login-sub">Sign in to your delivery workspace</div>
        <form onSubmit={submit} className="login-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input id="password" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', alignItems: 'center' }} tabIndex={-1}>
                {showPwd
                  ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
            <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
