# Implementation Plan: Squad Assembly

## Overview

Build a full-stack squad assembly prototype that helps delivery leads assemble cross-functional squads. Work is organised into **vertical slices (tracer bullets)**: each slice cuts through every layer it needs (schema, API, UI, tests) and is independently demoable. The database schema evolves incrementally per slice rather than being defined up front. Each slice ends with an end-to-end verification checkpoint driven by the Playwright MCP before the next slice begins. Property-based tests (fast-check) validate the 12 correctness properties and live within the slice that owns the scoring engine.

## Slice Map

- **Slice 0 — Foundation & app shell**: talent pool schema + seed, reference-data endpoints, client routing/layout, shared types
- **Slice 1 — Capture & persist a work request**: work request schema, create/list/get API, work request form
- **Slice 2 — Score & present ranked shortlist**: scoring engine + property tests, shortlist API, shortlist UI
- **Slice 3 — Select & save a squad**: squad schema, squad API, squad selection UI
- **Slice 4 — View work request history**: history list/detail API, history UI
- **Slice 5 — End-to-end wiring & E2E suite**: proxy wiring, full-journey Playwright suite

## Tasks

- [x] 1. Slice 0 — Foundation & app shell
  - [x] 1.1 Define talent pool Prisma schema
    - Replace the existing `schema.prisma` with the talent pool models needed now: Candidate, Skill, CandidateSkill, RoleType
    - Defer WorkRequest, Squad, and related models to the slices that introduce them
    - Run `prisma migrate dev` to create the SQLite database and `prisma generate` for the client
    - _Requirements: 2.2_

  - [x] 1.2 Create seed script with mock talent pool data
    - Create `server/prisma/seed.ts` with at least 20 candidates across 5+ role types
    - Include at least 15 distinct skills across the talent pool
    - Minimum 2 candidates per role type (Architect, Engineer, Tester, Data Specialist, Delivery Manager)
    - Each candidate has 1-10 skills, availability band 0-100, workload indicator 0-10
    - Add seed script to `package.json` and Prisma config
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Implement skills and roles reference endpoints
    - GET `/api/skills` — return all distinct skill names from the talent pool
    - GET `/api/roles` — return all distinct role type names
    - Return empty array if no data exists
    - Create `server/src/routes/skills.ts` and `server/src/routes/roles.ts` and wire them into the main API router
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 1.4 Set up client routing, layout, and shared types
    - Install react-router-dom
    - Create `client/src/components/Layout.tsx` with NavBar
    - Set up route shells: `/` (work request form), `/work-requests/:id/shortlist`, `/history`
    - Create `client/src/types.ts` with shared TypeScript interfaces matching API types
    - Create `client/src/hooks/useSkills.ts` and `client/src/hooks/useRoles.ts` returning the `{ data, isLoading, error, retry }` pattern, and render the seeded skills/roles to prove the path end-to-end
    - _Requirements: 2.4, 2.5_

  - [x] 1.5 Write foundation tests
    - Seed smoke tests: minimum 20 candidates, 5+ role types, 15+ skills, 2+ candidates per required role type
    - Integration tests for skills and roles endpoints (including empty-collection behaviour)
    - Files: `server/tests/prisma/seed.test.ts`, `server/tests/routes/skills.test.ts`, `server/tests/routes/roles.test.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Checkpoint - Slice 0 verified (Playwright MCP)
  - Configure the Vite dev proxy so `/api` reaches the Express server, then start both servers manually
  - Use the Playwright MCP to load the app shell and confirm seeded skills and roles render from the live API
  - Ensure all tests pass; ask the user if questions arise

- [x] 3. Slice 1 — Capture & persist a work request
  - [x] 3.1 Extend schema with work request models
    - Add WorkRequest, WorkRequestSkill, WorkRequestRole models to `schema.prisma`
    - Run `prisma migrate dev` and `prisma generate`
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement work request create, list, and get routes
    - Create `server/src/routes/workRequests.ts` and wire into the main API router
    - POST `/api/work-requests` — create with validation (title 1-150 chars, description 0-2000 chars, skills 1-20, roles 1-10, urgency enum, duration 1-104 weeks); persist duplicate titles as distinct entries
    - GET `/api/work-requests` — list with pagination (default page size 20, max 100), ordered by creation date descending
    - GET `/api/work-requests/:id` — get work request details
    - Return structured 400 errors for validation failures with field identifiers
    - _Requirements: 1.1, 1.2, 1.3, 1.7, 6.3_

  - [x] 3.3 Implement the WorkRequestForm page
    - Create `client/src/pages/WorkRequestPage.tsx` with a `WorkRequestForm` component and a `client/src/hooks/useCreateWorkRequest.ts` mutation hook
    - SkillSelector (multi-select 1-20 from API), RoleSelector (multi-select 1-10 from API), UrgencySelector (radio group, no default), DurationInput (1-104 weeks)
    - Client-side validation with inline error messages; retain form data on validation failure or server error
    - On success, navigate to the shortlist route
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.4 Write work request tests
    - API integration tests: create (valid + duplicate title), list pagination, get by id, validation error responses
    - Component tests: form rendering, inline validation, data retention on error
    - Files: `server/tests/routes/workRequests.test.ts`, `client/tests/components/WorkRequestForm.test.tsx`
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 6.3_

- [x] 4. Checkpoint - Slice 1 verified (Playwright MCP)
  - Use the Playwright MCP to complete the form, submit a work request, and confirm it persists and the app navigates onward
  - Exercise a validation failure and confirm field errors show without clearing other inputs
  - Ensure all tests pass; ask the user if questions arise

- [ ] 5. Slice 2 — Score & present ranked shortlist
  - [x] 5.1 Implement scoring engine types and validation
    - Create `server/src/scoring/types.ts` with CandidateData, WorkRequestData, ScoredResult, ValidationWarning, RankingResult interfaces
    - Create `server/src/scoring/validation.ts` for input validation (missing fields, out-of-bounds values)
    - _Requirements: 7.1, 7.6, 1.3_

  - [x] 5.2 Implement scoring engine core functions
    - Create `server/src/scoring/engine.ts` as a pure function module
    - Implement `scoreCandidate(candidate, workRequest)` with the weighted formula: skill_match × 0.40 + role_alignment × 0.20 + availability × urgency_multiplier × 0.25 + workload × 0.15
    - Implement `rankCandidates(candidates, workRequest)` orchestration
    - Cap final score at 1.0 (express as integer 0-100), apply 1.5x urgency multiplier for Critical/High, exclude zero-skill-match and missing-input candidates (with validation warnings), sort by score descending then skill_match descending
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 5.3 Implement the shortlist route
    - GET `/api/work-requests/:id/shortlist` — fetch all candidates with skills, invoke the scoring engine, return top ranked candidates with score breakdowns
    - Exclude candidates with zero skill match
    - _Requirements: 3.1, 4.1, 4.3, 4.4_

  - [x] 5.4 Implement the ShortlistPage
    - Create `client/src/pages/ShortlistPage.tsx` with a ShortlistTable component and a `client/src/hooks/useShortlist.ts` hook
    - Display ranked candidates: name, role, match score (%), matched skills, availability, workload
    - Colour-coded availability indicators (≥70% vs <70%) meeting WCAG 2.1 AA and not relying on colour alone
    - Expandable per-candidate score breakdown; handle empty state and the "fewer than 10 qualify" message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 5.5 Write scoring engine unit and integration tests
    - Unit tests: concrete scoring examples, edge cases (empty pool, all excluded, max workload), boundary values per factor
    - Integration test: shortlist endpoint returns expected results for known seed data
    - Files: `server/tests/scoring/engine.test.ts`, `server/tests/routes/shortlist.test.ts`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.4_

  - [x] 5.6 Write property test: Score Formula Correctness
    - **Property 1**: weighted sum equals skill_match × 0.40 + role_alignment × 0.20 + availability × urgency_multiplier × 0.25 + workload × 0.15, capped at 1.0; fast-check arbitraries, min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**

  - [x] 5.7 Write property test: Urgency Multiplier Application
    - **Property 2**: 1.5x multiplier on availability for Critical/High, 1.0 for Medium/Low; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 3.6**

  - [x] 5.8 Write property test: Score Range Invariant
    - **Property 3**: final score is an integer between 0 and 100 for all valid inputs; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 3.8, 7.1**

  - [x] 5.9 Write property test: Sorting Correctness
    - **Property 4**: output sorted by score descending, tiebreak by skill_match descending; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 3.7**

  - [x] 5.10 Write property test: Dominance
    - **Property 5**: candidate A scores at least 1 point higher than B when A dominates on all factors; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 7.2**

  - [x] 5.11 Write property test: Determinism
    - **Property 6**: byte-identical output on 3+ invocations with same input; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 7.3**

  - [x] 5.12 Write property test: Availability Floor
    - **Property 7**: candidates with 0% availability score no higher than 60; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 7.4**

  - [x] 5.13 Write property test: Zero Skill Match Exclusion
    - **Property 8**: candidates with no overlapping skills are excluded from the shortlist; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 4.4**

  - [x] 5.14 Write property test: Score Breakdown Sum Invariant
    - **Property 9**: breakdown components sum to 100% of total score; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 4.3**

  - [x] 5.15 Write property test: Skill Coverage Formula
    - **Property 10**: skill coverage = distinct matched skills / total required skills × 100; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 5.3**

  - [x] 5.16 Write property test: Validation Rejects Invalid Work Requests
    - **Property 11**: invalid inputs are rejected with field-specific errors; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 1.3**

  - [x] 5.17 Write property test: Missing Scoring Inputs Exclusion
    - **Property 12**: candidates with missing inputs are excluded with validation warnings; min 100 iterations
    - File: `server/tests/scoring/engine.property.test.ts`
    - **Validates: Requirements 7.6**

- [x] 6. Checkpoint - Slice 2 verified (Playwright MCP)
  - Use the Playwright MCP to submit a work request and confirm a ranked shortlist renders with score breakdowns and availability indicators
  - Verify the empty state appears when no candidates qualify
  - Ensure all tests pass; ask the user if questions arise

- [x] 7. Slice 3 — Select & save a squad
  - [x] 7.1 Extend schema with squad models
    - Add Squad and SquadMember models to `schema.prisma`
    - Run `prisma migrate dev` and `prisma generate`
    - _Requirements: 5.2_

  - [x] 7.2 Implement the squad route
    - POST `/api/work-requests/:id/squad` — save/replace squad selection, accepting `{ candidateIds: string[] }`
    - Calculate and return skill coverage percentage; upsert (replace) when a squad already exists
    - Extend GET `/api/work-requests/:id` to include the assembled squad when present
    - _Requirements: 5.2, 5.3, 5.6_

  - [x] 7.3 Implement the SquadPanel component
    - Create `client/src/components/SquadPanel.tsx` and a `client/src/hooks/useSquadMutation.ts` hook
    - Add selection checkboxes to the shortlist; display selected candidates, roles, and combined skill coverage %
    - Confirm button disabled with validation message when zero selected; retain selection on save failure with error toast and retry; pre-check and allow re-selection when an existing squad is loaded
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.4 Write squad tests
    - API integration tests: save squad, replace existing squad, skill-coverage calculation
    - Component tests: selection logic, disabled-confirm validation, save-failure retention
    - Files: `server/tests/routes/squad.test.ts`, `client/tests/components/SquadPanel.test.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Checkpoint - Slice 3 verified (Playwright MCP)
  - Use the Playwright MCP to select candidates from a shortlist, confirm the squad, and verify the saved summary and skill coverage
  - Reload the work request and confirm the existing squad pre-checks and can be re-selected
  - Ensure all tests pass; ask the user if questions arise

