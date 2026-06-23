# Project Overview — node-conf-starter

**Generated:** 2026-06-23  
**Version:** 1.0.0  
**Repository type:** pnpm monorepo (2 parts)

---

## Purpose

**node-conf-starter** is a full-stack Squad Assembly application. It lets staff create *work requests* — describing a delivery need with required skills, roles, urgency, and duration — and then automatically scores and ranks available candidates to produce a shortlist. The user selects candidates from the shortlist to assemble and save a squad.

The repository doubles as a conference starter template demonstrating modern Node.js + React full-stack patterns with TypeScript, Prisma ORM, Vite, Tailwind CSS, Vitest, and Playwright.

---

## Architecture Type

**Multi-part monorepo** — a pnpm workspace containing an Express REST API backend and a React SPA frontend. The frontend proxies `/api/*` to the backend during development, and in production is served as static assets alongside the backend process.

---

## Parts Summary

| Part | Root | Type | Primary Tech |
|------|------|------|--------------|
| server | `server/` | REST API backend | Node.js 20+, Express 4, TypeScript, Prisma 5, SQLite |
| client | `client/` | React SPA frontend | React 18, Vite, TypeScript, Tailwind CSS |

---

## Tech Stack Summary

### Server
| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Node.js | ≥ 20 (pinned 22 LTS) |
| Language | TypeScript | ^5.6 |
| Framework | Express | ^4.21 |
| ORM | Prisma | ^5.22 |
| Database | SQLite | via Prisma |
| Test runner | Vitest | ^3.2 |
| HTTP test client | Supertest | ^7.2 |
| Property testing | fast-check | ^4.8 |

### Client
| Category | Technology | Version |
|----------|------------|---------|
| Language | TypeScript | ^5.6 |
| UI library | React | ^18.3 |
| Build tool | Vite | ^6.4 |
| CSS framework | Tailwind CSS | ^3.4 |
| Unit/component tests | Vitest + Testing Library | ^3.2 |
| E2E tests | Playwright | ^1.49 |
| Router | React Router DOM | 6.28 |

---

## Key Features

1. **Work Request creation** — form with title, description, required skills (multi-select, up to 20), required roles (multi-select, up to 10), urgency level (Critical/High/Medium/Low), and duration in weeks.
2. **Candidate shortlisting** — server-side scoring engine ranks all candidates against a work request. Score is a weighted composite of skill match (40%), role alignment (20%), availability (25% × urgency multiplier), and workload (15%).
3. **Squad assembly** — user selects candidates from the ranked shortlist; the UI calculates live skill coverage. On confirmation the squad is persisted and skill coverage is stored.
4. **Work Request history** — paginated list of all past requests with urgency badge and squad status indicator. Click any row to expand a detail panel showing the assembled squad.

---

## Repository Structure (top-level)

```
node-conf-starter/
├── server/          # Express REST API backend
├── client/          # React SPA frontend
├── docs/            # Generated project documentation (this folder)
├── _bmad/           # BMAD workflow tooling
├── _bmad-output/    # BMAD planning / implementation artifacts
├── package.json     # Root workspace scripts (pnpm)
├── pnpm-workspace.yaml
├── tsconfig.json    # Shared strict TypeScript base config
├── eslint.config.mjs
├── .prettierrc.json
└── .nvmrc           # Pins Node 22 LTS
```

---

## Getting Started

```bash
# 1. Select the pinned Node version
nvm use          # or: fnm use

# 2. Install all workspace dependencies
pnpm install

# 3. (Optional) Set up SQLite database
cp server/.env.example server/.env
pnpm --filter server db:generate
pnpm --filter server db:migrate
pnpm --filter server db:seed

# 4. Run both apps in dev mode
pnpm dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Vite proxies `/api/*` → backend automatically

---

## Links

- [Architecture — Server](./architecture-server.md)
- [Architecture — Client](./architecture-client.md)
- [API Contracts](./api-contracts-server.md)
- [Data Models](./data-models-server.md)
- [Source Tree](./source-tree-analysis.md)
- [Component Inventory](./component-inventory-client.md)
- [Development Guide](./development-guide.md)
- [Integration Architecture](./integration-architecture.md)
- [Master Index](./index.md)
