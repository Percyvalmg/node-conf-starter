# Development Guide — node-conf-starter

**Generated:** 2026-06-23

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 (22 LTS recommended) | Pinned in `.nvmrc` — run `nvm use` or `fnm use` |
| pnpm | 9.x | Specified in `package.json` `packageManager` field |

Install pnpm if you don't have it:
```bash
npm install -g pnpm@9
```

No database server is required — SQLite runs as a local file.

---

## Initial Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd node-conf-starter

# 2. Switch to the pinned Node version
nvm use        # or: fnm use

# 3. Install all workspace dependencies (server + client + root)
pnpm install

# 4. Set up the server environment file
cp server/.env.example server/.env
# Edit server/.env if needed — the default DATABASE_URL points to server/prisma/dev.db

# 5. Generate the Prisma client and create the SQLite database
pnpm --filter server db:generate
pnpm --filter server db:migrate

# 6. (Optional but recommended) Seed with sample data
#    This creates 6 role types, 20 skills, and 15 candidates
pnpm db:seed   # from repo root — delegates to prisma/seed.ts
```

---

## Running in Development

```bash
# Start both server and client with hot reload (from repo root)
pnpm dev
```

This uses `concurrently` to run both workspaces simultaneously:

| App | URL | Hot reload |
|-----|-----|-----------|
| Client (Vite) | http://localhost:5173 | ✅ HMR |
| Server (tsx) | http://localhost:3001 | ✅ file-watch via tsx |

Vite automatically proxies `/api/*` requests to `http://localhost:3001`, so the client makes same-origin fetch calls in development.

To run each app independently:
```bash
pnpm --filter server dev   # backend only
pnpm --filter client dev   # frontend only
```

---

## Environment Variables

### `server/.env`

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3001           # optional — default is 3001
NODE_ENV=development
```

The server will **not start** without a valid `DATABASE_URL`. Copy `.env.example` to `.env` before first run.

---

## Testing

### Unit and integration tests

```bash
# Run all tests across both workspaces (CI-friendly, exits after run)
pnpm test

# Server tests only (Vitest + Supertest)
pnpm --filter server test
pnpm --filter server test:watch      # watch mode
pnpm --filter server test:coverage   # coverage report → server/coverage/

# Client tests only (Vitest + Testing Library + jsdom)
pnpm --filter client test
pnpm --filter client test:watch
pnpm --filter client test:coverage
```

### End-to-end tests (Playwright)

Playwright must have browsers installed once per machine:
```bash
npx playwright install
```

Then run e2e tests (Playwright starts the Vite dev server automatically):
```bash
pnpm test:e2e                         # from root
pnpm --filter client test:e2e         # from client workspace
pnpm --filter client test:e2e:ui      # interactive UI mode
```

E2E test files live in `client/e2e/`. The Playwright config (`client/playwright.config.ts`) starts the Vite dev server on a random port before running specs.

### Test structure

| Suite | Location | Tool | What it covers |
|-------|----------|------|----------------|
| Server route integration | `server/tests/routes/` | Vitest + Supertest | All HTTP endpoints against a live Express app |
| Scoring engine unit | `server/tests/scoring/` | Vitest | Pure function logic; includes property-based tests via fast-check |
| Prisma layer | `server/tests/prisma/` | Vitest | ORM queries |
| Client component | `client/tests/components/` | Vitest + Testing Library | SquadPanel, WorkRequestForm, HistoryList |
| Client app | `client/tests/App.test.tsx` | Vitest + Testing Library | Top-level routing smoke test |
| E2E | `client/e2e/` | Playwright | Full user journeys (work request → shortlist → squad assembly) |

---

## Building for Production

```bash
# Build both workspaces
pnpm build

# Outputs:
#   server/dist/      — compiled JS (Node.js runnable)
#   client/dist/      — static assets (serve with any HTTP host)

# Start the production server
pnpm start            # runs server/dist/index.js
```

The client build (`client/dist/`) is a standard Vite static bundle. In production, configure your reverse proxy (nginx, Caddy, etc.) to:
- Serve `client/dist/` for all non-API paths
- Proxy `/api/*` to the backend process

---

## Database Management

All commands run from the **repo root** using pnpm workspace filter:

```bash
pnpm --filter server db:migrate          # Apply pending migrations (dev — creates db if needed)
pnpm --filter server db:migrate:deploy   # Apply migrations without prompts (production)
pnpm --filter server db:generate         # Regenerate Prisma client after schema changes
pnpm --filter server db:seed             # Seed roles, skills, 15 candidates
pnpm --filter server db:studio           # Open Prisma Studio at http://localhost:5555
```

Or using the root-level alias:
```bash
pnpm db:seed         # defined in root package.json → tsx server/prisma/seed.ts
```

### Making schema changes

1. Edit `server/prisma/schema.prisma`
2. Run `pnpm --filter server db:migrate` — Prisma creates a new migration file and applies it
3. Run `pnpm --filter server db:generate` — regenerates the Prisma client
4. Commit both the schema and the migration file

---

## Code Quality

```bash
# Lint all workspaces
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Check formatting
pnpm format:check

# Auto-format everything
pnpm format
```

- **ESLint** — flat config in `eslint.config.mjs`; covers JS, TS, React hooks, and Prettier compatibility
- **Prettier** — config in `.prettierrc.json`; ignored paths in `.prettierignore`
- TypeScript strict mode is on for both workspaces (via root `tsconfig.json`)

---

## Common Development Tasks

### Add a new API endpoint

1. Add the route handler in `server/src/routes/` (or `workRequests.ts` for work-request-related logic)
2. Mount it in `server/src/routes/api.ts` if it's a new router
3. Add integration tests in `server/tests/routes/`
4. Add a corresponding hook in `client/src/hooks/` if the client needs to call it
5. Update `docs/api-contracts-server.md`

### Add a new Prisma model

1. Edit `server/prisma/schema.prisma`
2. Run `pnpm --filter server db:migrate`
3. Run `pnpm --filter server db:generate`
4. Update `docs/data-models-server.md`

### Add a new client page

1. Create the component in `client/src/pages/`
2. Add a `<Route>` in `client/src/App.tsx`
3. Add a navigation link in `client/src/components/Layout.tsx` if needed
4. Update `docs/component-inventory-client.md`

### Add new seed data

Edit `server/prisma/seed.ts`. The seed script uses `upsert` — it is safe to re-run without creating duplicates.

---

## Port Reference

| Service | Default Port | Override |
|---------|-------------|---------|
| Vite dev server (client) | 5173 | `vite.config.ts` `server.port` |
| Express server | 3001 | `PORT` env var in `server/.env` |
| Prisma Studio | 5555 | n/a |

Port 5000 is intentionally avoided — macOS uses it for AirPlay Receiver.
