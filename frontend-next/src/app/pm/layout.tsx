'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { api, clearToken } from '@/lib/api';
import TaskPanel from '@/components/TaskPanel';

type User = { id: string; name: string; email: string; role: string };

const NAV = [
  { href: '/pm/dashboard',  label: 'Dashboard',  icon: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       badgeKey: '' },
  { href: '/pm/projects',   label: 'Projects',   icon: 'M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 6.7A1 1 0 0011.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    badgeKey: 'projects' },
  { href: '/pm/work-items', label: 'Work Items',      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       badgeKey: 'workItems' },
  { href: '/pm/qa-checks',  label: 'QA Checks',  icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',                                                                                                                                                                                                                                                                                                                                                                                                                                        badgeKey: 'qaChecks' },
  { href: '/pm/releases',   label: 'Releases',   icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          badgeKey: '' },
  { href: '/pm/readiness',  label: 'Readiness',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',                                                                                                                                                                                                                                                                                                                                                                                                                               badgeKey: 'readiness' },
  { href: '/pm/score',      label: 'Score',      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',                                                                                                                                                                                           badgeKey: '' },
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function PanelWrapper() {
  const searchParams = useSearchParams();
  const panelId = searchParams.get('panel');
  if (!panelId) return null;
  return <TaskPanel taskId={panelId} />;
}

export default function PmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [myWork, setMyWork] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('spoton_theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
    api.me().then(setUser).catch(() => router.push('/login'));
    api.workItems.list().then(items => {
      const qaTotal = items.reduce((n, i) => n + (i.qaChecks?.length ?? 0), 0);
      const readiness = items.filter(i => i.status !== 'released').length;
      setCounts({ workItems: items.length, qaChecks: qaTotal, readiness });
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('spoton_theme', next);
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/pm/work-items?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleMyWork = () => {
    const next = !myWork;
    setMyWork(next);
    router.push(next ? '/pm/work-items?myWork=true' : '/pm/work-items');
  };

  const userInitials = user ? initials(user.name) : '--';

  return (
    <div className="shell" data-theme={theme}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <Link href="/pm/dashboard" style={{ textDecoration: 'none' }}>
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <div className="sidebar-logo-dot" />
            </div>
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-name">SpotOn</div>
              <div className="sidebar-brand-sub">Delivery</div>
            </div>
          </div>
        </Link>

        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/pm/dashboard' && pathname.startsWith(item.href));
            const count = item.badgeKey ? counts[item.badgeKey] : null;
            return (
              <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className="nav-item-label">{item.label}</span>
                {count != null && count > 0 && (
                  <span className={`nav-badge ${active ? 'nav-badge-accent' : 'nav-badge-muted'}`}>{count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => { clearToken(); router.push('/login'); }} title="Click to logout">
            <div className="avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? 'Loading…'}</div>
              <div className="sidebar-user-role">Engineer · Level 2</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-search-wrap">
            <svg className="topbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="topbar-search"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          <div className="topbar-spacer" />
          <button className={`topbar-my-work${myWork ? ' active' : ''}`} onClick={handleMyWork}>
            <div className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>{userInitials}</div>
            My Work
          </button>
          <button className="topbar-icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
          </button>
          <Link href="/pm/work-items/new" className="topbar-new-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Task
          </Link>
        </header>

        <div className="page-content">
          {children}
        </div>
      </div>

      {/* Task Panel */}
      <Suspense fallback={null}>
        <PanelWrapper />
      </Suspense>
    </div>
  );
}
