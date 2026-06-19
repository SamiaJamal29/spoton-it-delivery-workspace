# Technical Decisions

## Summary

Implemented all five levels of the challenge:

1. **Level 1** — Work Items CRUD with JWT auth
2. **Level 2** — Server-enforced status workflow transitions
3. **Level 3** — QA Checks with readiness gate before `ready_for_release`
4. **Level 4** — Releases with deploy cascade (linked items → `released`)
5. **Level 5** — Score system with event idempotency via unique constraint

Beyond the spec: added a member Kanban board (drag-and-drop), PM chat / member messaging inbox, forgot-password flow, and full Cloudflare deployment.

---

## Database Design

### Tables

| Table | Purpose |
|---|---|
| `users` | Auth — stores hashed passwords, role, reset token |
| `work_items` | Core entity — title, type, status, priority, assignee, dueDate, createdBy, projectId |
| `qa_checks` | N:1 to work_items — test title, expected/actual result, status, tester |
| `releases` | M:N to work_items via join table — version, releaseDate, deploymentStatus |
| `score_events` | Append-only — userId, action, entityId, points; unique(userId, action, entityId) |
| `messages` | Chat — fromId, fromName, toId, toName, content, read |

### Key constraints

- `score_events` has a `UNIQUE(userId, action, entityId)` constraint — this enforces idempotency at the DB level without application-level duplicate detection
- `work_items.createdBy` is a user ID (UUID string), not a foreign key — avoids cascade complexity on user delete
- `releases` ↔ `work_items` is a TypeORM many-to-many with a join table; the join is managed by the release entity's `workItems` relation

---

## API Design

RESTful, grouped by resource:

```
POST   /auth/register
POST   /auth/login
GET    /auth/me
PATCH  /auth/profile
GET    /auth/members           (PM only)
POST   /auth/members           (PM only)
PATCH  /auth/members/:id/password  (PM only)
POST   /auth/forgot-password
POST   /auth/reset-password

GET    /work-items             (filtered by createdBy = caller)
GET    /work-items/assigned-to-me
GET    /work-items/:id
POST   /work-items
PATCH  /work-items/:id
DELETE /work-items/:id

GET    /qa-checks/work-item/:workItemId
POST   /qa-checks
PATCH  /qa-checks/:id
DELETE /qa-checks/:id

GET    /releases               (filtered by createdBy = caller)
GET    /releases/:id
POST   /releases
PATCH  /releases/:id
DELETE /releases/:id

GET    /messages/threads
GET    /messages/unread
GET    /messages/conversation/:otherId
POST   /messages

GET    /score/me
```

Work items are scoped by `createdBy = caller.id` on list — each PM sees only their own items. Members use `/work-items/assigned-to-me` which searches by `assignee ILIKE user.name`.

---

## Frontend Design

Next.js App Router with `'use client'` on all interactive pages. No server components used — all data fetching happens in `useEffect` with the shared `api.ts` client.

Key pages:
- `/login`, `/signup`, `/forgot-password`, `/reset-password` — public auth flow
- `/pm/projects` — project management (localStorage-backed, see tradeoffs)
- `/pm/work-items` — full CRUD table with filters
- `/pm/work-items/[id]` — detail with QA check management
- `/pm/members` — member list with PM password reset
- `/pm/releases` — release management with deploy button
- `/pm/chat` — PM-to-member messaging
- `/pm/score` — score dashboard
- `/member` — Kanban board (drag-and-drop, three columns: To Do / In Progress / Done)
- `/member/messages` — member inbox

---

## Workflow Rules

### Status transitions

Enforced server-side in `WorkItemsService.update` via an explicit transition map:

```
backlog         → planned
planned         → in_progress, backlog
in_progress     → qa, planned
qa              → ready_for_release, in_progress
ready_for_release → qa, released
released        → (none)
```

Any other transition throws `400 Bad Request`. The map also allows backward moves (e.g. `qa → in_progress`) matching the spec.

### QA readiness rule

Before allowing `qa → ready_for_release`, `assertQaReady` runs:
1. If the item has **zero** QA checks → `400` ("must have at least one QA check")
2. If any check is not `passed` → `400` ("{n} QA check(s) are not passed yet")

Both conditions are explicitly checked. Zero QA checks is treated as not ready (as the spec requires).

### Release deployment rule

`PATCH /releases/:id` with `deploymentStatus: "deployed"`:
1. Checks the release isn't already deployed → `400` if so
2. All linked work items must be in `ready_for_release` status (enforced on create/update via `resolveReadyWorkItems`)
3. On deploy: all linked work items are cascaded to `released`
4. Awards 3 score points for the deploy

### Score idempotency

`score_events` has a DB-level `UNIQUE(userId, action, entityId)` constraint. `awardScore` catches only error code `23505` (PostgreSQL unique violation) and swallows it — any other DB error is re-thrown. This means:
- Moving an item to `qa` awards 1 point the first time; moving back then forward again doesn't double-award
- Deploying the same release twice is blocked at the business rule level, not just the score level

---

## Two-Backend Architecture Decision

**The canonical, spec-compliant backend is `backend-nest/`** — NestJS + TypeORM + PostgreSQL, exactly as the challenge specifies. This is the code that should be reviewed for correctness.

**`cf-api/`** is a Cloudflare Workers port added solely for free public hosting. NestJS cannot run on Cloudflare Workers (uses Node.js-only APIs: `net`, `pg` native driver, `bcrypt` native module). To provide a live demo URL without a paid server, I ported the API to Hono.js + Cloudflare D1 (SQLite).

The business rules are intentionally identical between both backends:
- Same transition map
- Same zero-QA-checks gate
- Same deploy cascade
- Score idempotency via `INSERT OR IGNORE` (D1) / `UNIQUE` constraint + code `23505` catch (Postgres)

**Passwords differ by backend:** `backend-nest` uses bcrypt (cost 12). `cf-api` uses PBKDF2-SHA256 (100k iterations, Web Crypto API) — bcrypt's CPU cost exceeds Cloudflare Workers' execution limits.

With more time: deploy `backend-nest` to a Node.js host (Railway, Render) and have both front ends point to the same canonical API.

---

## Tradeoffs

| Decision | What I did | What I'd do with more time |
|---|---|---|
| `synchronize: true` | TypeORM auto-syncs schema on start | Use `typeorm-migration` CLI to generate and run versioned migrations |
| Projects in localStorage | Project list and team members are stored client-side | Move to DB with a `projects` table; enforce `projectId` FK server-side |
| No email for password reset | Reset code returned in API response (dev mode) | Integrate SendGrid/Resend; remove code from response body |
| No activity log | Only `updatedAt` timestamp on work items | Add `status_history` table with old/new status, changed_by, timestamp |
| SQLite for live demo | D1 SQLite in cf-api | Map back to PostgreSQL once a Node.js host is set up |
| No pagination | All lists return full result sets | Add cursor-based pagination on `/work-items` and `/messages` |

---

## Unfinished Work

- Activity log / audit trail for status transitions
- Email delivery for password reset
- Pagination on long lists
- `backend-nest` deployed to a Node.js host (currently only `cf-api` is live)
- Frontend unit tests (covered backend service layer; frontend components have no tests)
