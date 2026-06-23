# Integration Architecture — node-conf-starter

**Generated:** 2026-06-23  
**Repository type:** pnpm monorepo  
**Parts:** server (Express backend) ↔ client (React SPA)

---

## Overview

The two parts communicate exclusively via HTTP REST. There are no shared runtime modules, no shared database connections, and no message queues. In development the Vite dev server acts as a transparent proxy; in production a reverse proxy performs the same role.

```
┌─────────────────────────────────┐      HTTP /api/*       ┌──────────────────────────────────┐
│         client (React SPA)       │ ──────────────────────► │        server (Express)           │
│         :5173 (dev)              │ ◄────────────────────── │        :3001                     │
│         static host (prod)       │      JSON responses     │                                  │
└─────────────────────────────────┘                         └──────────────────┬───────────────┘
                                                                               │
                                                                        Prisma ORM
                                                                               │
                                                                         SQLite file
                                                                    (server/prisma/dev.db)
```

---

## Integration Points

### 1. Client → Server: REST API

| # | From (client hook) | To (server route) | Method | Path | Purpose |
|---|-------------------|-------------------|--------|------|---------|
| 1 | `useSkills` | `skills.ts` | GET | `/api/skills` | Load skill vocabulary for form |
| 2 | `useRoles` | `roles.ts` | GET | `/api/roles` | Load role vocabulary for form |
| 3 | `useCreateWorkRequest` | `workRequests.ts` | POST | `/api/work-requests` | Submit new work request |
| 4 | `useWorkRequests` | `workRequests.ts` | GET | `/api/work-requests` | Paginated history list |
| 5 | `useWorkRequestDetail` | `workRequests.ts` | GET | `/api/work-requests/:id` | Detail + squad members |
| 6 | `useShortlist` | `workRequests.ts` | GET | `/api/work-requests/:id/shortlist` | Ranked candidate list |
| 7 | `useSquadMutation` | `workRequests.ts` | POST | `/api/work-requests/:id/squad` | Save/replace squad |

All calls use the native `fetch` API. All request bodies and responses are `application/json`.

---

### 2. Dev Proxy (Vite → Express)

**File:** `client/vite.config.ts`

During development, Vite proxies any request matching `/api` to the backend:

```
Browser fetch('/api/skills')
  → Vite dev server (:5173)
  → [proxy] http://localhost:3001/api/skills
  → Express route handler
```

This means the client makes **same-origin** requests in development (no CORS headers needed from the browser's perspective). The server still has `cors()` middleware enabled for cases where it is called directly (e.g. Supertest, curl, Postman).

**In production** the same effect is achieved by configuring a reverse proxy (nginx/Caddy) to route `/api/*` to the Express process while serving the static `client/dist/` for all other paths.

---

### 3. Shared TypeScript Types (by convention, not by module)

There is no shared `packages/` workspace package. The client and server maintain separate but aligned type definitions:

| Server type | Client type | Location |
|-------------|-------------|----------|
| `WorkRequest` (Prisma model) | `WorkRequest` interface | `client/src/types.ts` |
| `ScoredResult` | `ScoredCandidate` | `client/src/types.ts` |
| `ScoreBreakdown` | `ScoreBreakdown` | `client/src/types.ts` |
| `RankingResult` | `ShortlistData` | `client/src/hooks/useShortlist.ts` |
| `WorkRequestData` | `WorkRequestInput` | `client/src/types.ts` |

**Important:** These types are **manually kept in sync**. If the server API response shape changes, the corresponding client type and hook mapping must be updated. The `useShortlist` hook has explicit field mapping (`candidateId ?? id`) to handle any shape differences.

---

## Data Flow: Full User Journey

```
1. User opens WorkRequestPage
   client: useSkills() ──────────► GET /api/skills ──► [Skill names]
   client: useRoles()  ──────────► GET /api/roles  ──► [Role names]

2. User submits form
   client: useCreateWorkRequest() ► POST /api/work-requests
                                    ├── validate input
                                    ├── resolve skill/role IDs (Prisma)
                                    ├── create WorkRequest + relations (Prisma)
                                    └── return { id, title, ... }
   → navigate to /work-requests/:id/shortlist

3. ShortlistPage loads
   client: useShortlist(id) ──────► GET /api/work-requests/:id/shortlist
                                    ├── fetch WorkRequest with skills/roles (Prisma)
                                    ├── fetch all Candidates with skills (Prisma)
                                    ├── map to CandidateData[]
                                    ├── rankCandidates() [scoring engine]
                                    └── return { candidates, warnings, ... }

   client: fetch /api/work-requests/:id (for existing squad pre-population)

4. User selects candidates and confirms squad
   client: useSquadMutation() ────► POST /api/work-requests/:id/squad
                                    ├── validate candidateIds
                                    ├── fetch Candidates (Prisma)
                                    ├── calculate skillCoveragePercent
                                    ├── delete existing Squad (if any)
                                    ├── create Squad + SquadMembers (Prisma)
                                    └── return { id, skillCoveragePercent, members }

5. User navigates to HistoryPage
   client: useWorkRequests(1) ────► GET /api/work-requests?page=1&pageSize=50
                                    └── return paginated list with hasSquad flag

   client: useWorkRequestDetail() ► GET /api/work-requests/:id  (on row click)
                                    └── return full detail + squad members
```

---

## Error Propagation

All server errors return JSON. The client hooks surface these as human-readable strings in the `error` field of `ApiState<T>`.

| Server response | Client handling |
|-----------------|----------------|
| `400 { error, fields }` | `useCreateWorkRequest` maps `fields` to `fieldErrors` per form field |
| `400 { error, fields }` | `useSquadMutation` extracts `fields.candidateIds ?? error` as message string |
| `404 { error }` | Hook sets `error` = response body error string |
| `500 { error: { message } }` | Hook sets `error` = status text or generic message |
| Network failure | Hook sets `error` = "Unable to reach the server. Please try again." |

All error states expose a `retry` function that re-runs the fetch.

---

## Shared Configuration (Root Workspace)

While the parts don't share runtime code, they share development tooling via the repo root:

| Asset | Shared between |
|-------|---------------|
| `tsconfig.json` (strict base) | Both `server/tsconfig.json` and `client/tsconfig.json` extend it |
| `eslint.config.mjs` | Lints both workspaces in one pass |
| `.prettierrc.json` | Formatting rules for both |
| `pnpm-workspace.yaml` | Declares both as workspace packages |
| Root `package.json` scripts | `dev`, `build`, `test`, `lint`, `format` run both workspaces |

---

## Production Deployment Notes

1. **Build both parts:** `pnpm build` — produces `server/dist/` and `client/dist/`
2. **Set environment variables** on the server: `DATABASE_URL`, `PORT`, `NODE_ENV=production`
3. **Run migrations:** `pnpm --filter server db:migrate:deploy` (applies without prompts)
4. **Serve static assets** from `client/dist/` via nginx/Caddy/S3+CDN
5. **Configure reverse proxy** to forward `/api/*` → Express (`PORT`)
6. **Start the server:** `pnpm start` (runs `node server/dist/index.js`)

There is no Docker configuration in this repository — add a `Dockerfile` and `docker-compose.yml` as needed for your deployment target.
