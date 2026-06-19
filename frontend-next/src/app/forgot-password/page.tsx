'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [step, setStep]     = useState<'email' | 'code'>('email');
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res.code) {
        setCode(res.code); // dev mode: code returned in response
      }
      setStep('code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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

          {step === 'email' ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: '0 0 6px' }}>Forgot your password?</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Enter your email and we'll send you a reset code.</p>
              </div>

              <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>{error}</div>
                )}

                <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1 }}>
                  {loading ? 'Sending…' : 'Send Reset Code'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📬</div>
                <h1 style={{ fontWeight: 900, fontSize: 20, color: 'var(--text)', margin: '0 0 6px' }}>Check your reset code</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 4px' }}>
                  A reset code was generated for <strong>{email}</strong>.
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>In production this would be sent by email.</p>
              </div>

              {/* Dev mode: show the code */}
              {code && (
                <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>🔑 Your Reset Code (dev mode)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 34, fontWeight: 900, color: '#166534', letterSpacing: '.18em' }}>{code}</div>
                  <div style={{ fontSize: 11, color: '#4ade80', marginTop: 6, fontWeight: 600 }}>Expires in 15 minutes</div>
                </div>
              )}

              <Link href={`/reset-password?code=${code}&email=${encodeURIComponent(email)}`} style={{ display: 'block', padding: '13px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                Continue to Reset Password →
              </Link>
            </>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link href="/login" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
