'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api, clearToken } from '@/lib/api';

type User = { id: string; name: string; email: string; role: string };

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [avatarColor, setAvatarColor] = useState('#5b57d6');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('spoton_theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
    api.me().then(u => {
      setUser(u);
      const color = localStorage.getItem(`spoton_avatar_color_${u.id}`);
      if (color) setAvatarColor(color);
      api.messages.unread().then(setUnread).catch(() => {});
    }).catch(() => router.push('/login'));

    // Poll unread count every 8s
    const t = setInterval(() => api.messages.unread().then(setUnread).catch(() => {}), 8000);
    return () => clearInterval(t);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('spoton_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const logout = () => { clearToken(); router.push('/login'); };

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {/* Top navigation bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Logo */}
          <Link href="/member" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.9)' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)', lineHeight: 1 }}>SpotOn</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Member</div>
            </div>
          </Link>

          {/* Nav links */}
          <nav style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
            {[
              { href: '/member',          label: 'My Tasks' },
              { href: '/member/messages', label: 'Messages' },
            ].map(n => {
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href} style={{ position: 'relative', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--accent)' : 'var(--text-2)', background: active ? 'var(--accent-soft)' : 'transparent', textDecoration: 'none', transition: 'all .12s' }}>
                  {n.label}
                  {n.href === '/member/messages' && unread > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{unread}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Theme toggle */}
          <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
            {theme === 'light'
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            }
          </button>

          {/* User pill */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 24, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials(user.name)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{user.role}</div>
              </div>
              <button onClick={logout} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 28px' }}>
        {children}
      </main>
    </div>
  );
}