- [x] 9. Slice 4 — View work request history
  - [x] 9.1 Confirm history retrieval API
    - Reuse GET `/api/work-requests` (paginated, max 100, newest first) and GET `/api/work-requests/:id` (with squad) from earlier slices
    - Add any missing fields needed by the history view (urgency, creation date, squad status) and a retry-friendly error contract
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 Implement the HistoryPage
    - Create `client/src/pages/HistoryPage.tsx` with HistoryList and WorkRequestDetail components and a `client/src/hooks/useWorkRequests.ts` hook
    - Paginated list (max 50 per page) showing title, urgency, date, and squad status (assembled or pending)
    - Click to view details including squad member names and roles when assembled
    - Handle error state with retry and empty state when no work requests exist
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.3 Write history tests
    - Component tests: list pagination, detail view with/without squad, error state with retry, empty state
    - File: `client/tests/components/HistoryList.test.tsx`
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 10. Checkpoint - Slice 4 verified (Playwright MCP)
  - Use the Playwright MCP to open the history list, page through entries, and open a request to confirm its assembled squad shows
  - Verify the empty state on a fresh database
  - Ensure all tests pass; ask the user if questions arise

- [x] 11. Slice 5 — End-to-end wiring & E2E suite
  - [x] 11.1 Finalise client-server wiring
    - Confirm the Vite proxy forwards `/api` to the Express server across all routes
    - Verify the complete workflow end-to-end: create work request → view shortlist → select squad → view in history, including error handling (server down, validation errors)
    - _Requirements: 1.2, 3.1, 5.2, 6.1_

  - [x] 11.2 Write the full-journey E2E suite with Playwright
    - Test the full workflow: create work request → shortlist → squad selection → history
    - Test form validation feedback, empty states, and error handling
    - File: `client/e2e/squad-assembly.spec.ts`
    - _Requirements: 1.1, 1.3, 4.1, 5.1, 6.1_

