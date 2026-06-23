# Component Inventory — client

**Generated:** 2026-06-23  
**Framework:** React 18 + TypeScript  
**Styling:** Tailwind CSS 3

---

## Overview

The client has a small, focused component set. Pages are the primary composition units; shared components handle the two reusable interactions (shell layout and squad assembly).

| Category | Count |
|----------|-------|
| Layout/Shell | 1 |
| Shared feature components | 1 |
| Page components | 3 |
| Inline sub-components (page-local) | 8 |
| Custom hooks | 6 |

---

## Layout Components

### `Layout` — `src/components/Layout.tsx`

**Type:** Shell / wrapper  
**Used by:** All routes (registered as the parent `<Route element>` in `App.tsx`)

Renders the application chrome: top navigation bar with links and an `<Outlet>` for the active page content.

**Props:** none (uses React Router's `<Outlet>`)

**Navigation links:**
- "Squad Assembly" (logo/home) → `/`
- "New Request" → `/`
- "History" → `/history`

---

## Shared Feature Components

### `SquadPanel` — `src/components/SquadPanel.tsx`

**Type:** Interactive feature widget  
**Used by:** `ShortlistPage`

The core squad assembly interaction. Displays all scored candidates in a selectable table, calculates live skill coverage, and saves the confirmed squad via `useSquadMutation`.

**Props:**
```typescript
interface SquadPanelProps {
  workRequestId: string;           // Used by useSquadMutation
  candidates: ScoredCandidate[];   // Ranked list from shortlist API
  requiredSkills: string[];        // For skill coverage calculation
  existingSquadMembers?: SquadMember[]; // Pre-populates selection on load
  onSquadSaved?: (skillCoveragePercent: number) => void; // Parent callback
}
```

**Internal state:**
- `selectedIds: Set<string>` — selected candidate IDs
- `savedSuccessfully: boolean` — controls success toast visibility

**Computed (useMemo):**
- `skillCoverage: number` — distinct matched skills / required skills × 100

**Interactions:**
- Row click or checkbox toggles selection
- "×" button on selected candidate chip deselects
- "Confirm Squad" button calls `saveSquad(ids)` via `useSquadMutation`
- Retry button appears in error toast

**Accessibility:** Table has `aria-label`; checkboxes have `aria-label` with candidate name; confirm button has `aria-label`.

---

## Page Components

### `WorkRequestPage` — `src/pages/WorkRequestPage.tsx`

**Route:** `/`  
**Purpose:** Create a new work request

**Data hooks used:**
- `useSkills()` — populates skill pill selector
- `useRoles()` — populates role pill selector
- `useCreateWorkRequest()` — form submission

**Form fields:**
| Field | Control | Validation |
|-------|---------|------------|
| Title | `<input type="text">` | Required, max 150 chars |
| Description | `<textarea>` | Optional, max 2000 chars, char counter shown |
| Required Skills | Pill checkboxes | 1–20 selections |
| Required Roles | Pill radio-style checkboxes | 1–10 selections |
| Urgency Level | Radio buttons (Critical/High/Medium/Low) | Required |
| Duration (weeks) | `<input type="number">` | Required, integer 1–104 |

**Validation strategy:** Client-side validation on submit (`validateForm()`). Inline error clearing on field change (only after first submit attempt, via `submitted` flag). Server 400 field errors surface into the same error slots.

**On success:** Navigates to `/work-requests/:id/shortlist` via `useNavigate`.

---

### `ShortlistPage` — `src/pages/ShortlistPage.tsx`

**Route:** `/work-requests/:id/shortlist`  
**Purpose:** Display ranked candidates and assemble a squad

**Data hooks used:**
- `useShortlist(id)` — fetches scored candidates
- Direct `fetch('/api/work-requests/:id')` (not via hook) — fetches work request for squad pre-population

**Inline sub-components:**

| Component | Purpose |
|-----------|---------|
| `EmptyState` | Shown when no candidates qualify (no skill overlap) |
| `InfoMessage` | Shown when fewer than 10 candidates qualify — informs user of the count |
| `ShortlistTable` | Renders the ranked candidate table, delegates rows to `CandidateRow` |
| `CandidateRow` | Single table row; toggles score breakdown panel on "Details" click |
| `AvailabilityIndicator` | Green dot + value (≥70%) or amber dot + warning (< 70%) |
| `ScoreBreakdownPanel` | Expandable panel showing 4 score factors with progress bars and weights |

**Renders `<SquadPanel>`** below the table when an `id` is available.

---

### `HistoryPage` — `src/pages/HistoryPage.tsx`

**Route:** `/history`  
**Purpose:** Browse past work requests with an expandable detail panel

**Data hooks used:**
- `useWorkRequests(page, 50)` — paginated work request list
- `useWorkRequestDetail(selectedId)` — detail for selected row

**Layout:** Two-column grid (`lg:grid-cols-2`) — list on left, detail panel on right.

**Inline sub-components:**

| Component | Purpose |
|-----------|---------|
| `UrgencyBadge` | Colour-coded pill (Critical=red, High=orange, Medium=yellow, Low=green) |
| `SquadStatus` | "Assembled" (indigo) or "Pending" (grey) lozenge |
| `HistoryList` | `<ul>` of clickable work request rows with urgency badge + squad status |
| `Pagination` | Previous/Next navigation shown only when totalPages > 1 |
| `WorkRequestDetail` | Expandable detail section — uses `useWorkRequestDetail`; shows skills, roles, squad members |

**Interaction:** Clicking a row toggles the detail panel (click again to close). Page change resets selection.

---

## Custom Hooks

See [Architecture — Client](./architecture-client.md#5-custom-hooks-srchooks) for full hook API documentation.

| Hook | Type | Endpoint |
|------|------|----------|
| `useSkills` | Query | `GET /api/skills` |
| `useRoles` | Query | `GET /api/roles` |
| `useWorkRequests` | Query (paginated) | `GET /api/work-requests` |
| `useWorkRequestDetail` | Query (conditional) | `GET /api/work-requests/:id` |
| `useShortlist` | Query | `GET /api/work-requests/:id/shortlist` |
| `useCreateWorkRequest` | Mutation | `POST /api/work-requests` |
| `useSquadMutation` | Mutation | `POST /api/work-requests/:id/squad` |

---

## Design System Notes

No component library is used. All styling is Tailwind CSS utility classes with these conventions:

| Pattern | Usage |
|---------|-------|
| `rounded-md bg-red-50 border border-red-200 p-4` | Error panels |
| `rounded-md bg-green-50 border border-green-200 p-3` | Success panels |
| `rounded-md bg-blue-50 border border-blue-200 p-4` | Info panels |
| `rounded-md bg-gray-50 border border-gray-200` | Neutral containers |
| `bg-indigo-600 text-white hover:bg-indigo-700` | Primary action buttons |
| `bg-indigo-100 text-indigo-800 border border-indigo-300` | Selected pill/chip state |
| `bg-emerald-100 text-emerald-800 border border-emerald-300` | Selected role pill state |
| `text-xs font-medium uppercase tracking-wider` | Table column headers |

Color semantics: indigo = primary/selected, emerald = roles, red = error/critical, amber = warning, green = success/high-availability.
