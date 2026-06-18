'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setMessage('error:Please fill in all fields.');
      return;
    }
    if (form.password !== form.confirm) {
      setMessage('error:Passwords do not match.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    setMessage('demo:Demo mode — use: intern@spoton.test / intern123 to sign in');
  }

  const isError = message.startsWith('error:');
  const isDemo = message.startsWith('demo:');
  const displayMsg = message.replace(/^(error|demo):/, '');

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
        <div className="login-title">Create an account</div>
        <div className="login-sub">Join your delivery workspace</div>
        <form onSubmit={submit} className="login-form">
          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Choose a password" />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat password" />
          </div>
          {isError && <div className="error">{displayMsg}</div>}
          {isDemo && (
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {displayMsg}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