- [x] 12. Final checkpoint - All slices verified (Playwright MCP)
  - Run the complete Playwright E2E journey and the full unit/integration/property suites
  - Ensure all tests pass; ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Each slice is an independently demoable vertical tracer bullet that cuts through every layer it needs
- The database schema evolves incrementally: talent pool (Slice 0), work requests (Slice 1), squads (Slice 3)
- Every slice ends with a Playwright-MCP end-to-end verification checkpoint before the next slice begins
- Property tests validate the 12 universal correctness properties using fast-check and live in Slice 2 with the scoring engine
- The scoring engine is a pure function module enabling isolated testing
- All API types are shared via TypeScript interfaces

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3"] },
    { "id": 5, "tasks": ["3.4", "4"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4"] },
    { "id": 8, "tasks": ["5.5", "5.6", "5.7", "5.8", "5.9", "5.10", "5.11", "5.12", "5.13", "5.14", "5.15", "5.16", "5.17", "6"] },
    { "id": 9, "tasks": ["7.1"] },
    { "id": 10, "tasks": ["7.2", "7.3"] },
    { "id": 11, "tasks": ["7.4", "8"] },
    { "id": 12, "tasks": ["9.1", "9.2"] },
    { "id": 13, "tasks": ["9.3", "10"] },
    { "id": 14, "tasks": ["11.1"] },
    { "id": 15, "tasks": ["11.2", "12"] }
  ]
}
```
