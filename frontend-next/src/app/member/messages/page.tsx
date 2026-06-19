'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Thread = { partnerId: string; partnerName: string; lastMessage: { content: string; fromId: string; createdAt: string }; unread: number };
type Msg    = { id: string; fromId: string; fromName: string; toId: string; toName: string; content: string; read: boolean; createdAt: string };

const PALETTE = ['#5b57d6','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#0ea5e9','#a855f7'];
function avatarColor(id: string) { let n = 0; for (const c of id) n += c.charCodeAt(0); return PALETTE[n % PALETTE.length]; }
function initials(name: string)  { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }
function fmtTime(d: string)      { return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
function fmtDay(d: string) {
  const date = new Date(d), now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MemberMessagesPage() {
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.messages.threads()]).then(([u, t]) => {
      setMe(u);
      setThreads(t);
      setLoading(false);
      // Auto-open first thread
      if (t.length > 0 && !active) openConversation(t[0], u);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!active) return;
    const load = () => {
      api.messages.conversation(active.partnerId).then(setMessages);
      api.messages.threads().then(setThreads);
    };
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active?.partnerId]);

  const openConversation = async (thread: Thread, currentUser?: { id: string; name: string }) => {
    setActive(thread);
    const msgs = await api.messages.conversation(thread.partnerId);
    setMessages(msgs);
    setThreads(t => t.map(th => th.partnerId === thread.partnerId ? { ...th, unread: 0 } : th));
  };

  const send = async () => {
    if (!text.trim() || !active || !me) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await api.messages.send(active.partnerId, active.partnerName, content);
    const msgs = await api.messages.conversation(active.partnerId);
    setMessages(msgs);
    await api.messages.threads().then(setThreads);
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const totalUnread = threads.reduce((n, t) => n + t.unread, 0);

  const grouped: { day: string; msgs: Msg[] }[] = [];
  for (const m of messages) {
    const day = fmtDay(m.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(m);
    else grouped.push({ day, msgs: [m] });
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, padding: 60 }}>Loading messages…</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)', margin: 0 }}>
          Messages {totalUnread > 0 && <span style={{ fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '3px 9px', borderRadius: 20, marginLeft: 6 }}>{totalUnread} new</span>}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>Messages from your Project Manager</p>
      </div>

      {threads.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No messages yet</div>
          <div style={{ fontSize: 13 }}>Your PM can send you messages here. Check back later!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)' }}>
          {/* Thread list */}
          <div style={{ width: 260, flexShrink: 0, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
              Conversations
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {threads.map(th => {
                const color = avatarColor(th.partnerId);
                const isActive = active?.partnerId === th.partnerId;
                return (
                  <button key={th.partnerId} onClick={() => openConversation(th)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: isActive ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: color, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {initials(th.partnerName)}
                      </div>
                      {th.unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{th.unread}</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 700, color: isActive ? 'var(--accent)' : 'var(--text)' }}>{th.partnerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {th.lastMessage.content}
                      </div>
                    </div>
                    {th.lastMessage.createdAt && <div style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{fmtDay(th.lastMessage.createdAt)}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation */}
          <div style={{ flex: 1, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {!active ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                Select a conversation
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(active.partnerId), color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {initials(active.partnerName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{active.partnerName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Project Manager</div>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {messages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                      No messages yet. Wait for your PM to say hello!
                    </div>
                  )}
                  {grouped.map(({ day, msgs }) => (
                    <div key={day}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', padding: '2px 8px', background: 'var(--bg)', borderRadius: 20, border: '1px solid var(--border)' }}>{day}</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                      {msgs.map((m, i) => {
                        const isMe = m.fromId === me?.id;
                        const showName = !isMe && (i === 0 || msgs[i - 1]?.fromId !== m.fromId);
                        return (
                          <div key={m.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 6, marginBottom: 5 }}>
                            {!isMe && (
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarColor(m.fromId), color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2 }}>
                                {initials(m.fromName)}
                              </div>
                            )}
                            <div style={{ maxWidth: '70%' }}>
                              {showName && <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2, marginLeft: 2 }}>{m.fromName}</div>}
                              <div style={{ padding: '9px 13px', borderRadius: isMe ? '16px 16px 3px 16px' : '16px 16px 16px 3px', background: isMe ? 'var(--accent)' : 'var(--bg)', color: isMe ? '#fff' : 'var(--text)', fontSize: 13, lineHeight: 1.5, border: isMe ? 'none' : '1px solid var(--border)', wordBreak: 'break-word' }}>
                                {m.content}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, textAlign: isMe ? 'right' : 'left', paddingRight: isMe ? 3 : 0, paddingLeft: isMe ? 0 : 3 }}>
                                {fmtTime(m.createdAt)}
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
                <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Reply to your PM… (Enter to send)"
                    rows={1}
                    style={{ flex: 1, resize: 'none', padding: '9px 13px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }}
                    onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 100) + 'px'; }}
                  />
                  <button onClick={send} disabled={!text.trim() || sending} style={{ width: 38, height: 38, borderRadius: '50%', background: text.trim() ? 'var(--accent)' : 'var(--border)', color: '#fff', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
