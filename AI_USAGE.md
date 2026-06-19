# AI Usage

## Tools Used

| Tool | Used? | Notes |
| --- | --- | --- |
| Claude Code (claude-sonnet-4-6) | Yes | Primary tool — used throughout the entire project via the CLI |
| ChatGPT | No | |
| Codex | No | |
| Cursor | No | |

## Summary

Claude Code was used heavily throughout this project. The AI generated initial code scaffolding, implementation of business logic, frontend components, and deployment configuration. I directed the architecture decisions, reviewed every generated file, tested the running app, caught bugs (like the zero-QA-checks loophole), and made corrections. The AI was a pair programmer — I drove the requirements and verified outputs.

## Main Areas AI Helped With

- **Architecture:** Suggested the NestJS + TypeORM + PostgreSQL stack layout; module structure with separate controllers, services, and DTOs
- **Backend:** Generated initial implementations of all endpoints; I directed the business rules (transition map, QA gate, score idempotency) and reviewed correctness
- **Frontend:** Generated Next.js page components and layout; I specified UX requirements (Kanban board, chat interface, unread badge) and reviewed rendering
- **Database:** Entity design and TypeORM relationships; I reviewed column types and constraints
- **Tests:** Generated the spec file structure; I specified exactly which cases to cover (invalid transitions, zero QA checks, etc.)
- **Deployment:** Generated the Cloudflare Workers port (cf-api) and wrangler configuration after I decided to deploy to Cloudflare for free hosting
- **Debugging:** Helped diagnose the `dragLeave` flicker in Kanban (solved with `enterCount` ref pattern)

## What I Reviewed Manually

- Every generated file was read before being used
- Ran the app locally and tested all major flows: login, create work items, transition statuses, QA checks, releases, chat
- Caught the zero-QA-checks loophole (AI originally wrote `if (!full.qaChecks.length) return`) and directed the fix
- Caught that ValidationPipe was wired but DTOs had no decorators — directed the addition of class-validator decorators
- Verified the score idempotency constraint was keyed correctly
- Reviewed the two-backend situation and decided to keep both with a clear explanation in DECISIONS.md

## What AI Got Wrong

- **Zero QA checks loophole:** The AI generated `if (!full.qaChecks.length) return` in `assertQaReady`, which directly contradicts the spec ("treat zero QA checks as not ready"). The spec is explicit; this was a logic inversion.
- **ValidationPipe with no decorators:** The AI wired `new ValidationPipe()` in `main.ts` but left DTOs as plain classes with no `@IsString`, `@IsEnum` etc. The validation silently did nothing.
- **Silent catch too broad:** `awardScore` caught all errors instead of only PostgreSQL unique constraint violations (`code: '23505'`). Real database errors would be silently swallowed.
- **PBKDF2 for cf-api:** When porting to Cloudflare Workers, the AI initially suggested bcryptjs, which would have exceeded the Workers CPU time limit. PBKDF2 via Web Crypto was the correct alternative.

## Commands Run

```bash
# Local development
docker compose up -d postgres
npm run dev:api        # NestJS backend on :3001
npm run dev:web        # Next.js frontend on :3000

# Tests
cd backend-nest && npm test

# Cloudflare deployment
cd cf-api && npm install
npx wrangler d1 create spoton-api-db
npx wrangler d1 execute spoton-api-db --file=schema.sql --remote
npx wrangler d1 execute spoton-api-db --file=seed.sql --remote
npx wrangler deploy
echo "<secret>" | npx wrangler secret put JWT_SECRET

cd ../frontend-next
npx @opennextjs/cloudflare build
npx wrangler deploy
```

## Known Limitations

- Projects and team members are stored in `localStorage`, not the database (see DECISIONS.md)
- `synchronize: true` is used in NestJS TypeORM config — acceptable for a challenge, would be replaced with migrations in production
- No email delivery for password reset — the reset code is returned directly in the API response (dev mode)
- The cf-api (Cloudflare Workers) backend uses SQLite (D1) instead of PostgreSQL — behaviour is identical but the DB engine differs from the challenge spec
