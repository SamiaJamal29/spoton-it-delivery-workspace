# Reviewer Guide — SpotOn IT Delivery Workspace

## Live Access

| | URL |
|---|---|
| **Frontend** | https://spoton-challenge-web.samiadev.workers.dev |
| **API** | https://spoton-api.samiadev.workers.dev |
| **GitHub** | https://github.com/SamiaJamal29/spoton-it-delivery-workspace |

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| `sarah.pm@spoton.test` | `SpotOn@2025` | Project Manager |
| `alex.dev@spoton.test` | `SpotOn@2025` | Member |

---

## What Was Built (All 5 Levels)

| Level | Feature | Where to See It |
|---|---|---|
| 1 | Work Items CRUD + JWT auth | `/pm/work-items` |
| 2 | Server-enforced workflow transitions + filters + My Work | `/pm/work-items` |
| 3 | QA Checks with backend readiness gate | Any work item detail page |
| 4 | Releases with deploy cascade | `/pm/releases` |
| 5 | Score system with idempotency + 14 tests | `/pm/score` |

**Creative feature:** Status History — every status transition is recorded with who made it and when, shown as a timeline on each work item detail page.

---

## Key Rules to Verify (live app)

### 1. Workflow transitions are server-enforced

Try an invalid transition via the API — it returns 400:
```bash
# Get a token
TOKEN=$(curl -s https://spoton-api.samiadev.workers.dev/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"sarah.pm@spoton.test","password":"SpotOn@2025"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Try jumping backlog → released (invalid) — expect 400
curl -s https://spoton-api.samiadev.workers.dev/work-items/<any-id> \
  -X PATCH -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"released"}'
# → {"statusCode":400,"message":"Invalid transition: backlog → released"}
```

### 2. QA gate blocks release readiness

In the UI: open any work item in `qa` status with no QA checks → click **"ready for release"** → see the error:
> *"Work item must have at least one QA check before moving to ready_for_release"*

With zero QA checks AND with failed checks — both are blocked. Only when all checks are `passed` does the transition succeed.

### 3. Deploy cascade — linked items become `released`

Go to `/pm/releases` → open any draft release → click **Deploy**. All linked `ready_for_release` work items automatically move to `released`. Deploying the same release twice is blocked.

### 4. Score idempotency

The same action on the same item never awards points twice. This is enforced at the database level with a `UNIQUE(userId, action, entityId)` constraint — not just application logic.

### 5. Ownership rules

- Only the **creator or assignee** can update a work item (others get 403)
- Only the **creator** can delete a work item

### 6. Status History (creative feature)

Open any work item that has been moved through statuses → scroll to the bottom of the detail page → see the full audit trail with actor name, from/to statuses, and timestamps.

---

## Running Tests Locally

```bash
git clone https://github.com/SamiaJamal29/spoton-it-delivery-workspace.git
cd spoton-it-delivery-workspace/backend-nest
npm install
npm test
```

Expected output: **14 tests, all passing**

```
PASS src/work-items/work-items.service.spec.ts
  WorkItemsService
    transition guard
      ✓ allows valid transition backlog → planned
      ✓ allows valid transition qa → ready_for_release when all checks passed
      ✓ rejects invalid transition backlog → released
      ✓ rejects invalid transition in_progress → ready_for_release
      ✓ rejects qa → ready_for_release with zero QA checks
      ✓ rejects qa → ready_for_release with a failed check
      ✓ rejects qa → ready_for_release with a pending check
    ownership
      ✓ allows update by creator
      ✓ allows update by assignee
      ✓ rejects update by non-owner
      ✓ allows delete by creator
      ✓ rejects delete by non-creator
    activity log
      ✓ records status transition in activity log
      ✓ does not record activity when status unchanged

Tests: 14 passed, 14 total
```

---

## Score Events

| Action | Points | Idempotent |
|---|---|---|
| Create a work item | +1 | Yes |
| Move to QA | +1 | Yes |
| Complete a QA check | +1 | Yes |
| Move to ready for release | +2 | Yes |
| Deploy a release | +3 | Yes |

---

## Navigation Map

| Page | Path | What to look for |
|---|---|---|
| Login / Signup | `/login`, `/signup` | JWT auth, role-based redirect |
| PM Dashboard | `/pm/projects` | Project overview |
| Work Items | `/pm/work-items` | Table + Board views, search, status/priority/assignee filters, My Work toggle |
| Work Item Detail | `/pm/work-items/:id` | Status transitions, QA checks, Status History timeline |
| Releases | `/pm/releases` | Draft → Deployed, linked work items, deploy button |
| Score | `/pm/score` | Points breakdown per action |
| Members | `/pm/members` | PM can add members and reset passwords |
| Member Kanban | `/member` | Drag-and-drop board (To Do / In Progress / Done) |

---

## Architecture

- **Backend (reviewed for correctness):** `backend-nest/` — NestJS + TypeORM + PostgreSQL
- **Live API:** `cf-api/` — Cloudflare Workers port (Hono + D1/SQLite) for free hosting
- **Frontend:** `frontend-next/` — Next.js App Router deployed to Cloudflare Workers
- **Business rules** are identical in both backends (same transition map, QA gate, deploy cascade)

See `DECISIONS.md` for the full rationale on the two-backend architecture and all tradeoffs.
