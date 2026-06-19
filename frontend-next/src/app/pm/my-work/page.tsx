'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, WorkItem } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  backlog: '#94a3b8', planned: '#3b82f6', in_progress: '#6366f1',
  qa: '#a855f7', ready_for_release: '#0d9488', released: '#16a34a',
};
const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog', planned: 'Planned', in_progress: 'In Progress',
  qa: 'QA Review', ready_for_release: 'Ready to Ship', released: 'Released',
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8',
};
const PRIORITY_BG: Record<string, string> = {
  urgent: '#fee2e2', high: '#ffedd5', medium: '#fef9c3', low: '#f1f5f9',
};
const TYPE_ICON: Record<string, string> = {
  feature: '✨', bug: '🐛', improvement: '⚡', maintenance: '🔧',
};

function isOverdue(date: string) {
  return date && new Date(date) < new Date();
}
function isDueSoon(date: string) {
  if (!date) return false;
  const diff = new Date(date).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Section = { label: string; statuses: string[]; accent: string; bg: string; emoji: string };
const SECTIONS: Section[] = [
  { label: 'Up Next',      statuses: ['backlog', 'planned'],                   accent: '#3b82f6', bg: '#eff6ff', emoji: '📋' },
  { label: 'In Progress',  statuses: ['in_progress'],                          accent: '#6366f1', bg: '#eef2ff', emoji: '⚡' },
  { label: 'In Review',    statuses: ['qa', 'ready_for_release'],              accent: '#a855f7', bg: '#faf5ff', emoji: '🔍' },
  { label: 'Completed',    statuses: ['released'],                             accent: '#10b981', bg: '#ecfdf5', emoji: '✅' },
];

export default function MyWorkPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarColor, setAvatarColor] = useState('#5b57d6');
  const [filter, setFilter] = useState<'all' | 'active' | 'urgent'>('all');

  useEffect(() => {
    api.me().then(u => {
      setUser(u);
      const color = localStorage.getItem(`spoton_avatar_color_${u.id}`);
      if (color) setAvatarColor(color);
      return api.workItems.assignedToMe();
    }).then(assigned => {
      setItems(assigned);
    }).catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="workspace-loading">Loading your workspace…</div>;
  if (!user) return null;

  const initials = (name: string) => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const mine = items; // already filtered server-side by assignee name

  // Apply quick filter
  const filtered = filter === 'active'
    ? mine.filter(i => ['in_progress', 'qa', 'ready_for_release'].includes(i.status))
    : filter === 'urgent'
    ? mine.filter(i => ['urgent', 'high'].includes(i.priority))
    : mine;

  const overdueCount = mine.filter(i => i.dueDate && isOverdue(i.dueDate) && i.status !== 'released').length;
  const inProgressCount = mine.filter(i => i.status === 'in_progress').length;
  const doneCount = mine.filter(i => i.status === 'released').length;
  const dueSoonCount = mine.filter(i => isDueSoon(i.dueDate)).length;

  return (
    <div style={{ maxWidth: 860, animation: 'fadeUp .3s ease' }}>

      {/* Hero header */}
      <div style={{ marginBottom: 28, padding: '24px 28px', borderRadius: 18, background: `linear-gradient(135deg, ${avatarColor}18 0%, ${avatarColor}08 100%)`, border: `1px solid ${avatarColor}25`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: avatarColor + '10' }} />
        <div style={{ position: 'absolute', top: 20, right: 20, width: 80, height: 80, borderRadius: '50%', background: avatarColor + '15' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: avatarColor, color: '#fff', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${avatarColor}50`, flexShrink: 0 }}>
            {initials(user.name)}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>Hey, {user.name.split(' ')[0]} 👋</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
              {user.role} · {mine.length} task{mine.length !== 1 ? 's' : ''} assigned to you
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/pm/work-items" style={{ fontSize: 12, fontWeight: 600, color: avatarColor, textDecoration: 'none', background: avatarColor + '15', padding: '6px 14px', borderRadius: 20, border: `1px solid ${avatarColor}30` }}>
              All Tasks →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Assigned',    value: mine.length,      color: '#5b57d6', icon: '📌' },
          { label: 'In Progress', value: inProgressCount,  color: '#6366f1', icon: '⚡' },
          { label: 'Due Soon',    value: dueSoonCount,     color: '#f59e0b', icon: '⏰' },
          { label: 'Completed',   value: doneCount,        color: '#10b981', icon: '✅' },
        ].map(s => (
          <div key={s.label} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, position: 'relative' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 18, opacity: .5 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#fee2e2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>
            {overdueCount} task{overdueCount !== 1 ? 's' : ''} overdue — take action now
          </span>
        </div>
      )}

      {/* Quick filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([['all', 'All tasks'], ['active', 'Active'], ['urgent', 'Urgent / High']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: '1px solid', cursor: 'pointer', transition: 'all .12s',
            background: filter === val ? 'var(--accent)' : 'var(--surface)',
            color: filter === val ? '#fff' : 'var(--text-2)',
            borderColor: filter === val ? 'var(--accent)' : 'var(--border)',
          }}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Empty state */}
      {mine.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No tasks assigned to you yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>When a team member assigns you a task, it will appear here.</div>
        </div>
      )}

      {mine.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 32, marginBottom: 6 }}>🔎</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-3)' }}>No tasks match this filter</div>
        </div>
      )}

      {/* Task sections */}
      {SECTIONS.map(section => {
        const sectionItems = filtered.filter(i => section.statuses.includes(i.status));
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.label} style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>{section.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: section.accent, textTransform: 'uppercase', letterSpacing: '.06em' }}>{section.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: section.accent, padding: '2px 8px', borderRadius: 20 }}>{sectionItems.length}</span>
              <div style={{ flex: 1, height: 1, background: section.accent + '25' }} />
            </div>

            {/* Task cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sectionItems.map(item => {
                const overdue = item.dueDate && isOverdue(item.dueDate) && item.status !== 'released';
                const soon = isDueSoon(item.dueDate);
                return (
                  <Link key={item.id} href={`/pm/work-items/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${overdue ? '#fca5a5' : 'var(--border)'}`, borderLeft: `4px solid ${STATUS_COLOR[item.status]}`, transition: 'box-shadow .15s, transform .1s', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                    >
                      {/* Type icon */}
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{TYPE_ICON[item.type] ?? '📄'}</span>

                      {/* Title + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: item.status === 'released' ? 'var(--text-3)' : 'var(--text)', textDecoration: item.status === 'released' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                        {/* Status */}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: STATUS_COLOR[item.status] + '18', color: STATUS_COLOR[item.status] }}>
                          {STATUS_LABEL[item.status]}
                        </span>
                        {/* Priority */}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: PRIORITY_BG[item.priority], color: PRIORITY_COLOR[item.priority] }}>
                          {item.priority}
                        </span>
                        {/* Due date */}
                        {item.dueDate && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: overdue ? '#ef4444' : soon ? '#f59e0b' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {overdue ? '🔴' : soon ? '🟡' : '📅'} {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
