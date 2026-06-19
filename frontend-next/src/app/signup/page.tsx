'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveToken } from '@/lib/api';

function checkPassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pw),
  };
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const rules = checkPassword(form.password);
  const allRulesMet = Object.values(rules).every(Boolean);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Please enter your full name.'); return; }
    if (!form.email.trim()) { setError('Please enter your email.'); return; }
    if (!allRulesMet) { setError('Password does not meet all requirements.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const result = await api.register(form.name.trim(), form.email.trim(), form.password);
      saveToken(result.accessToken);
      router.push('/pm/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
        <div className="login-title">Create an account</div>
        <div className="login-sub">Join your delivery workspace</div>
        <form onSubmit={submit} className="login-form">
          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Choose a strong password" autoComplete="new-password" />
            {form.password.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { key: 'length', label: 'At least 8 characters' },
                  { key: 'upper', label: 'One uppercase letter (A–Z)' },
                  { key: 'lower', label: 'One lowercase letter (a–z)' },
                  { key: 'number', label: 'One number (0–9)' },
                  { key: 'special', label: 'One special character (!@#$%^&* …)' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: rules[key as keyof typeof rules] ? '#059669' : '#9ca3af' }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{rules[key as keyof typeof rules] ? '✓' : '○'}</span>
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm Password</label>
            <input id="confirm" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
            {form.confirm.length > 0 && form.password !== form.confirm && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Passwords do not match</div>
            )}
          </div>
          {error && <div className="error">{error}</div>}
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
