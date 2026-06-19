# Prompt Log

Meaningful AI-assisted work recorded here. Minor autocomplete suggestions are not logged.

---

## 2026-06-18 — Claude Code (claude-sonnet-4-6)

### Goal
Scaffold the NestJS backend with JWT auth, TypeORM entities, and the initial work items CRUD.

### Prompt Summary
"Set up a NestJS project with TypeORM + PostgreSQL. I need JWT authentication (register/login/me), a User entity with bcrypt password hashing, and a WorkItem entity with these fields: title, description, type (feature/bug/improvement/maintenance), status (backlog/planned/in_progress/qa/ready_for_release/released), priority (low/medium/high/urgent), assignee, dueDate, createdBy."

### Output Summary
Generated the AppModule with TypeOrmModule.forRoot, JwtModule.register, User entity, WorkItem entity, AuthController/AuthService, JwtAuthGuard, CurrentUser decorator, and WorkItemsController/WorkItemsService with basic CRUD. Also generated the docker-compose.yml for local Postgres.

### Files Changed
- `backend-nest/src/app.module.ts`
- `backend-nest/src/auth/auth.controller.ts`
- `backend-nest/src/auth/auth.service.ts`
- `backend-nest/src/database/user.entity.ts`
- `backend-nest/src/database/work-item.entity.ts`
- `backend-nest/src/work-items/work-items.controller.ts`
- `backend-nest/src/work-items/work-items.service.ts`
- `docker-compose.yml`

### Manual Review
Reviewed the JWT secret handling (moved to env var), confirmed bcrypt cost factor 12, verified the entity column types matched what I wanted. Tested register/login/me flow locally.

---

## 2026-06-18 — Claude Code (claude-sonnet-4-6)

### Goal
Implement server-side workflow transition enforcement.

### Prompt Summary
"Add status transition validation to WorkItemsService. The allowed transitions are: backlog→planned, planned→in_progress or backlog, in_progress→qa or planned, qa→ready_for_release or in_progress, ready_for_release→qa or released, released→nothing. Any other transition should throw BadRequestException."

### Output Summary
Generated the `VALID_TRANSITIONS` map and the guard inside `update()`. Also generated the `assertQaReady` helper and the `SCORE_ACTIONS` map.

### Files Changed
- `backend-nest/src/work-items/work-items.service.ts`

### Manual Review
Tested invalid transitions via curl (confirmed 400). Caught that `assertQaReady` had `if (!full.qaChecks.length) return` — this allows zero QA checks through, which contradicts the spec. Directed the fix to throw instead.

---

## 2026-06-18 — Claude Code (claude-sonnet-4-6)

### Goal
Implement QA Checks module and Releases module with deploy cascade.

### Prompt Summary
"Add QaChecks (CRUD, linked to WorkItem) and Releases (create/update/delete, work items must be ready_for_release to attach, deploying a release sets all linked items to released). Add score events for: create_work_item (+1), move_to_qa (+1), complete_qa_check (+1), move_to_ready (+2), deploy_release (+3). Enforce uniqueness with a DB constraint."

### Output Summary
Generated QaCheck and Release entities, QaChecksController/Service, ReleasesController/Service, ScoreEvent entity with UNIQUE constraint, ScoreController/Service. Generated the deploy cascade in `ReleasesService.update`.

### Files Changed
- `backend-nest/src/database/qa-check.entity.ts`
- `backend-nest/src/database/release.entity.ts`
- `backend-nest/src/database/score-event.entity.ts`
- `backend-nest/src/qa-checks/`
- `backend-nest/src/releases/`
- `backend-nest/src/score/`

### Manual Review
Verified the deploy cascade (linked items → released). Confirmed score idempotency by calling the same transition twice — second call was silently ignored by the unique constraint. Caught that the catch block swallowed all errors, not just `23505` — directed the narrowing fix.

---

## 2026-06-18 — Claude Code (claude-sonnet-4-6)

### Goal
Build the Next.js frontend with PM dashboard, work items CRUD, QA checks, releases.

### Prompt Summary
"Build a Next.js App Router frontend with these pages: login, signup, PM dashboard (/pm/projects), work items list (/pm/work-items) with filters, work item detail (/pm/work-items/[id]) with QA check management, releases (/pm/releases) with deploy button. Use localStorage for JWT token. Consistent sidebar nav."

### Output Summary
Generated all PM pages, the shared `api.ts` client, the login/signup forms, and the sidebar layout.

### Files Changed
- `frontend-next/src/app/login/page.tsx`
- `frontend-next/src/app/signup/page.tsx`
- `frontend-next/src/app/pm/layout.tsx`
- `frontend-next/src/app/pm/projects/page.tsx`
- `frontend-next/src/app/pm/work-items/page.tsx`
- `frontend-next/src/app/pm/work-items/[id]/page.tsx`
- `frontend-next/src/app/pm/releases/page.tsx`
- `frontend-next/src/lib/api.ts`

