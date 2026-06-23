# Architecture — client

**Generated:** 2026-06-23  
**Part:** client  
**Project type:** web  
**Pattern:** React SPA — component hierarchy with custom hook API layer

---

## Executive Summary

The client is a React 18 single-page application built with Vite and styled with Tailwind CSS. It communicates exclusively with the server via the native `fetch` API, through a set of custom React hooks that encapsulate all HTTP lifecycle state (loading, error, retry). There is no state management library — React's built-in `useState`/`useEffect` is sufficient for this scope.

The application has three pages: work request creation, candidate shortlisting with squad assembly, and a history view with a detail panel.

---

## Architecture Diagram

```
Browser
   │
   ▼
index.html  ◄── Vite (dev) / static host (prod)
   │
   ▼
main.tsx  → ReactDOM.createRoot → <App />
                                      │
                              <BrowserRouter>
                              <Routes>
                              ├── /                   → <WorkRequestPage />
                              ├── /work-requests/:id/shortlist → <ShortlistPage />
                              └── /history            → <HistoryPage />
                              (all wrapped in <Layout />)

Each page delegates API calls to custom hooks:

┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐
│  WorkRequest │    │  ShortlistPage     │    │  HistoryPage     │
│  Page        │    │                    │    │                  │
│ useSkills    │    │ useShortlist       │    │ useWorkRequests  │
│ useRoles     │    │ useSquadMutation   │    │ useWorkRequest-  │
│ useCreate-   │    │ (via SquadPanel)   │    │ Detail           │
│ WorkRequest  │    │                   │    │                  │
└──────────────┘    └──────────┬────────┘    └──────────────────┘
                               │
                          <SquadPanel />
                       (candidate selection,
                        skill coverage meter,
                        save confirmation)

All hooks → fetch('/api/*') → [Vite proxy in dev] → Express server
```

---

## Layer Breakdown

### 1. Entry Point

| File | Role |
|------|------|
| `index.html` | Vite HTML template; mounts `<div id="root">` |
| `src/main.tsx` | `ReactDOM.createRoot` + renders `<App />` with React Strict Mode |
| `src/App.tsx` | `<BrowserRouter>` + `<Routes>` — declares all 3 routes under `<Layout>` |

### 2. Layout (`src/components/Layout.tsx`)

Shared shell rendered for every route via React Router's `<Outlet>`. Contains:
- Top navigation bar with links to "/" (Create Request) and "/history"
- Content wrapper that renders the active page via `<Outlet />`

### 3. Pages (`src/pages/`)

Route-level components. Each page owns its heading and orchestrates data hooks.

| Page | Route | Responsibility |
|------|-------|---------------|
| `WorkRequestPage` | `/` | Multi-field form with client-side validation. On success, navigates to the shortlist. Loads skills and roles from API for multi-select pill inputs. |
| `ShortlistPage` | `/work-requests/:id/shortlist` | Fetches and displays the ranked candidate shortlist. Also fetches the work request detail to pre-populate an existing squad. Renders `<SquadPanel>` below the table. |
| `HistoryPage` | `/history` | Paginated list of all work requests. Click-to-expand detail panel (master-detail layout on `lg:` breakpoint). Shows squad status per row. |

### 4. Components (`src/components/`)

| Component | Responsibility |
|-----------|---------------|
| `Layout` | Navigation shell + `<Outlet>` content area |
| `SquadPanel` | Squad assembly widget — checkbox selection table, live skill coverage percentage, save/retry button, success and error toasts. Pre-populates from an existing squad on load. |

**`SquadPanel` state machine:**
```
idle → selecting → [save] → saving → success | error
                                  ↑_______retry__|
```

Skill coverage is recalculated client-side on every selection change using `useMemo`.

### 5. Custom Hooks (`src/hooks/`)

All API communication is isolated here. Every hook follows the same `ApiState<T>` interface:

```typescript
interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}
```

