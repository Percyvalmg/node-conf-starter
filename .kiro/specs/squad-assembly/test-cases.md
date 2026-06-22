# Test Cases: Squad Assembly

## Acceptance Criteria

### 1. Capture Work Request

1. THE Client SHALL provide a form to create a Work_Request with fields for: title (maximum 150 characters), description (maximum 2000 characters), required skills (1 to 20 selections), required role types (1 to 10 selections), Urgency_Level, and expected duration in weeks (1 to 104)
2. WHEN the Delivery_Lead submits a Work_Request with all required fields populated and all field values within their defined bounds, THE Server SHALL persist the Work_Request and return a confirmation with the created Work_Request identifier within 3 seconds
3. IF the Delivery_Lead submits a Work_Request with one or more required fields empty or any field value outside its defined bounds, THEN THE Client SHALL display a validation error indicating each field that is missing or invalid, without clearing the values already entered in other fields
4. THE Client SHALL allow the Delivery_Lead to select required skills from a predefined list of skills available in the Talent_Pool, displaying a minimum of the skill name and supporting selection of between 1 and 20 skills
5. THE Client SHALL allow the Delivery_Lead to select an Urgency_Level from the options: Critical, High, Medium, or Low, with no default pre-selected
6. IF the Server fails to persist the Work_Request due to a service error, THEN THE Client SHALL display an error message indicating the request was not saved and retain the form data so the Delivery_Lead can retry submission without re-entering information
7. WHEN the Delivery_Lead submits a Work_Request with a title that already exists in the system, THE Server SHALL still persist the Work_Request as a distinct entry with its own unique identifier

### 2. Maintain Talent Pool

1. THE Server SHALL seed the database with a Talent_Pool of at least 20 mock Candidates spanning at least 5 distinct role types: Architect, Engineer, Tester, Data Specialist, and Delivery Manager, with a minimum of 2 Candidates per role type
2. THE Server SHALL store for each Candidate: name (1–100 characters), role type, a list of 1–10 skills, Availability_Band (0–100%), Workload_Indicator (0–10 active engagements), and business unit
3. THE Server SHALL seed Candidates with a combined total of at least 15 distinct skills across the Talent_Pool to enable meaningful filtering
4. THE Server SHALL provide an API endpoint that returns the list of all distinct skills present in the Talent_Pool
5. THE Server SHALL provide an API endpoint that returns the list of all distinct role types present in the Talent_Pool
6. IF the Talent_Pool contains no Candidates when a list endpoint is queried, THEN THE Server SHALL return an empty collection

### 3. Score and Rank Candidates

