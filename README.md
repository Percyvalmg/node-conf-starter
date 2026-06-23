# Node Conf Starter — Squad Assembly

A full-stack **Squad Assembly** application built with Node.js + React. Staff create work requests describing a delivery need, and the app automatically scores and ranks available candidates before letting the user confirm a squad.

The repo is a **pnpm monorepo** (`server/` + `client/`) and doubles as a conference starter template demonstrating modern full-stack TypeScript patterns.

---

## What the App Does

1. **Create a work request** — specify required skills (up to 20), roles (up to 10), urgency level, and duration in weeks.
2. **Review the shortlist** — the server scores every candidate using a weighted formula (skill match 40%, role alignment 20%, availability 25%, workload 15%) and returns a ranked list.
3. **Assemble a squad** — select candidates from the shortlist; the UI shows live skill coverage. Confirm to save the squad.
4. **Browse history** — paginated list of all past work requests with urgency badges and squad status. Click any row to expand the full detail and squad members.

---

## Tech Stack

**Backend** (`server/`)
- Node.js 20+ · Express 4 · TypeScript (ES modules)
- Prisma 5 ORM · SQLite
- Vitest · Supertest · fast-check (property-based testing)

**Frontend** (`client/`)
- React 18 · Vite · TypeScript
- Tailwind CSS
- Vitest · Testing Library · Playwright (E2E)

---

## Prerequisites

- **Node.js 20+** (repo pins **Node 22 LTS** via `.nvmrc`)
- **pnpm 9+**

```bash
nvm use          # or: fnm use  — switch to the pinned version
```

Install pnpm if needed:
```bash
npm install -g pnpm@9
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/thandog/node-conf-starter.git
cd node-conf-starter

# 2. Install all workspace dependencies
pnpm install

# 3. Run both apps (hot reload)
pnpm dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- Vite proxies `/api/*` to the backend automatically — no CORS config needed.

> Port 5000 is intentionally avoided (macOS AirPlay Receiver). Override with `PORT` in `server/.env`.

### With the database (required for full functionality)

The scoring and squad features need real candidate data in SQLite:

```bash
cp server/.env.example server/.env

pnpm --filter server db:generate    # generate Prisma client
pnpm --filter server db:migrate     # create DB + apply migrations
pnpm db:seed                        # seed 6 roles, 20 skills, 15 candidates
```

---

## Scripts

All commands run from the repo root:

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start backend + frontend together (hot reload) |
| `pnpm build` | Type-check and build both apps for production |
| `pnpm start` | Run the built backend (`server/dist/`) |
| `pnpm test` | Run all unit/component tests once (both workspaces) |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm lint` | Lint all code with ESLint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format all code with Prettier |
| `pnpm format:check` | Verify formatting without writing |

Per-workspace (replace `server` with `client` as needed):

| Command | What it does |
|---------|-------------|
| `pnpm --filter server dev` | Start the backend only |
| `pnpm --filter server test` | Run server tests once |
| `pnpm --filter server test:watch` | Watch mode |
| `pnpm --filter server test:coverage` | Coverage report |
| `pnpm --filter client preview` | Preview the production client build |

---

## Database Scripts

```bash
pnpm --filter server db:migrate          # apply pending migrations (dev)
pnpm --filter server db:migrate:deploy   # apply without prompts (production)
pnpm --filter server db:generate         # regenerate Prisma client after schema changes
pnpm db:seed                             # seed reference data + sample candidates
pnpm --filter server db:studio           # open Prisma Studio at :5555
```

---

## Testing

Unit and integration tests (CI-friendly, exits after one run):

```bash
pnpm test                                        # both workspaces
pnpm --filter server test:watch                  # watch mode — server
pnpm --filter client test:watch                  # watch mode — client
```

### End-to-end (Playwright)

Install browsers once per machine:

```bash
npx playwright install
pnpm test:e2e
```

E2E specs live in `client/e2e/`. Playwright starts the Vite dev server automatically.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Process liveness |
| GET | `/api/health` | API health + uptime |
| GET | `/api/info` | Name / version / environment |
| GET | `/api/skills` | List all available skills |
| GET | `/api/roles` | List all available role types |
| POST | `/api/work-requests` | Create a work request |
| GET | `/api/work-requests` | Paginated work request list |
| GET | `/api/work-requests/:id` | Work request detail + squad |
| GET | `/api/work-requests/:id/shortlist` | Score and rank candidates |
| POST | `/api/work-requests/:id/squad` | Save / replace squad |

Full request/response shapes: [docs/api-contracts-server.md](./docs/api-contracts-server.md)

---

## Project Structure

```
node-conf-starter/
├── server/                      # Express REST API backend
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── routes/              # Route handlers (/api/*)
│   │   │   └── workRequests.ts  # Work request CRUD + shortlist + squad
│   │   ├── scoring/             # Pure scoring engine (no DB dependency)
│   │   └── middleware/          # Global error handler
│   ├── prisma/
│   │   ├── schema.prisma        # 8 models (Candidate, Skill, WorkRequest, Squad, …)
│   │   └── seed.ts              # Reference data + 15 sample candidates
│   └── tests/                   # Vitest + Supertest integration tests
├── client/                      # React SPA frontend
│   ├── src/
│   │   ├── App.tsx              # Router (3 routes)
│   │   ├── pages/               # WorkRequestPage · ShortlistPage · HistoryPage
│   │   ├── components/          # Layout · SquadPanel
│   │   ├── hooks/               # API hooks (useSkills, useShortlist, useSquadMutation, …)
│   │   └── types.ts             # Shared TypeScript interfaces
│   ├── tests/                   # Vitest + Testing Library component tests
│   └── e2e/                     # Playwright end-to-end specs
├── docs/                        # Project documentation
├── tsconfig.json                # Shared strict TypeScript base
├── pnpm-workspace.yaml          # Workspace config
└── .nvmrc                       # Pins Node 22 LTS
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/index.md](./docs/index.md) | Master index — start here for AI-assisted development |
| [docs/project-overview.md](./docs/project-overview.md) | Purpose, tech stack, getting started |
| [docs/architecture-server.md](./docs/architecture-server.md) | Server layering, scoring engine, design decisions |
| [docs/architecture-client.md](./docs/architecture-client.md) | React component hierarchy, hook layer, routing |
| [docs/integration-architecture.md](./docs/integration-architecture.md) | Client↔server contracts, dev proxy, full data flow |
| [docs/api-contracts-server.md](./docs/api-contracts-server.md) | All endpoints with request/response shapes |
| [docs/data-models-server.md](./docs/data-models-server.md) | Prisma schema, ERD, field constraints |
| [docs/component-inventory-client.md](./docs/component-inventory-client.md) | Pages, components, hooks, design system |
| [docs/source-tree-analysis.md](./docs/source-tree-analysis.md) | Annotated directory tree for both parts |
| [docs/development-guide.md](./docs/development-guide.md) | Setup, testing, build, DB management, common tasks |

---

## License

MIT

## Contributing

Issues and enhancement requests welcome.
