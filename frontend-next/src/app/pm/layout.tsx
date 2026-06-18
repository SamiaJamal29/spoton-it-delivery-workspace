'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

const NAV = [
  { href: '/pm/it-workspace', label: '🗂 Workspace' },
  { href: '/pm/work-items', label: '📋 Work Items' },
  { href: '/pm/releases', label: '🚀 Releases' },
  { href: '/pm/score', label: '⭐ Score' },
];

export default function PmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">SpotOn Project Engine</div>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname.startsWith(item.href) ? 'nav-link-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="logout-btn"
          onClick={() => {
            clearToken();
            router.push('/login');
          }}
        >
          Logout
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