1. WHEN a Work_Request is submitted, THE Scoring_Engine SHALL compute a Match_Score for every Candidate in the Talent_Pool within 5 seconds of submission
2. THE Scoring_Engine SHALL calculate the Skill_Match factor as the ratio of Candidate skills that exactly match (case-insensitive string comparison) any required skill in the Work_Request to the total number of required skills, weighted at 40% of the Match_Score
3. THE Scoring_Engine SHALL calculate the Role_Alignment factor as a binary match (1 if the Candidate's role type matches any requested role type, 0 otherwise), weighted at 20% of the Match_Score
4. THE Scoring_Engine SHALL calculate the availability factor by mapping the Candidate's Availability_Band to a normalised 0–1 scale where Full maps to 1.0, Partial maps to 0.5, and Unavailable maps to 0, weighted at 25% of the Match_Score
5. THE Scoring_Engine SHALL calculate the workload factor as (5 minus the Candidate's Workload_Indicator) divided by 5, weighted at 15% of the Match_Score; IF the Workload_Indicator exceeds 5, THEN THE Scoring_Engine SHALL treat it as 5, yielding a workload factor of 0
6. WHEN the Urgency_Level is Critical or High, THE Scoring_Engine SHALL apply a 1.5x multiplier to the availability factor before computing the final Match_Score
7. THE Scoring_Engine SHALL return Candidates sorted by Match_Score in descending order; IF two or more Candidates have an equal Match_Score, THEN THE Scoring_Engine SHALL sort those Candidates by Skill_Match factor descending as a tiebreaker
8. THE Scoring_Engine SHALL express the final Match_Score as a value ranging from 0.0 to 1.0, capping at 1.0 after all multipliers are applied

### 4. Present Ranked Shortlist

1. WHEN a Work_Request is scored, THE Client SHALL display a ranked list of the top 10 Candidates sorted by Match_Score in descending order, where tied Match_Scores are resolved by higher Availability_Band first, then alphabetical order by Candidate name
2. THE Client SHALL display for each Candidate in the shortlist: name (maximum 100 characters), role type, Match_Score (as a percentage from 0% to 100%, rounded to the nearest whole number), matched skills (highlighted), Availability_Band (as a percentage from 0% to 100%), and Workload_Indicator
3. THE Client SHALL display a breakdown of each Candidate's score showing the individual contribution of Skill_Match, Role_Alignment, availability, and workload factors, each expressed as a percentage of the total Match_Score summing to 100%
4. WHEN a Candidate has zero matched skills for the Work_Request, THE Client SHALL exclude that Candidate from the displayed shortlist
5. THE Client SHALL visually distinguish Candidates with an Availability_Band of 70% or above from those below 70% using colour-coded indicators that meet WCAG 2.1 AA contrast ratio of at least 4.5:1, and that do not rely solely on colour to convey the distinction
6. IF fewer than 10 Candidates have a Match_Score above 0% after exclusions, THEN THE Client SHALL display only the qualifying Candidates and show a message indicating the total number of matching Candidates found
7. WHEN the Delivery_Lead selects a Candidate from the shortlist, THE Client SHALL display the full score breakdown and matched skill details within 1 second of the selection event
8. IF the scoring operation returns no qualifying Candidates for a Work_Request, THEN THE Client SHALL display an empty state message indicating that no matching Candidates were found for the specified criteria

### 5. Select Squad Members

1. THE Client SHALL allow the Delivery_Lead to select one or more Candidates from the ranked shortlist using checkboxes
2. WHEN the Delivery_Lead confirms the squad selection, THE Server SHALL persist the Squad as an association between the selected Candidates and the Work_Request
3. WHEN a Squad is saved, THE Client SHALL display a summary showing the Work_Request title, selected Candidate names, their roles, and the combined skill coverage percentage calculated as the number of distinct required skills matched by at least one selected Candidate divided by the total number of required skills on the Work_Request expressed as a whole-number percentage
4. IF the Delivery_Lead attempts to confirm a Squad with zero Candidates selected, THEN THE Client SHALL keep the confirm action disabled and display a validation message indicating that at least one Candidate must be selected
5. IF the Server fails to persist the Squad, THEN THE Client SHALL display an error message indicating the save failed and SHALL retain the current selection state so the Delivery_Lead can retry without re-selecting Candidates
6. IF a Squad already exists for the Work_Request, THEN THE Client SHALL present the previously selected Candidates as pre-checked and allow the Delivery_Lead to modify the selection before confirming, and WHEN confirmed THE Server SHALL replace the existing Squad association with the new selection

### 6. View Work Request History

1. THE Client SHALL display a list of all previously created Work_Requests with their title, Urgency_Level, creation date, and squad status (assembled or pending), showing a maximum of 50 items per page
2. WHEN the Delivery_Lead selects a Work_Request from the history list, THE Client SHALL display the Work_Request details including title, Urgency_Level, creation date, required skills, and the associated Squad member names and roles if one has been assembled
3. THE Server SHALL provide an API endpoint that returns all Work_Requests for the authenticated Delivery_Lead, ordered by creation date in descending order, paginated with a default page size of 20 and a maximum page size of 100
4. IF the Server fails to retrieve the Work_Request history, THEN THE Client SHALL display an error message indicating that history could not be loaded and offer a retry action
5. IF the Delivery_Lead has no previously created Work_Requests, THEN THE Client SHALL display an empty state message indicating no work requests have been created yet

### 7. Validate Scoring Engine Correctness

1. FOR ALL valid Work_Requests, THE Scoring_Engine SHALL produce a Match_Score that is an integer between 0 and 100 inclusive for every Candidate associated with that Work_Request, completing the scoring within 2 seconds per Candidate.
2. FOR ALL pairs of Candidates evaluated against the same Work_Request where Candidate A has a strictly higher Skill_Match percentage, a strictly higher Availability_Band percentage, matching Role_Alignment, and a strictly lower Workload_Indicator than Candidate B, THE Scoring_Engine SHALL assign Candidate A a Match_Score that is at least 1 point higher than Candidate B (dominance property).
3. FOR ALL Work_Requests, THE Scoring_Engine SHALL produce a byte-identical ranked shortlist when invoked 3 or more consecutive times with the same input data and no intervening data changes (determinism property).
4. FOR ALL Candidates with an Availability_Band of 0%, THE Scoring_Engine SHALL assign a Match_Score no higher than 60, regardless of the values of Skill_Match, Role_Alignment, or Workload_Indicator (availability floor property).
5. IF a Work_Request contains no Candidates, THEN THE Scoring_Engine SHALL return an empty ranked shortlist with zero Match_Scores and no error.
6. IF a Candidate record is missing one or more required scoring inputs (Skill_Match, Availability_Band, Role_Alignment, or Workload_Indicator), THEN THE Scoring_Engine SHALL exclude that Candidate from the ranked shortlist and include a validation warning identifying the Candidate and the missing field(s).
7. FOR ALL Work_Requests containing 1,000 or more Candidates, THE Scoring_Engine SHALL complete scoring and produce the ranked shortlist within 10 seconds.

## Correctness Properties

### Property 1: Score Formula Correctness

*For any* valid candidate and valid work request, the Match_Score SHALL equal the weighted sum of `skill_match × 0.40 + role_alignment × 0.20 + availability × urgency_multiplier × 0.25 + workload × 0.15`, capped at 1.0, where each factor is computed per its defined formula.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 2: Urgency Multiplier Application

*For any* work request with urgency level Critical or High and *for any* candidate, the availability factor in the scoring formula SHALL have a 1.5x multiplier applied before computing the final weighted sum, and for Medium or Low urgency the multiplier SHALL be 1.0.

**Validates: Requirements 3.6**

### Property 3: Score Range Invariant

*For any* valid work request and *for any* candidate in the talent pool, the final Match_Score SHALL be an integer between 0 and 100 inclusive, regardless of input factor values or multiplier combinations.

**Validates: Requirements 3.8, 7.1**

### Property 4: Sorting Correctness

*For any* set of scored candidates, the ranked output SHALL be sorted by Match_Score in descending order, and for any two candidates with equal Match_Score, the one with the higher Skill_Match factor SHALL appear first.

**Validates: Requirements 3.7**

### Property 5: Dominance

*For any* pair of candidates evaluated against the same work request where Candidate A has strictly higher Skill_Match, strictly higher Availability_Band, matching Role_Alignment, and strictly lower Workload_Indicator than Candidate B, the Scoring_Engine SHALL assign Candidate A a Match_Score at least 1 point higher than Candidate B.

**Validates: Requirements 7.2**

### Property 6: Determinism

*For any* valid work request and candidate pool, invoking the scoring engine 3 or more times with identical input SHALL produce byte-identical ranked output each time.

**Validates: Requirements 7.3**

### Property 7: Availability Floor

*For any* candidate with an Availability_Band of 0%, the Scoring_Engine SHALL assign a Match_Score no higher than 60, regardless of how high the Skill_Match, Role_Alignment, or workload factors are.

**Validates: Requirements 7.4**

### Property 8: Zero Skill Match Exclusion

*For any* candidate whose skills have zero overlap with the required skills of a work request, that candidate SHALL be excluded from the displayed shortlist.

**Validates: Requirements 4.4**

### Property 9: Score Breakdown Sum Invariant

*For any* candidate in the shortlist, the score breakdown components (Skill_Match contribution, Role_Alignment contribution, availability contribution, and workload contribution) SHALL sum to exactly 100% of the total Match_Score.

**Validates: Requirements 4.3**

### Property 10: Skill Coverage Formula

*For any* squad selection of one or more candidates against a work request, the skill coverage percentage SHALL equal the count of distinct required skills matched by at least one selected candidate divided by the total number of required skills, expressed as a whole-number percentage.

**Validates: Requirements 5.3**

### Property 11: Validation Rejects Invalid Work Requests

*For any* work request submission where at least one required field is empty or any field value is outside its defined bounds, the system SHALL reject the submission with field-specific error messages without clearing valid field values.

**Validates: Requirements 1.3**

### Property 12: Missing Scoring Inputs Exclusion

*For any* candidate missing one or more required scoring inputs (skills list, availability band, role, or workload indicator), the Scoring_Engine SHALL exclude that candidate from the ranked shortlist and include a validation warning identifying the candidate and the missing field(s).

**Validates: Requirements 7.6**

## Testing Strategy

### Unit Tests (Vitest)

**Server:**
- Scoring engine formula correctness with concrete examples
- API route handlers with mocked Prisma client
- Validation logic for work request inputs
- Edge cases: empty talent pool, max-length inputs, boundary values

**Client:**
- Component rendering (React Testing Library)
- Form validation behaviour
- Shortlist display with various data shapes
- Error state rendering

### Property-Based Tests (fast-check + Vitest)

The scoring engine is the primary target for property-based testing. Using [fast-check](https://github.com/dubzzz/fast-check) for TypeScript property testing.

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: squad-assembly, Property {N}: {title}`
- Custom arbitraries for generating valid candidates and work requests

**Properties to implement:**
1. Score formula correctness (Property 1)
2. Urgency multiplier application (Property 2)
3. Score range invariant (Property 3)
4. Sorting correctness (Property 4)
5. Dominance (Property 5)
6. Determinism (Property 6)
7. Availability floor (Property 7)
8. Zero skill match exclusion (Property 8)
9. Score breakdown sum invariant (Property 9)
10. Skill coverage formula (Property 10)
11. Validation rejects invalid work requests (Property 11)
12. Missing scoring inputs exclusion (Property 12)

### Integration Tests

- API endpoint tests with real SQLite database (test instance)
- Seed data verification (smoke tests)
- Pagination behaviour
- Squad save/replace flow

### E2E Tests (Playwright)

- Full workflow: create work request → view shortlist → select squad → verify in history
- Empty states and error handling
- Form validation feedback

### Test File Organisation

```
server/
  tests/
    scoring/
      engine.test.ts          # Unit tests with concrete examples
      engine.property.test.ts # Property-based tests (fast-check)
    routes/
      workRequests.test.ts    # API integration tests
      skills.test.ts
      roles.test.ts
    seed/
      seed.test.ts            # Smoke tests for seed data
client/
  tests/
    components/
      WorkRequestForm.test.tsx
      ShortlistTable.test.tsx
      SquadPanel.test.tsx
      HistoryList.test.tsx
  e2e/
    squad-assembly.spec.ts    # Full workflow E2E
```
