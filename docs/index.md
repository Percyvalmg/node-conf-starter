# Project Documentation Index — node-conf-starter

**Generated:** 2026-06-23  
**Scan level:** Deep  
**Repository type:** pnpm monorepo — 2 parts (server, client)

> This is the primary entry point for AI-assisted development on this project.
> Point any brownfield PRD or feature planning workflow here first.

---

## Project Overview

- **Type:** pnpm monorepo with 2 parts
- **Domain:** Squad Assembly — work request creation, candidate scoring, shortlisting, and squad confirmation
- **Primary Language:** TypeScript (both parts)
- **Architecture:** React SPA + Express REST API + Prisma/SQLite

### Parts

#### server (`server/`)
- **Type:** backend
- **Tech:** Node.js 20+, Express 4, TypeScript, Prisma 5, SQLite, Vitest, Supertest
- **Entry point:** `server/src/index.ts`
- **Architecture pattern:** Layered REST API — Route handlers → Scoring engine (pure) → Prisma ORM → SQLite

#### client (`client/`)
- **Type:** web
- **Tech:** React 18, Vite, TypeScript, Tailwind CSS, Vitest, Testing Library, Playwright
- **Entry point:** `client/src/main.tsx` → `App.tsx`
- **Architecture pattern:** React SPA — Pages → Custom hooks → fetch → server `/api/*`

---

## Generated Documentation

### Core Architecture
- [Project Overview](./project-overview.md) — purpose, tech stack table, getting started
- [Architecture — Server](./architecture-server.md) — Express layering, scoring engine, design decisions
- [Architecture — Client](./architecture-client.md) — React component tree, hook layer, routing, state pattern
- [Integration Architecture](./integration-architecture.md) — client↔server HTTP contracts, dev proxy, full data flow

### API & Data
- [API Contracts — Server](./api-contracts-server.md) — all 11 endpoints with request/response shapes and scoring formula
- [Data Models — Server](./data-models-server.md) — 8 Prisma models, ERD, field constraints, migration guide

### Components & Code Map
- [Component Inventory — Client](./component-inventory-client.md) — all pages, shared components, hooks, design system notes
- [Source Tree Analysis](./source-tree-analysis.md) — annotated directory tree for both parts with critical folder guide

### Development
- [Development Guide](./development-guide.md) — setup, running, testing, building, DB management, common tasks

---

## Existing Documentation

- [README.md](../README.md) — project description, quick start, scripts reference, API table

---

## Getting Started (Quick Reference)

```bash
nvm use                                    # switch to Node 22 LTS
pnpm install                               # install all workspace deps
cp server/.env.example server/.env         # configure DATABASE_URL
pnpm --filter server db:generate           # generate Prisma client
pnpm --filter server db:migrate            # create SQLite DB + run migrations
pnpm db:seed                               # seed roles, skills, 15 candidates
pnpm dev                                   # start both apps (client :5173, server :3001)
```

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `server/src/routes/workRequests.ts` | Core API — work request CRUD, shortlist, squad save |
| `server/src/scoring/engine.ts` | Pure scoring algorithm — `rankCandidates()` |
| `server/prisma/schema.prisma` | Database schema — 8 models |
| `server/prisma/seed.ts` | Sample data — 6 roles, 20 skills, 15 candidates |
| `client/src/App.tsx` | Route definitions (3 routes) |
| `client/src/types.ts` | All shared TypeScript interfaces |
| `client/src/components/SquadPanel.tsx` | Squad assembly widget |
| `client/src/hooks/useShortlist.ts` | Shortlist fetch + response mapping |
| `client/src/pages/WorkRequestPage.tsx` | Work request creation form |
| `client/vite.config.ts` | Vite build config + `/api` proxy |
| `pnpm-workspace.yaml` | Declares server/ and client/ as workspaces |

---

## For AI-Assisted Feature Planning

When starting a new feature, load these documents based on scope:

| Feature scope | Load these docs |
|---------------|----------------|
| New API endpoint | `architecture-server.md` + `api-contracts-server.md` + `data-models-server.md` |
| New client page/component | `architecture-client.md` + `component-inventory-client.md` |
| Full-stack feature | Both architecture docs + `integration-architecture.md` |
| DB schema change | `data-models-server.md` + `architecture-server.md` |
| Scoring logic change | `architecture-server.md` (scoring engine section) + `api-contracts-server.md` (shortlist endpoint) |

---

## State File

Scan metadata is stored in [project-scan-report.json](./project-scan-report.json).  
To regenerate documentation, run `/bmad-document-project` and choose "Re-scan entire project".
