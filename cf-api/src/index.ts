import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify } from 'jose';

type Env = { DB: D1Database; JWT_SECRET: string };
type JWTPayload = { id: string; name: string; email: string; role: string };
type HonoCtx = { Bindings: Env; Variables: { user: JWTPayload } };

const app = new Hono<HonoCtx>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:sha256:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) return false;
  const parts = stored.split(':');
  const saltHex = parts[3];
  const hashHex = parts[4];
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const newHash = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  return newHash === hashHex;
}

async function signToken(payload: JWTPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(key);
}

async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  return payload as unknown as JWTPayload;
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function requireAuth(c: any, next: () => Promise<void>) {
  const auth = c.req.header('Authorization') as string | undefined;
  if (!auth?.startsWith('Bearer ')) return c.json({ message: 'Unauthorized' }, 401);
  try {
    const user = await verifyToken(auth.slice(7), (c.env as Env).JWT_SECRET ?? 'dev-secret');
    c.set('user', user);
    return next();
  } catch {
    return c.json({ message: 'Unauthorized' }, 401);
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtWorkItem(r: Record<string, unknown>, qaChecks: Record<string, unknown>[] = []) {
  return { id: r.id, title: r.title, description: r.description, type: r.type, status: r.status, priority: r.priority, assignee: r.assignee, dueDate: r.due_date, createdBy: r.created_by, projectId: r.project_id, createdAt: r.created_at, updatedAt: r.updated_at, qaChecks };
}

function fmtQaCheck(r: Record<string, unknown>) {
  return { id: r.id, workItemId: r.work_item_id, testTitle: r.test_title, expectedResult: r.expected_result, actualResult: r.actual_result, status: r.status, tester: r.tester, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at };
}

function fmtRelease(r: Record<string, unknown>) {
  return { id: r.id, version: r.version, releaseDate: r.release_date, summary: r.summary, deploymentStatus: r.deployment_status, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── DB helper: get work items with QA checks ──────────────────────────────────

async function getWorkItemsWithQa(db: D1Database, sql: string, binds: unknown[]) {
  const { results: rows } = await db.prepare(sql).bind(...binds).all<Record<string, unknown>>();
  if (!rows.length) return [];
  const ids = rows.map(r => r.id as string);
  const placeholders = ids.map(() => '?').join(',');
  const { results: qaRows } = await db.prepare(`SELECT * FROM qa_checks WHERE work_item_id IN (${placeholders}) ORDER BY created_at ASC`).bind(...ids).all<Record<string, unknown>>();
  const qaMap: Record<string, Record<string, unknown>[]> = {};
  for (const qa of qaRows) {
    const wid = qa.work_item_id as string;
    if (!qaMap[wid]) qaMap[wid] = [];
    qaMap[wid].push(fmtQaCheck(qa));
  }
  return rows.map(r => fmtWorkItem(r, qaMap[r.id as string] ?? []));
}

// ── Score helper ──────────────────────────────────────────────────────────────

async function awardScore(db: D1Database, userId: string, action: string, entityId: string, points: number) {
  try {
    await db.prepare('INSERT OR IGNORE INTO score_events (id, user_id, action, entity_id, points, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, action, entityId, points, new Date().toISOString()).run();
  } catch { /* duplicate — skip */ }
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', c => c.json({ status: 'ok' }));

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/auth/register', async (c) => {
  const { name, email, password } = await c.req.json<{ name: string; email: string; password: string }>();
  if (!name?.trim()) return c.json({ message: 'Name is required' }, 400);
  if (!email?.trim()) return c.json({ message: 'Email is required' }, 400);
  const rules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+;:'",.<>/?\\|`~[\]{}]).{8,}$/;
  if (!rules.test(password)) return c.json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character' }, 400);
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) return c.json({ message: 'An account with this email already exists' }, 400);
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await c.env.DB.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').bind(id, name.trim(), email.toLowerCase(), passwordHash, 'Member').run();
  const user: JWTPayload = { id, name: name.trim(), email: email.toLowerCase(), role: 'Member' };
  return c.json({ accessToken: await signToken(user, c.env.JWT_SECRET ?? 'dev-secret'), user });
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email?.toLowerCase()).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Invalid email or password' }, 401);
  const valid = await verifyPassword(password, row.password_hash as string);
  if (!valid) return c.json({ message: 'Invalid email or password' }, 401);
  const user: JWTPayload = { id: row.id as string, name: row.name as string, email: row.email as string, role: row.role as string };
  return c.json({ accessToken: await signToken(user, c.env.JWT_SECRET ?? 'dev-secret'), user });
});

app.get('/auth/me', requireAuth, c => c.json(c.get('user')));

app.patch('/auth/profile', requireAuth, async (c) => {
  const { id } = c.get('user');
  const { name, role } = await c.req.json<{ name?: string; role?: string }>();
  const updates: string[] = []; const binds: unknown[] = [];
  if (name?.trim()) { updates.push('name = ?'); binds.push(name.trim()); }
  if (role?.trim()) { updates.push('role = ?'); binds.push(role.trim()); }
  if (updates.length) { binds.push(id); await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run(); }
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'User not found' }, 404);
  const user: JWTPayload = { id: row.id as string, name: row.name as string, email: row.email as string, role: row.role as string };
  return c.json({ accessToken: await signToken(user, c.env.JWT_SECRET ?? 'dev-secret'), user });
});

