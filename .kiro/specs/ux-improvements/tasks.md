# Implementation Tasks

Vertical slices — each is a thin end-to-end tracer bullet that's independently demoable.

---

## Task 1: Add non-matching test candidate to seed data

**Blocked by:** None — can start immediately

### What to build

Add a candidate to the talent pool whose skills and role have zero overlap with the existing skill/role vocabulary used in work requests. This lets us verify the scoring engine correctly excludes non-matching candidates from shortlists.

### Acceptance criteria

- [x] A new role type `UX Researcher` is added to the seed role types
- [x] Three new skills (`User Interviews`, `Usability Testing`, `Wireframing`) are added to the seed skills
- [x] A candidate "Olga Petrova" (role: UX Researcher, skills: User Interviews / Usability Testing / Wireframing, availabilityBand: 85, workloadIndicator: 1) is added to the seed candidates
- [x] After re-seeding (`npx prisma db seed`), creating a work request with any combination of existing standard skills produces a shortlist that does NOT include Olga Petrova

---

## Task 2: Add DELETE work request endpoint

**Blocked by:** None — can start immediately

### What to build

A server endpoint that removes a work request and all associated data (squad members, squad, skill associations, role associations) in a single transaction. This is the backend support for the "Delete" action on the detail page.

### Acceptance criteria

- [x] `DELETE /api/work-requests/:id` removes the work request and all associated records (SquadMember, Squad, WorkRequestSkill, WorkRequestRole, WorkRequest) in a transaction
- [x] Returns 204 No Content on success
- [x] Returns 404 with `{ error: "Work request not found" }` if the ID doesn't exist
- [x] After deletion, `GET /api/work-requests/:id` returns 404

---

## Task 3: Work Request Detail Page — view metadata + shortlist with inline squad selection

**Blocked by:** None — can start immediately

### What to build

A new `WorkRequestDetailPage` component that serves as the single hub for a work request. It displays the request's metadata, shows the scored candidate shortlist with checkboxes for direct squad selection, provides a summary bar with skill coverage, and allows saving/modifying the squad — all on one page. Includes a back button to navigate to the history page.

### Acceptance criteria

- [x] New file `client/src/pages/WorkRequestDetailPage.tsx` created
- [x] Page fetches and displays work request metadata: title, description, urgency badge, duration, required skills, required roles, creation date
- [x] Page fetches and displays the scored candidate shortlist table with columns: checkbox, rank, name, role, match score, matched skills, availability, workload, details (expand/collapse)
- [x] Clicking a checkbox or row toggles candidate selection; a summary bar appears showing selected count, combined skill coverage %, and a "Confirm Squad" button
- [x] Confirming saves the squad via `POST /api/work-requests/:id/squad` and shows success feedback without navigating away
- [x] If a squad already exists, its members are pre-checked when the page loads; the user can modify and re-save
- [x] A "Back" link/button at the top navigates to `/history`
- [x] New hook `client/src/hooks/useWorkRequestDelete.ts` is created (calls `DELETE /api/work-requests/:id`)
- [x] A "Delete Work Request" button with a confirmation prompt is present; on success it navigates to `/history`

---

## Task 4: Post-creation navigation + routing wiring

**Blocked by:** Task 3

### What to build

Wire the new detail page into the application's routing and navigation flow. After creating a work request, the user lands on the detail page. The old shortlist route redirects to the detail page for backward compatibility.

### Acceptance criteria

- [x] Route `/work-requests/:id` in `App.tsx` renders `WorkRequestDetailPage`
- [x] Route `/work-requests/:id/shortlist` redirects (via `<Navigate>`) to `/work-requests/:id`
- [x] After successfully submitting the create form, the app navigates to `/work-requests/:id` (not `/work-requests/:id/shortlist`)
- [x] The detail page automatically loads and displays the candidate shortlist for the newly created work request

---

## Task 5: Delete work request from detail page

**Blocked by:** Tasks 2, 3

### What to build

Connect the delete button on the detail page to the server DELETE endpoint. The full vertical path: user clicks Delete → confirmation dialog → API call → navigate to history.

### Acceptance criteria

- [x] Clicking "Delete Work Request" on the detail page shows a confirmation prompt (e.g., browser confirm or inline modal)
- [x] On confirmation, calls `DELETE /api/work-requests/:id`
- [x] On success (204), navigates to `/history`
- [x] On failure, displays an error message without navigating away
- [x] The deleted work request no longer appears in the history list

---

## Task 6: History page — reduce page size + navigate to detail page

**Blocked by:** Task 4

### What to build

Refactor the history page to show 10 items per page (down from 50) and navigate directly to the detail page when clicking a work request, removing the inline detail panel.

### Acceptance criteria

- [x] History page shows a maximum of 10 work requests per page
- [x] Pagination controls (Previous / page X of Y / Next) are visible and functional when there are more than 10 items
- [x] Clicking a work request in the list navigates to `/work-requests/:id` (the detail page)
- [x] The inline detail panel (`WorkRequestDetail` component) and `selectedId` state are removed from HistoryPage
- [x] "Previous" button is disabled on page 1; "Next" button is disabled on the last page
- [x] Navigating pages does not cause errors or stale state
