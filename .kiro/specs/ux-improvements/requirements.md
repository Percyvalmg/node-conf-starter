# Requirements Document

## Introduction

This spec covers UX improvements to the Squad Assembly prototype identified during post-build testing. The core theme is consolidating the candidate shortlist and squad assembly into a single unified flow, adding a dedicated Work Request detail page for ongoing CRUD operations, improving navigation with back buttons, reducing history page size for practical pagination, and adding a non-matching test candidate to validate the scoring engine's exclusion logic.

## Glossary

- **Work_Request_Detail_Page**: A new page (route: `/work-requests/:id`) that displays a work request's full details, its candidate shortlist with inline selection, and assembled squad — serving as the single hub for viewing, assembling, and modifying squads after creation
- **Unified_Shortlist**: The combined view that merges the candidate shortlist table with squad selection checkboxes, eliminating the separate SquadPanel section
- **Non_Matching_Candidate**: A seed candidate whose skills and role do not overlap with any of the commonly-required skills/roles, used to verify the scoring engine correctly excludes zero-match candidates
- **Back_Navigation**: A clearly visible button or link that returns the user to the previous logical step in the workflow

## Requirements

### Requirement 1: Unified Shortlist and Squad Assembly

**User Story:** As a Delivery_Lead, I want to select squad members directly from the candidate shortlist table using checkboxes, so that I don't need to navigate between separate shortlist and assembly views.

#### Acceptance Criteria

1. THE Work_Request_Detail_Page SHALL display the scored candidate shortlist with a checkbox on each row, allowing the Delivery_Lead to select or deselect candidates directly from the ranked table
2. WHEN the Delivery_Lead selects one or more candidates, THE page SHALL display a summary bar showing the number of selected candidates, combined skill coverage percentage, and a "Confirm Squad" action button
3. THE page SHALL retain the score breakdown details (expand/collapse per candidate) alongside the selection checkboxes
4. WHEN the Delivery_Lead confirms the squad selection, THE system SHALL save the squad via the existing POST /api/work-requests/:id/squad endpoint and display a success confirmation without navigating away from the page
5. IF a squad already exists for the work request, THE page SHALL pre-check the existing squad members in the shortlist table and allow the Delivery_Lead to modify the selection and re-save

### Requirement 2: Back Navigation

**User Story:** As a Delivery_Lead, I want a back button on the work request detail page to return to the creation form or history, so that I can easily navigate the application.

#### Acceptance Criteria

1. THE Work_Request_Detail_Page SHALL display a clearly visible "Back" button or link that navigates the user to the History page
2. THE back navigation SHALL be positioned at the top of the page, before the work request content, following standard navigation patterns
3. THE Layout navigation bar SHALL include a link to the History page (already exists) and the existing "New Request" link

### Requirement 3: Work Request Detail Page with CRUD Operations

**User Story:** As a Delivery_Lead, I want a dedicated page for each work request where I can view details, assemble a squad, and modify an existing squad at any time after creation, so that I am not forced to complete assembly immediately.

#### Acceptance Criteria

1. THE application SHALL provide a route at `/work-requests/:id` that loads the Work_Request_Detail_Page showing the work request title, description, urgency, duration, required skills, required roles, and creation date
2. WHEN a work request is created successfully, THE application SHALL navigate to `/work-requests/:id` (the detail page) instead of directly to the shortlist
3. THE Work_Request_Detail_Page SHALL display the candidate shortlist with the Unified_Shortlist interface (Requirement 1)
4. THE History page SHALL link each work request item to its Work_Request_Detail_Page at `/work-requests/:id`
5. IF a squad has already been assembled, THE Work_Request_Detail_Page SHALL display the current squad members and allow the Delivery_Lead to modify the squad by changing selections and re-saving
6. THE Work_Request_Detail_Page SHALL provide a "Delete" action that removes the work request and its associated squad, then navigates to the History page
7. THE Server SHALL provide a DELETE /api/work-requests/:id endpoint that removes the work request, its skill/role associations, and any associated squad and squad members

### Requirement 4: Non-Matching Test Candidate

**User Story:** As a Delivery_Lead, I want the talent pool to include a candidate who doesn't match typical skill and role requirements, so that I can verify the system correctly excludes non-matching candidates from the shortlist.

#### Acceptance Criteria

1. THE Server seed data SHALL include at least one Candidate whose skills do not overlap with any of the 20 existing skills in the talent pool (i.e., the candidate has entirely unique skills not used in work requests)
2. THE non-matching Candidate SHALL have a role type that is not one of the standard roles (Architect, Engineer, Tester, Data Specialist, Delivery Manager, DevOps Engineer) to also test role alignment scoring
3. WHEN a work request is created with standard skills and roles, THE non-matching Candidate SHALL NOT appear in the shortlist results (matchScore would be 0 due to zero skill overlap)

### Requirement 5: History Page Pagination

**User Story:** As a Delivery_Lead, I want the history page to show a manageable number of items per page with clear pagination controls, so that the list doesn't become overwhelming as work requests accumulate.

#### Acceptance Criteria

1. THE History page SHALL display a maximum of 10 work requests per page (reduced from 50)
2. THE pagination controls SHALL show "Previous" and "Next" buttons with the current page number and total pages displayed between them
3. WHEN the Delivery_Lead navigates to a new page, THE selected detail panel SHALL close and the list SHALL update to show the new page's items
4. THE pagination controls SHALL disable the "Previous" button on page 1 and the "Next" button on the last page

### Requirement 6: Post-Creation Navigation Flow

**User Story:** As a Delivery_Lead, I want to be taken to the work request detail page after creating a request, so that I can immediately see the shortlist and decide whether to assemble a squad now or return later.

#### Acceptance Criteria

1. WHEN the Delivery_Lead successfully submits a new work request, THE application SHALL navigate to `/work-requests/:id` where `:id` is the newly created work request's identifier
2. THE Work_Request_Detail_Page SHALL automatically load and display the candidate shortlist for the newly created work request
3. THE Delivery_Lead SHALL have the option to assemble the squad immediately or navigate away (to History or New Request) and return later to assemble