| Hook | Method | Endpoint | Notes |
|------|--------|----------|-------|
| `useSkills` | GET | `/api/skills` | Fetches once on mount |
| `useRoles` | GET | `/api/roles` | Fetches once on mount |
| `useWorkRequests` | GET | `/api/work-requests` | Paginated; re-fetches on page/pageSize change |
| `useWorkRequestDetail` | GET | `/api/work-requests/:id` | Fetches when `id` changes; skips when id is null |
| `useShortlist` | GET | `/api/work-requests/:id/shortlist` | Maps raw API response to `ScoredCandidate[]`; scales breakdown factors ×100 to percentage |
| `useCreateWorkRequest` | POST | `/api/work-requests` | Returns `{ id }` on success; exposes `fieldErrors` on 400 |
| `useSquadMutation` | POST | `/api/work-requests/:id/squad` | Mutation hook (no auto-fetch); returns `SquadSummary` on success |

### 6. Types (`src/types.ts`)

Single source of truth for all TypeScript interfaces shared across pages and hooks. Mirrors the server API response shapes.

Key types: `WorkRequest`, `WorkRequestInput`, `ScoredCandidate`, `ScoreBreakdown`, `SquadSummary`, `SquadMember`, `PaginatedResponse<T>`, `ApiState<T>`, `UrgencyLevel`.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Custom hooks over a query library | Scope doesn't warrant React Query/SWR; hooks keep dependencies minimal |
| No global state manager | All state is local to pages; no cross-page state sharing needed |
| Client-side skill coverage calculation | Avoids a round-trip; provides instant feedback as the user selects candidates |
| `useCallback` on all fetch functions | Prevents infinite re-render loops in `useEffect` dependency arrays |
| Vite proxy for `/api/*` | Enables same-origin fetch calls from the dev SPA without CORS configuration |
| `react-router-dom` 6.28 pinned | Exact version pin for reproducibility; uses `<Routes>` + `<Route element>` API (v6) |
| Form validation on submit + inline | `submitted` flag gates inline error clearing — errors only show after first submit attempt |

---

## State Management Pattern

No external state library. State is managed at the page level:

```
Page component
├── useXxx hook  →  { data, isLoading, error, retry }
├── local useState for form fields / selection sets
└── passes props down to child components
```

`SquadPanel` receives `candidates`, `requiredSkills`, and `existingSquadMembers` as props; manages its own `selectedIds` set internally.

---

## Routing

| Path | Component | Notes |
|------|-----------|-------|
| `/` | `WorkRequestPage` | Default route |
| `/work-requests/:id/shortlist` | `ShortlistPage` | `id` is the work request CUID |
| `/history` | `HistoryPage` | |

All routes share the `<Layout>` shell via React Router's nested route with `<Outlet>`.

---

## Accessibility Notes

All interactive elements use semantic HTML:
- Forms use `<label>` + `for`/`id` associations
- Skill/role toggles are `<input type="checkbox">` / `<input type="radio">` hidden with `.sr-only`, wrapped in `<label>`
- Error messages use `role="alert"` and `aria-describedby` links to inputs
- Loading states use `role="status"` with `aria-live="polite"`
- `SquadPanel` table uses `aria-label` and `scope="col"` header cells
- Pagination buttons use `aria-label` for screen reader context

---

## Build & Dev

```bash
# Development (Vite HMR on :5173, proxies /api/* to :3001)
pnpm --filter client dev

# Production build (tsc type-check + Vite bundle → client/dist/)
pnpm --filter client build

# Preview production build locally
pnpm --filter client preview

# Unit/component tests (Vitest + jsdom)
pnpm --filter client test

# E2E tests (Playwright — starts Vite dev server automatically)
pnpm --filter client test:e2e
```

Vite config (`vite.config.ts`) registers the React plugin and the `/api` proxy. TypeScript config (`tsconfig.json`) extends the root strict base and is type-check only (no `emit` — Vite handles bundling).