### Manual Review
Ran the full app locally and clicked through every page. Caught a missing `Suspense` wrapper on a `useSearchParams` call, a layout overflow on the member sidebar, and incorrect role-checking logic on the redirect.

---

## 2026-06-19 — Claude Code (claude-sonnet-4-6)

### Goal
Add member Kanban board, chat feature, and forgot-password flow.

### Prompt Summary
"Replace the member list-view dashboard with a drag-and-drop Kanban board: three columns (To Do = backlog/planned, In Progress = in_progress, Done = qa/ready_for_release/released). Done is locked — members can't drag there directly, PM takes over from qa onward. Also add PM chat page and member messages inbox, and a forgot-password / reset-password flow."

### Output Summary
Generated the Kanban page with HTML5 drag-and-drop, the `enterCount` ref pattern (fixes dragLeave flicker), PM chat page with polling, member inbox, and the two-step forgot/reset password flow with backend endpoints.

### Files Changed
- `frontend-next/src/app/member/page.tsx`
- `frontend-next/src/app/pm/chat/page.tsx`
- `frontend-next/src/app/member/messages/page.tsx`
- `frontend-next/src/app/forgot-password/page.tsx`
- `frontend-next/src/app/reset-password/page.tsx`
- `backend-nest/src/auth/auth.service.ts`
- `backend-nest/src/auth/auth.controller.ts`
- `backend-nest/src/database/user.entity.ts`

### Manual Review
Tested the Kanban drag-and-drop (caught the dragLeave flicker, directed the enterCount fix). Tested forgot-password end-to-end. Verified the reset code expires after 15 minutes.

---

## 2026-06-19 — Claude Code (claude-sonnet-4-6)

### Goal
Deploy everything to Cloudflare (user's request: "do everything to make it live").

### Prompt Summary
"The NestJS backend can't run on Cloudflare Workers (Node.js-only APIs). Port the entire API to a Cloudflare Workers-compatible stack. Use Hono.js for routing, Cloudflare D1 for SQLite database, PBKDF2 via Web Crypto for password hashing (bcrypt exceeds Workers CPU limits), and jose for JWT. Deploy both frontend and API to Cloudflare Workers."

### Output Summary
Generated the entire `cf-api/` directory: `src/index.ts` (~450 lines, all endpoints), `schema.sql`, `seed.sql` (demo accounts with pre-computed PBKDF2 hashes), `wrangler.toml`, `package.json`. Also generated `frontend-next/.env.production` to bake the API URL at build time.

### Files Changed
- `cf-api/src/index.ts`
- `cf-api/schema.sql`
- `cf-api/seed.sql`
- `cf-api/wrangler.toml`
- `cf-api/package.json`
- `frontend-next/.env.production`

### Manual Review
Verified each step: `wrangler d1 create`, schema migration, seed, `wrangler deploy`, `wrangler secret put JWT_SECRET`. Tested login with demo account via curl. Confirmed live URLs responded correctly.

---

## 2026-06-20 — Claude Code (claude-sonnet-4-6)

### Goal
Fix review findings: zero-QA-checks loophole, DTO validation, narrow error catch, tests, docs.

### Prompt Summary
"A reviewer found these issues: (1) assertQaReady returns instead of throwing when there are zero QA checks — contradicts the spec. (2) DTOs have no class-validator decorators so ValidationPipe does nothing. (3) awardScore catches all errors, should only catch code 23505. (4) No tests. (5) Missing required docs. Fix all of them."

### Output Summary
Fixed assertQaReady in NestJS and cf-api. Added class-validator decorators to all three DTO files. Narrowed awardScore catch to code 23505. Generated 7 unit tests for the transition guard and QA gate. Generated AI_USAGE.md, DECISIONS.md, PROMPT_LOG.md.

### Files Changed
- `backend-nest/src/work-items/work-items.service.ts`
- `backend-nest/src/work-items/work-items.dto.ts`
- `backend-nest/src/work-items/work-items.service.spec.ts`
- `backend-nest/src/qa-checks/qa-checks.service.ts`
- `backend-nest/src/qa-checks/qa-checks.dto.ts`
- `backend-nest/src/releases/releases.service.ts`
- `backend-nest/src/releases/releases.dto.ts`
- `cf-api/src/index.ts`
- `AI_USAGE.md`
- `DECISIONS.md`
- `PROMPT_LOG.md`

### Manual Review
Ran `npm test` in `backend-nest/` — all 7 tests pass. Manually confirmed the zero-QA-checks error message matches the spec language. Reviewed all three doc files for accuracy before committing.
