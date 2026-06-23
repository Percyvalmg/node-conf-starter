# Source Tree Analysis — node-conf-starter

**Generated:** 2026-06-23

---

## Repository Root

```
node-conf-starter/                    # pnpm monorepo root
├── server/                           # Part: server — Express REST API backend
├── client/                           # Part: client — React SPA frontend
├── docs/                             # AI-generated project documentation
├── _bmad/                            # BMAD workflow tooling and config
│   ├── bmm/config.yaml               # BMM module config (user, language, output paths)
│   ├── core/, tea/, custom/          # BMAD skill modules
│   └── scripts/                      # Python resolver scripts
├── _bmad-output/                     # BMAD output artifacts (planning, implementation, test)
├── package.json                      # Root workspace: shared dev tools + root scripts
├── pnpm-workspace.yaml               # Declares server/ and client/ as workspace packages
├── pnpm-lock.yaml                    # Committed lockfile
├── tsconfig.json                     # Shared strict TypeScript base (extended by both parts)
├── eslint.config.mjs                 # Flat ESLint config (JS + TS + React hooks + Prettier)
├── .prettierrc.json                  # Prettier formatting rules
├── .nvmrc                            # Pins Node 22 LTS
└── .gitignore
```

---

## Part: server (`server/`)

```
server/
├── src/                              # All application source
│   ├── index.ts                      # ★ Entry point — Express app setup, middleware, routes, server start
│   ├── prismaClient.ts               # Singleton PrismaClient export
│   ├── routes/                       # Route handlers (mounted under /api)
│   │   ├── api.ts                    # ★ API router — assembles sub-routers, health + echo + info endpoints
│   │   ├── roles.ts                  # GET /api/roles — list all role types
│   │   ├── skills.ts                 # GET /api/skills — list all skills
│   │   └── workRequests.ts           # ★ Work request CRUD + shortlist + squad endpoints
│   ├── middleware/
│   │   └── errorHandler.ts           # Global Express error handler (JSON error envelope)
│   └── scoring/                      # ★ Pure scoring engine (no DB, no side effects)
│       ├── index.ts                  # Public re-exports
│       ├── types.ts                  # Scoring domain types (CandidateData, WorkRequestData, etc.)
│       ├── engine.ts                 # ★ rankCandidates / scoreCandidate — weighted scoring algorithm
│       └── validation.ts             # validateCandidate / validateWorkRequest
├── prisma/
│   ├── schema.prisma                 # ★ Prisma schema — 8 models, SQLite datasource
│   ├── seed.ts                       # Database seeder (roles, skills, 15 candidates)
│   ├── migrations/                   # Prisma migration history
│   └── dev.db                        # SQLite development database (git-ignored)
├── tests/
│   ├── routes/                       # Integration tests (Supertest against live Express app)
│   │   ├── roles.test.ts
│   │   ├── skills.test.ts
│   │   ├── workRequests.test.ts
│   │   ├── shortlist.test.ts
│   │   └── squad.test.ts
│   ├── scoring/                      # Unit + property tests for the scoring engine
│   ├── prisma/                       # Prisma-layer tests
│   └── sample.test.ts
├── package.json                      # Server workspace package (scripts: dev, build, test, db:*)
├── tsconfig.json                     # Compiles to dist/ using NodeNext module resolution
└── vitest.config.ts
```

### Critical server directories

| Directory | Purpose |
|-----------|---------|
| `src/routes/` | All HTTP route handlers; `workRequests.ts` is the most complex (validation, ORM queries, scoring call, squad upsert) |
| `src/scoring/` | Pure business-logic engine; isolated and independently testable |
| `prisma/` | Data schema, migrations, and seed data |
| `tests/routes/` | Integration tests using Supertest — primary test suite |

---

## Part: client (`client/`)

```
client/
├── src/
│   ├── main.tsx                      # React DOM entry — mounts <App /> into #root
│   ├── App.tsx                       # ★ Root router — BrowserRouter + 3 routes
│   ├── types.ts                      # ★ Shared TypeScript interfaces (WorkRequest, ScoredCandidate, etc.)
│   ├── index.css                     # Tailwind CSS directives
│   ├── pages/
│   │   ├── WorkRequestPage.tsx       # ★ /  — Create Work Request form
│   │   ├── ShortlistPage.tsx         # ★ /work-requests/:id/shortlist — Ranked candidate list + SquadPanel
│   │   └── HistoryPage.tsx           # ★ /history — Paginated history list + detail panel
│   ├── components/
│   │   ├── Layout.tsx                # Shared shell (nav + <Outlet />)
│   │   └── SquadPanel.tsx            # ★ Squad selection table, skill coverage meter, save button
│   └── hooks/                        # Custom React hooks (API clients)
│       ├── useSkills.ts              # GET /api/skills
│       ├── useRoles.ts               # GET /api/roles
│       ├── useWorkRequests.ts        # GET /api/work-requests (list + detail)
│       ├── useShortlist.ts           # GET /api/work-requests/:id/shortlist
│       ├── useCreateWorkRequest.ts   # POST /api/work-requests
│       └── useSquadMutation.ts       # POST /api/work-requests/:id/squad
├── tests/                            # Vitest + Testing Library unit/component tests
│   ├── App.test.tsx
│   ├── setup.ts                      # Global test setup (jest-dom matchers)
│   └── components/
│       ├── SquadPanel.test.tsx
│       ├── WorkRequestForm.test.tsx
│       └── HistoryList.test.tsx
├── e2e/                              # Playwright end-to-end tests
│   ├── sample.spec.ts
│   ├── slice0-checkpoint.spec.ts
│   ├── slice1-checkpoint.spec.ts
│   └── squad-assembly.spec.ts        # ★ Full user journey spec
├── index.html                        # Vite HTML entry
├── vite.config.ts                    # Vite config — React plugin + /api proxy to :3001
├── vitest.config.ts                  # Vitest config — jsdom environment
├── playwright.config.ts              # Playwright config — starts Vite dev server
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── tsconfig.json                     # Type-check only (no emit); extends root tsconfig
```

### Critical client directories

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Route-level components — one per URL; each page owns its layout and data fetching delegation |
| `src/hooks/` | All API calls; hooks encapsulate fetch lifecycle (loading/error/retry state) |
| `src/components/` | Shared UI components; `SquadPanel` contains the core squad-assembly interaction |
| `e2e/` | Playwright specs covering the end-to-end user flow |

---

## Integration Points

```
client/src/hooks/*  ──── /api/* (HTTP, proxied by Vite in dev) ──── server/src/routes/*
                                                                          │
                                                                    server/src/scoring/
                                                                          │
                                                                    prisma/schema.prisma
                                                                          │
                                                                       SQLite dev.db
```