app.get('/auth/members', requireAuth, async (c) => {
  if (c.get('user').role === 'Member') return c.json({ message: 'Access denied' }, 403);
  const { results } = await c.env.DB.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC').all<Record<string, unknown>>();
  return c.json(results.map(r => ({ id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at })));
});

app.post('/auth/members', requireAuth, async (c) => {
  if (c.get('user').role === 'Member') return c.json({ message: 'Access denied' }, 403);
  const { name, email, password, role } = await c.req.json<{ name: string; email: string; password: string; role?: string }>();
  if (!name?.trim()) return c.json({ message: 'Name is required' }, 400);
  if (!email?.trim()) return c.json({ message: 'Email is required' }, 400);
  if (!password || password.length < 6) return c.json({ message: 'Password must be at least 6 characters' }, 400);
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) return c.json({ message: 'An account with this email already exists' }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').bind(id, name.trim(), email.toLowerCase(), await hashPassword(password), role?.trim() || 'Member').run();
  return c.json({ id, name: name.trim(), email: email.toLowerCase(), role: role?.trim() || 'Member', createdAt: new Date().toISOString() });
});

app.post('/auth/forgot-password', async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email?.toLowerCase()).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'If that email exists, a reset code has been sent.', code: null });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await c.env.DB.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').bind(code, expiry, row.id).run();
  return c.json({ message: 'Reset code generated (dev mode — check the response).', code, expiresIn: '15 minutes' });
});

app.post('/auth/reset-password', async (c) => {
  const { code, password } = await c.req.json<{ code: string; password: string }>();
  if (!password || password.length < 6) return c.json({ message: 'Password must be at least 6 characters' }, 400);
  const row = await c.env.DB.prepare('SELECT * FROM users WHERE reset_token = ?').bind(code).first<Record<string, unknown>>();
  if (!row || !row.reset_token_expiry) return c.json({ message: 'Invalid or expired reset code' }, 400);
  if (new Date() > new Date(row.reset_token_expiry as string)) return c.json({ message: 'Reset code has expired. Please request a new one.' }, 400);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').bind(await hashPassword(password), row.id).run();
  return c.json({ message: 'Password updated successfully. You can now log in.' });
});

app.patch('/auth/members/:id/password', requireAuth, async (c) => {
  if (c.get('user').role === 'Member') return c.json({ message: 'Access denied' }, 403);
  const { password } = await c.req.json<{ password: string }>();
  if (!password || password.length < 6) return c.json({ message: 'Password must be at least 6 characters' }, 400);
  const row = await c.env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'User not found' }, 404);
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), c.req.param('id')).run();
  return c.json({ message: `Password updated for ${row.name}` });
});

// ── Work Items ────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  backlog: ['planned'], planned: ['in_progress', 'backlog'],
  in_progress: ['qa', 'planned'], qa: ['ready_for_release', 'in_progress'],
  ready_for_release: ['qa', 'released'], released: [],
};

app.get('/work-items', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const { status, priority, assignee, search, projectId } = c.req.query();
  let sql = 'SELECT * FROM work_items WHERE created_by = ?';
  const binds: unknown[] = [userId];
  if (projectId) { sql += ' AND project_id = ?'; binds.push(projectId); }
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  if (priority) { sql += ' AND priority = ?'; binds.push(priority); }
  if (assignee) { sql += ' AND assignee LIKE ?'; binds.push(`%${assignee}%`); }
  if (search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; binds.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  return c.json(await getWorkItemsWithQa(c.env.DB, sql, binds));
});

app.get('/work-items/assigned-to-me', requireAuth, async (c) => {
  const { name } = c.get('user');
  return c.json(await getWorkItemsWithQa(c.env.DB, 'SELECT * FROM work_items WHERE assignee LIKE ? ORDER BY created_at DESC', [`%${name}%`]));
});

