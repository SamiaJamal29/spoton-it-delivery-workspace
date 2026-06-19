'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Thread = { partnerId: string; partnerName: string; lastMessage: { content: string; fromId: string; createdAt: string }; unread: number };
type Msg    = { id: string; fromId: string; fromName: string; toId: string; toName: string; content: string; read: boolean; createdAt: string };
type Member = { id: string; name: string; email: string; role: string };

const AVATAR_PALETTE = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#0ea5e9','#a855f7'];
function avatarColor(id: string) { let n = 0; for (const c of id) n += c.charCodeAt(0); return AVATAR_PALETTE[n % AVATAR_PALETTE.length]; }
function initials(name: string)  { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }
function fmtTime(d: string)      { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
function fmtDay(d: string) {
  const date = new Date(d), now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.members.list(), api.messages.threads()])
      .then(([u, mems, t]) => { setMe(u); setMembers(mems); setThreads(t); });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Poll conversation every 4 seconds when one is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!active) return;
    const load = () => {
      api.messages.conversation(active.id).then(setMessages);
      api.messages.threads().then(setThreads);
    };
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active?.id]);

  const openConversation = async (member: Member) => {
    setActive(member);
    setLoadingMsgs(true);
    const msgs = await api.messages.conversation(member.id);
    setMessages(msgs);
    setThreads(t => t.map(th => th.partnerId === member.id ? { ...th, unread: 0 } : th));
    setLoadingMsgs(false);
  };

  const send = async () => {
    if (!text.trim() || !active || !me) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await api.messages.send(active.id, active.name, content);
    const msgs = await api.messages.conversation(active.id);
    setMessages(msgs);
    await api.messages.threads().then(setThreads);
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  // Merge threads with members who have no thread yet
  const allContacts: (Member & { unread: number; lastMsg?: string; lastTime?: string })[] =
    members.filter(m => m.id !== me?.id).map(m => {
      const th = threads.find(t => t.partnerId === m.id);
      return { ...m, unread: th?.unread ?? 0, lastMsg: th?.lastMessage.content, lastTime: th?.lastMessage.createdAt };
    }).sort((a, b) => (b.lastTime ?? '').localeCompare(a.lastTime ?? ''));

  const totalUnread = threads.reduce((n, t) => n + t.unread, 0);

  // Group messages by day
  const grouped: { day: string; msgs: Msg[] }[] = [];
  for (const m of messages) {
    const day = fmtDay(m.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(m);
    else grouped.push({ day, msgs: [m] });
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)', animation: 'fadeUp .3s ease' }}>

      {/* ── Left: contact list ── */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
            Messages {totalUnread > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '2px 7px', borderRadius: 20, marginLeft: 4 }}>{totalUnread}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{members.length} workspace members</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {allContacts.length === 0 && (
            <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              No members yet.<br />Add members first.
            </div>
          )}
          {allContacts.map(m => {
            const color = avatarColor(m.id);
            const isActive = active?.id === m.id;
            return (
              <button key={m.id} onClick={() => openConversation(m)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--border)', background: isActive ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initials(m.name)}
                  </div>
                  {m.unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{m.unread}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 700, color: isActive ? 'var(--accent)' : 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.lastMsg ?? m.role}
                  </div>
                </div>
                {m.lastTime && <div style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{fmtDay(m.lastTime)}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: conversation ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-3)' }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Select a member to start chatting</div>
            <div style={{ fontSize: 13 }}>Your messages go directly to their member dashboard</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor(active.id), color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials(active.name)}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{active.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{active.role} · {active.email}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {loadingMsgs && <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: 20 }}>Loading…</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 32 }}>👋</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>No messages yet. Say hello to {active.name.split(' ')[0]}!</div>
                </div>
              )}

              {grouped.map(({ day, msgs }) => (
                <div key={day}>
                  {/* Day divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', padding: '2px 10px', background: 'var(--bg)', borderRadius: 20, border: '1px solid var(--border)' }}>{day}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>

                  {msgs.map((m, i) => {
                    const isMe = m.fromId === me?.id;
                    const showName = !isMe && (i === 0 || msgs[i - 1]?.fromId !== m.fromId);
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
                        {!isMe && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(m.fromId), color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                            {initials(m.fromName)}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%' }}>
                          {showName && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, marginLeft: 2 }}>{m.fromName}</div>}
                          <div style={{ padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? 'var(--accent)' : 'var(--bg)', color: isMe ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.5, border: isMe ? 'none' : '1px solid var(--border)', wordBreak: 'break-word' }}>
                            {m.content}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, textAlign: isMe ? 'right' : 'left', paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>
                            {fmtTime(m.createdAt)}{isMe && (m.read ? ' · Seen' : '')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${active.name.split(' ')[0]}… (Enter to send)`}
                rows={1}
                style={{ flex: 1, resize: 'none', padding: '10px 14px', borderRadius: 22, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}
                onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
              />
              <button onClick={send} disabled={!text.trim() || sending} style={{ width: 40, height: 40, borderRadius: '50%', background: text.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
