# Architecture — server

**Generated:** 2026-06-23  
**Part:** server  
**Project type:** backend  
**Pattern:** Layered REST API (Route → Service/Engine → ORM → SQLite)

---

## Executive Summary

The server is a TypeScript Express application running on Node.js 20+ using ES modules. It exposes a REST API for the Squad Assembly domain: managing work requests, scoring candidates via a pure scoring engine, and persisting squad selections via Prisma ORM on SQLite.

The architecture is deliberately simple and flat — no dependency injection framework, no service class abstractions — making it easy to navigate and extend. The one architectural investment is the **scoring engine**, which is a pure-function module with no database dependency, making it trivially testable and replaceable.

---

## Architecture Diagram

```
HTTP Client (React SPA / curl)
        │
        ▼
┌─────────────────────────────────────┐
│           Express App               │
│  src/index.ts                       │
│  ├── cors()                         │
│  ├── express.json()                 │
│  ├── /health (inline)               │
│  └── /api/* → apiRouter             │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
  Route Handlers         errorHandler
  src/routes/            middleware
  ├── api.ts
  ├── roles.ts           (JSON error envelope)
  ├── skills.ts
  └── workRequests.ts
        │
        ├──── prismaClient ────► Prisma ORM ────► SQLite
        │
        └──── scoring/engine ──► rankCandidates() (pure, no I/O)
```

---

## Layer Breakdown

### 1. Entry Point (`src/index.ts`)

- Creates the Express app and registers middleware: `cors()`, `express.json()`.
- Mounts `apiRouter` at `/api`.
- Registers the global `errorHandler` as the last middleware.
- Starts listening only when `NODE_ENV !== 'test'` — allows Supertest to import the app without port conflicts.

### 2. Route Layer (`src/routes/`)

All business logic lives in the route handlers. There is no separate service layer.

| File | Responsibility |
|------|---------------|
| `api.ts` | Assembles sub-routers; owns `/api/health`, `/api/echo`, `/api/info` |
| `roles.ts` | `GET /api/roles` — Prisma query, returns name list |
| `skills.ts` | `GET /api/skills` — Prisma query, returns name list |
| `workRequests.ts` | Full CRUD + shortlisting + squad management. Most complex file in the server. |

**`workRequests.ts` responsibilities:**
- Input validation via `validateWorkRequestInput()` (inline function) for `POST /api/work-requests`
- Foreign-key resolution: looks up Skill and RoleType IDs by name before creating relations
- Pagination for `GET /api/work-requests`
- Shortlist: fetches all candidates, maps to `CandidateData[]`, calls `rankCandidates()`, returns results
- Squad save: validates candidate IDs, calculates skill coverage, upserts squad via delete+create

### 3. Scoring Engine (`src/scoring/`)

A self-contained pure-function module. Has no database access or side effects.

**Files:**
- `types.ts` — domain types (`CandidateData`, `WorkRequestData`, `ScoredResult`, `RankingResult`)
- `validation.ts` — `validateCandidate()`, `validateWorkRequest()`
- `engine.ts` — `scoreCandidate()`, `rankCandidates()`
- `index.ts` — public re-exports

**Scoring algorithm (in `engine.ts`):**

```
skillMatchFactor    = matchedSkills.length / requiredSkills.length     (0–1)
roleAlignmentFactor = 1.0 if role matches any requiredRole else 0.0
availabilityFactor  = availabilityBand / 100                           (0–1)
workloadFactor      = max(0, (5 - min(workloadIndicator, 5)) / 5)      (0–1)
urgencyMultiplier   = 1.5 if urgency ∈ {Critical,High} else 1.0

weightedSum = skillMatch×0.40 + roleAlignment×0.20
            + availability×urgencyMultiplier×0.25
            + workload×0.15

matchScore = round(min(1.0, weightedSum) × 100)   → integer 0–100
```

Candidates with zero skill overlap are **excluded** (not scored); the exclusion is captured as a `ValidationWarning` in the response.

### 4. Data Layer (`prisma/`)

| Asset | Description |
|-------|-------------|
| `schema.prisma` | 8 models; SQLite datasource; Prisma Client generator |
| `migrations/` | Prisma Migrate history |
| `seed.ts` | Idempotent seed: 6 role types, 20 skills, 15 candidates across 6 role categories |
| `prismaClient.ts` | Singleton `PrismaClient` export — shared across all route modules |

### 5. Error Handling (`src/middleware/errorHandler.ts`)

All route handlers use `next(error)` to forward errors. The global `errorHandler` middleware:
- Maps `err.status` or defaults to 500
- Returns a consistent JSON envelope: `{ error: { code, message, status, timestamp } }`
- Logs to `console.error` with the error code prefix

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Scoring engine as a pure module | Decoupled from ORM; independently unit-testable; replaceable without touching HTTP layer |
| No service layer | Project scope doesn't warrant the abstraction; route handlers are the service |
| ES modules (`"type": "module"`) | Modern Node.js; required for `tsx` dev runner without transpilation |
| `NODE_ENV !== 'test'` guard on `app.listen()` | Enables clean Supertest integration without port conflicts |
| SQLite via Prisma | Zero-config local development; easy to swap datasource URL for Postgres in production |
| CUID primary keys | Collision-resistant, URL-safe, ordered by time |
| Squad upsert as delete+create | Prisma doesn't support nested `upsert` for one-to-one with cascade; explicit delete is simpler and correct |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | Prisma datasource URL. Example: `file:./prisma/dev.db` |
| `PORT` | `3001` | HTTP listen port. Override to avoid macOS AirPlay conflict on 5000. |
| `NODE_ENV` | `development` | Controls dev/test/production behaviour |

Set in `server/.env` (copy from `server/.env.example`).

---

## Testing Strategy

| Layer | Tool | Location |
|-------|------|----------|
| Route integration | Vitest + Supertest | `server/tests/routes/` |
| Scoring engine unit | Vitest | `server/tests/scoring/` |
| Scoring property tests | fast-check (property-based) | `server/tests/scoring/` |
| Prisma layer | Vitest | `server/tests/prisma/` |

Integration tests import `app` directly from `src/index.ts` and use Supertest — no real HTTP port needed.

```bash
pnpm --filter server test           # run once
pnpm --filter server test:watch     # watch mode
pnpm --filter server test:coverage  # coverage report
```

---

## Build & Runtime

```bash
# Development (tsx hot-reload, no compile step)
pnpm --filter server dev

# Production build (tsc → dist/)
pnpm --filter server build

# Production start (runs compiled dist/index.js)
pnpm --filter server start
```

TypeScript compiles to `dist/` using `NodeNext` module resolution (emits `.js` files with explicit `.js` extensions in imports). The `tsconfig.json` extends the root strict base config.