app.get('/work-items/:id', requireAuth, async (c) => {
  const items = await getWorkItemsWithQa(c.env.DB, 'SELECT * FROM work_items WHERE id = ?', [c.req.param('id')]);
  if (!items.length) return c.json({ message: 'Work item not found' }, 404);
  return c.json(items[0]);
});

app.post('/work-items', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const body = await c.req.json<Record<string, unknown>>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO work_items (id, title, description, type, status, priority, assignee, due_date, created_by, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, body.title, body.description ?? null, body.type ?? 'feature', body.status ?? 'backlog', body.priority ?? 'medium', body.assignee ?? null, body.dueDate ?? null, userId, body.projectId ?? null, now, now).run();
  await awardScore(c.env.DB, userId, 'create_work_item', id, 1);
  const items = await getWorkItemsWithQa(c.env.DB, 'SELECT * FROM work_items WHERE id = ?', [id]);
  return c.json(items[0], 201);
});

app.patch('/work-items/:id', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();
  const current = await c.env.DB.prepare('SELECT * FROM work_items WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!current) return c.json({ message: 'Work item not found' }, 404);
  if (body.status && body.status !== current.status) {
    const allowed = VALID_TRANSITIONS[current.status as string] ?? [];
    if (!allowed.includes(body.status as string)) return c.json({ message: `Cannot move from "${current.status}" to "${body.status}". Allowed: ${allowed.join(', ') || 'none'}` }, 400);
    if (body.status === 'ready_for_release') {
      const { results: qcRows } = await c.env.DB.prepare('SELECT status FROM qa_checks WHERE work_item_id = ?').bind(id).all<Record<string, unknown>>();
      if (!qcRows.length) return c.json({ message: 'Work item must have at least one QA check before moving to ready_for_release' }, 400);
      const notPassed = qcRows.filter(q => q.status !== 'passed');
      if (notPassed.length) return c.json({ message: `${notPassed.length} QA check(s) are not passed yet` }, 400);
    }
    if (body.status === 'qa') await awardScore(c.env.DB, userId, 'move_to_qa', id, 1);
    if (body.status === 'ready_for_release') await awardScore(c.env.DB, userId, 'move_to_ready', id, 2);
  }
  const colMap: Record<string, string> = { dueDate: 'due_date', projectId: 'project_id' };
  const updatableFields = ['title', 'description', 'type', 'status', 'priority', 'assignee', 'dueDate', 'projectId'];
  const updates: string[] = []; const binds: unknown[] = [];
  for (const f of updatableFields) {
    if (body[f] !== undefined) { updates.push(`${colMap[f] ?? f} = ?`); binds.push(body[f]); }
  }
  updates.push('updated_at = ?'); binds.push(new Date().toISOString()); binds.push(id);
  await c.env.DB.prepare(`UPDATE work_items SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  const items = await getWorkItemsWithQa(c.env.DB, 'SELECT * FROM work_items WHERE id = ?', [id]);
  return c.json(items[0]);
});

app.delete('/work-items/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT id FROM work_items WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ message: 'Work item not found' }, 404);
  await c.env.DB.prepare('DELETE FROM work_items WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── QA Checks ─────────────────────────────────────────────────────────────────

app.get('/qa-checks/work-item/:workItemId', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM qa_checks WHERE work_item_id = ? ORDER BY created_at ASC').bind(c.req.param('workItemId')).all<Record<string, unknown>>();
  return c.json(results.map(fmtQaCheck));
});

app.get('/qa-checks/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM qa_checks WHERE id = ?').bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'QA check not found' }, 404);
  return c.json(fmtQaCheck(row));
});

app.post('/qa-checks', requireAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO qa_checks (id, work_item_id, test_title, expected_result, actual_result, status, tester, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, body.workItemId, body.testTitle, body.expectedResult ?? null, body.actualResult ?? null, body.status ?? 'pending', body.tester ?? null, body.notes ?? null, now, now).run();
  const row = await c.env.DB.prepare('SELECT * FROM qa_checks WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return c.json(fmtQaCheck(row!), 201);
});

app.patch('/qa-checks/:id', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();
  const current = await c.env.DB.prepare('SELECT * FROM qa_checks WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!current) return c.json({ message: 'QA check not found' }, 404);
  const wasNotPassed = current.status !== 'passed';
  const colMap: Record<string, string> = { testTitle: 'test_title', expectedResult: 'expected_result', actualResult: 'actual_result' };
  const updatableFields = ['testTitle', 'expectedResult', 'actualResult', 'status', 'tester', 'notes'];
  const updates: string[] = []; const binds: unknown[] = [];
  for (const f of updatableFields) {
    if (body[f] !== undefined) { updates.push(`${colMap[f] ?? f} = ?`); binds.push(body[f]); }
  }
  updates.push('updated_at = ?'); binds.push(new Date().toISOString()); binds.push(id);
  await c.env.DB.prepare(`UPDATE qa_checks SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  if (body.status === 'passed' && wasNotPassed) await awardScore(c.env.DB, userId, 'complete_qa_check', id, 1);
  const row = await c.env.DB.prepare('SELECT * FROM qa_checks WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return c.json(fmtQaCheck(row!));
});

app.delete('/qa-checks/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT id FROM qa_checks WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ message: 'QA check not found' }, 404);
  await c.env.DB.prepare('DELETE FROM qa_checks WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── Releases ──────────────────────────────────────────────────────────────────

async function getReleaseWithWorkItems(db: D1Database, releaseId: string) {
  const row = await db.prepare('SELECT * FROM releases WHERE id = ?').bind(releaseId).first<Record<string, unknown>>();
  if (!row) return null;
  const { results: wiRows } = await db.prepare('SELECT wi.* FROM work_items wi JOIN release_work_items rwi ON rwi.work_item_id = wi.id WHERE rwi.release_id = ?').bind(releaseId).all<Record<string, unknown>>();
  return { ...fmtRelease(row), workItems: wiRows.map(wi => fmtWorkItem(wi)) };
}

app.get('/releases', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM releases WHERE created_by = ? ORDER BY created_at DESC').bind(userId).all<Record<string, unknown>>();
  const releases = await Promise.all(results.map(r => getReleaseWithWorkItems(c.env.DB, r.id as string)));
  return c.json(releases);
});

app.get('/releases/:id', requireAuth, async (c) => {
  const release = await getReleaseWithWorkItems(c.env.DB, c.req.param('id'));
  if (!release) return c.json({ message: 'Release not found' }, 404);
  return c.json(release);
});

app.post('/releases', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const body = await c.req.json<Record<string, unknown>>();
  const workItemIds = (body.workItemIds as string[]) ?? [];
  if (workItemIds.length) {
    const { results: items } = await c.env.DB.prepare(`SELECT id, status, title FROM work_items WHERE id IN (${workItemIds.map(() => '?').join(',')})`).bind(...workItemIds).all<Record<string, unknown>>();
    const notReady = items.filter(i => i.status !== 'ready_for_release');
    if (notReady.length) return c.json({ message: `Work items must be in "ready_for_release" status: ${notReady.map(i => i.title).join(', ')}` }, 400);
  }
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO releases (id, version, release_date, summary, deployment_status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, body.version, body.releaseDate ?? null, body.summary ?? null, 'draft', userId, now, now).run();
  for (const wiId of workItemIds) await c.env.DB.prepare('INSERT OR IGNORE INTO release_work_items (release_id, work_item_id) VALUES (?, ?)').bind(id, wiId).run();
  return c.json(await getReleaseWithWorkItems(c.env.DB, id), 201);
});

app.patch('/releases/:id', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();
  const current = await c.env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!current) return c.json({ message: 'Release not found' }, 404);
  if (current.deployment_status === 'deployed' && body.deploymentStatus === 'deployed') return c.json({ message: 'Release is already deployed' }, 400);
  if (body.workItemIds !== undefined) {
    await c.env.DB.prepare('DELETE FROM release_work_items WHERE release_id = ?').bind(id).run();
    const workItemIds = (body.workItemIds as string[]) ?? [];
    if (workItemIds.length) {
      const { results: items } = await c.env.DB.prepare(`SELECT id, status, title FROM work_items WHERE id IN (${workItemIds.map(() => '?').join(',')})`).bind(...workItemIds).all<Record<string, unknown>>();
      const notReady = items.filter(i => i.status !== 'ready_for_release');
      if (notReady.length) return c.json({ message: `Work items must be in "ready_for_release" status: ${notReady.map(i => i.title).join(', ')}` }, 400);
      for (const wiId of workItemIds) await c.env.DB.prepare('INSERT OR IGNORE INTO release_work_items (release_id, work_item_id) VALUES (?, ?)').bind(id, wiId).run();
    }
  }
  if (body.deploymentStatus === 'deployed') {
    const { results: wiRows } = await c.env.DB.prepare('SELECT work_item_id FROM release_work_items WHERE release_id = ?').bind(id).all<Record<string, unknown>>();
    for (const { work_item_id } of wiRows) await c.env.DB.prepare('UPDATE work_items SET status = ?, updated_at = ? WHERE id = ?').bind('released', new Date().toISOString(), work_item_id).run();
    await awardScore(c.env.DB, userId, 'deploy_release', id, 3);
  }
  const updates: string[] = []; const binds: unknown[] = [];
  if (body.version !== undefined) { updates.push('version = ?'); binds.push(body.version); }
  if (body.releaseDate !== undefined) { updates.push('release_date = ?'); binds.push(body.releaseDate); }
  if (body.summary !== undefined) { updates.push('summary = ?'); binds.push(body.summary); }
  if (body.deploymentStatus !== undefined) { updates.push('deployment_status = ?'); binds.push(body.deploymentStatus); }
  updates.push('updated_at = ?'); binds.push(new Date().toISOString()); binds.push(id);
  await c.env.DB.prepare(`UPDATE releases SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
  return c.json(await getReleaseWithWorkItems(c.env.DB, id));
});

app.delete('/releases/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT id FROM releases WHERE id = ?').bind(c.req.param('id')).first();
  if (!row) return c.json({ message: 'Release not found' }, 404);
  await c.env.DB.prepare('DELETE FROM release_work_items WHERE release_id = ?').bind(c.req.param('id')).run();
  await c.env.DB.prepare('DELETE FROM releases WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ message: 'Deleted' });
});

// ── Messages ──────────────────────────────────────────────────────────────────

app.get('/messages/threads', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const { results: msgs } = await c.env.DB.prepare('SELECT * FROM messages WHERE from_id = ? OR to_id = ? ORDER BY created_at DESC').bind(userId, userId).all<Record<string, unknown>>();
  const seen = new Set<string>(); const threads: unknown[] = [];
  for (const m of msgs) {
    const partnerId = m.from_id === userId ? m.to_id as string : m.from_id as string;
    const partnerName = m.from_id === userId ? m.to_name : m.from_name;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);
    const unread = msgs.filter(x => x.from_id === partnerId && x.to_id === userId && !x.read).length;
    threads.push({ partnerId, partnerName, lastMessage: { content: m.content, fromId: m.from_id, createdAt: m.created_at }, unread });
  }
  return c.json(threads);
});

app.get('/messages/unread', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS cnt FROM messages WHERE to_id = ? AND read = 0').bind(userId).first<Record<string, unknown>>();
  return c.json(row?.cnt ?? 0);
});

app.get('/messages/conversation/:otherId', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const otherId = c.req.param('otherId');
  await c.env.DB.prepare('UPDATE messages SET read = 1 WHERE from_id = ? AND to_id = ? AND read = 0').bind(otherId, userId).run();
  const { results } = await c.env.DB.prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at ASC').bind(userId, otherId, otherId, userId).all<Record<string, unknown>>();
  return c.json(results.map(m => ({ id: m.id, fromId: m.from_id, fromName: m.from_name, toId: m.to_id, toName: m.to_name, content: m.content, read: !!m.read, createdAt: m.created_at })));
});

app.post('/messages', requireAuth, async (c) => {
  const { id: userId, name: userName } = c.get('user');
  const { toId, toName, content } = await c.req.json<{ toId: string; toName: string; content: string }>();
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO messages (id, from_id, from_name, to_id, to_name, content, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)').bind(id, userId, userName, toId, toName, content, new Date().toISOString()).run();
  return c.json({ id });
});

// ── Score ─────────────────────────────────────────────────────────────────────

app.get('/score/me', requireAuth, async (c) => {
  const { id: userId } = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM score_events WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all<Record<string, unknown>>();
  const total = results.reduce((s, e) => s + (e.points as number), 0);
  return c.json({ total, events: results.map(e => ({ id: e.id, action: e.action, points: e.points, createdAt: e.created_at })) });
});

// ── IT Workspace summary ──────────────────────────────────────────────────────

app.get('/it-workspace/summary', requireAuth, async (c) => {
  const [wi, qa, rel] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM work_items').first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM qa_checks').first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM releases').first<{ n: number }>(),
  ]);
  return c.json({ counts: { workItems: wi?.n ?? 0, qaChecks: qa?.n ?? 0, releases: rel?.n ?? 0 } });
});

app.get('/it-workspace/work-items', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM work_items ORDER BY created_at DESC LIMIT 5').all<Record<string, unknown>>();
  return c.json(results.map(r => fmtWorkItem(r)));
});

export default app;
