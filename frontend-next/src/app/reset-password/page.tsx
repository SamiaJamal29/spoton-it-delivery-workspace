'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const prefillCode = params.get('code') ?? '';
  const email       = params.get('email') ?? '';

  const [code, setCode]         = useState(prefillCode);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.auth.resetPassword(code.trim(), password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid rgba(255,255,255,.9)' }} />
          </div>
          <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)' }}>SpotOn IT Delivery</div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>Password updated!</h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Redirecting you to login…</p>
              <Link href="/login" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Go to login →</Link>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔑</div>
                <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: '0 0 6px' }}>Set new password</h1>
                {email && <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>For <strong>{email}</strong></p>}
              </div>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Code field (pre-filled but editable) */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Reset code</label>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="6-digit code"
                    required
                    maxLength={6}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 20, fontFamily: 'monospace', fontWeight: 900, letterSpacing: '.2em', textAlign: 'center', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* New password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                      {showPwd
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Confirm password</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${confirm && confirm !== password ? '#fca5a5' : 'var(--border)'}`, background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  />
                  {confirm && password && confirm !== password && (
                    <p style={{ margin: '4px 0 0 2px', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Passwords don't match</p>
                  )}
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>{error}</div>
                )}

                <button type="submit" disabled={loading || password !== confirm} style={{ padding: '13px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: (loading || password !== confirm) ? 'not-allowed' : 'pointer', opacity: (loading || password !== confirm) ? .7 : 1, marginTop: 4 }}>
                  {loading ? 'Updating…' : 'Reset Password'}
                </button>
              </form>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>
                  ← Request a new code
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
