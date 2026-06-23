# Design Document

## Overview

This design consolidates the candidate shortlist and squad assembly into a single Work Request Detail Page, adds navigation improvements, introduces a non-matching test candidate, and tunes pagination. The changes are primarily client-side with a small server-side addition (DELETE endpoint + seed data).

## Architecture Changes

### New Route: `/work-requests/:id`

A new `WorkRequestDetailPage` component replaces the separate `ShortlistPage` as the primary post-creation destination. It combines:
- Work request metadata display (title, description, urgency, duration, skills, roles)
- Candidate shortlist table with inline checkboxes for squad selection
- Squad confirmation bar with skill coverage and save action
- Delete work request action

### Routing Updates (App.tsx)

```
/                           → WorkRequestPage (create form) — unchanged
/work-requests/:id          → WorkRequestDetailPage (NEW — detail + shortlist + assembly)
/work-requests/:id/shortlist → redirect to /work-requests/:id (backward compat)
/history                    → HistoryPage — unchanged
```

### Navigation Flow

```
[Create Form] → submit → [Detail Page /work-requests/:id]
                              ↕ back button
[History Page] → click item → [Detail Page /work-requests/:id]
```

## Component Design

### WorkRequestDetailPage

**File:** `client/src/pages/WorkRequestDetailPage.tsx`

**Responsibilities:**
- Fetches work request detail via `useWorkRequestDetail(id)`
- Fetches shortlist via `useShortlist(id)`
- Renders work request metadata section
- Renders unified shortlist table with checkboxes (merges ShortlistTable + SquadPanel behaviour)
- Provides back navigation to `/history`
- Provides delete action with confirmation

**State:**
- `selectedIds: Set<string>` — candidate IDs selected for the squad
- Pre-populated from `workRequest.squad.members` when a squad exists

**Key behaviours:**
- Checkbox toggle directly in the shortlist table rows
- Summary bar appears when any candidate is selected showing count + coverage %
- Confirm saves via `useSquadMutation`
- Delete calls new `DELETE /api/work-requests/:id` then navigates to `/history`

### Updated Components

**ShortlistPage** — Kept as a redirect to `/work-requests/:id` for backward compatibility with any bookmarked URLs.

**WorkRequestPage** — Change `navigate` target from `/work-requests/${result.id}/shortlist` to `/work-requests/${result.id}`.

**HistoryPage** — Change `pageSize` from 50 to 10. Update list item click to navigate to `/work-requests/:id` instead of opening inline detail panel.

**Layout** — No changes needed (nav links remain "New Request" and "History").

## Server Changes

### DELETE /api/work-requests/:id

**File:** `server/src/routes/workRequests.ts`

Cascade delete in order:
1. SquadMember records (via squad)
2. Squad record
3. WorkRequestSkill records
4. WorkRequestRole records
5. WorkRequest record

Returns 204 No Content on success, 404 if not found.

### Seed Data Addition

**File:** `server/prisma/seed.ts`

Add a new candidate and unique skills/role:

```typescript
{
  name: 'Olga Petrova',
  role: 'UX Researcher',
  skills: ['User Interviews', 'Usability Testing', 'Wireframing'],
  availabilityBand: 85,
  workloadIndicator: 1,
  businessUnit: 'Digital Platforms',
}
```

- New role type: `UX Researcher` (added to ROLE_TYPES)
- New skills: `User Interviews`, `Usability Testing`, `Wireframing` (added to SKILLS)
- These skills don't overlap with any existing work request requirements, ensuring the candidate is excluded from shortlists for standard skill sets

## Client Hook Changes

### useWorkRequestDelete (new)

**File:** `client/src/hooks/useWorkRequestDelete.ts`

```typescript
export function useWorkRequestDelete(): {
  deleteRequest: (id: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
}
```

Calls `DELETE /api/work-requests/:id`.

## Pagination Design

The HistoryPage already implements pagination correctly. The only change is reducing `pageSize` from 50 to 10 in the `useWorkRequests(page, 10)` call. The existing `Pagination` component handles Previous/Next/disable logic.

## Migration Considerations

- No Prisma schema changes required — the existing schema supports all operations
- The seed file needs to be re-run after adding the new candidate: `npx prisma db seed`
- The new DELETE endpoint uses Prisma's cascading deletes via transaction
