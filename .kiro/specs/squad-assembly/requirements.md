# Requirements Document

## Introduction

Squad Assembly is a lightweight internal prototype that helps delivery leads and team facilitators rapidly assemble cross-functional squads for priority initiatives at Standard Bank. The system enables users to capture a delivery need, specify required skills, urgency, and expected duration, and receive a ranked shortlist of suitable internal candidates based on skill match, availability, role alignment, and workload. The prototype uses mock employee data and a rules-based scoring approach scoped to a single business unit.

## Glossary

- **Squad_Assembly_System**: The full-stack web application comprising the Client and Server that facilitates squad creation from a talent pool
- **Client**: The React-based frontend application that provides the user interface for capturing work requests and viewing candidate recommendations
- **Server**: The Express-based backend application that processes work requests, scores candidates, and returns ranked shortlists
- **Scoring_Engine**: The server-side module that calculates a composite match score for each candidate against a given work request using rules-based logic
- **Work_Request**: A structured record capturing a delivery need, including required skills, urgency level, expected duration, and a description of the work
- **Talent_Pool**: The set of mock employee records representing internal candidates within a single business unit, each with associated skills, role, availability, and current workload
- **Candidate**: A member of the Talent_Pool who is evaluated against a Work_Request
- **Match_Score**: A numeric value between 0 and 100 representing how well a Candidate fits a Work_Request, computed by the Scoring_Engine
- **Skill_Match**: A scoring factor measuring the overlap between a Candidate's skills and the skills required by a Work_Request
- **Availability_Band**: A simple capacity indicator representing a Candidate's current availability as a percentage allocation (0–100%)
- **Workload_Indicator**: A measure of a Candidate's current assignment load, expressed as the number of active engagements
- **Role_Alignment**: A scoring factor measuring how closely a Candidate's role matches the role types requested in a Work_Request
- **Urgency_Level**: A classification of how quickly the squad is needed, expressed as one of: Critical, High, Medium, or Low
- **Squad**: A collection of one or more Candidates selected by the user from the ranked shortlist to fulfil a Work_Request
- **Delivery_Lead**: The primary user persona—a person responsible for mobilising teams for priority delivery initiatives

## Requirements

### Requirement 1: Capture Work Request

**User Story:** As a Delivery_Lead, I want to capture a delivery need with required skills, urgency, and duration, so that the system can find suitable candidates for the work.

#### Acceptance Criteria

1. THE Client SHALL provide a form to create a Work_Request with fields for: title (maximum 150 characters), description (maximum 2000 characters), required skills (1 to 20 selections), required role types (1 to 10 selections), Urgency_Level, and expected duration in weeks (1 to 104)
2. WHEN the Delivery_Lead submits a Work_Request with all required fields populated and all field values within their defined bounds, THE Server SHALL persist the Work_Request and return a confirmation with the created Work_Request identifier within 3 seconds
3. IF the Delivery_Lead submits a Work_Request with one or more required fields empty or any field value outside its defined bounds, THEN THE Client SHALL display a validation error indicating each field that is missing or invalid, without clearing the values already entered in other fields
4. THE Client SHALL allow the Delivery_Lead to select required skills from a predefined list of skills available in the Talent_Pool, displaying a minimum of the skill name and supporting selection of between 1 and 20 skills
5. THE Client SHALL allow the Delivery_Lead to select an Urgency_Level from the options: Critical, High, Medium, or Low, with no default pre-selected
6. IF the Server fails to persist the Work_Request due to a service error, THEN THE Client SHALL display an error message indicating the request was not saved and retain the form data so the Delivery_Lead can retry submission without re-entering information
7. WHEN the Delivery_Lead submits a Work_Request with a title that already exists in the system, THE Server SHALL still persist the Work_Request as a distinct entry with its own unique identifier

### Requirement 2: Maintain Talent Pool

**User Story:** As a Delivery_Lead, I want the system to contain a realistic set of mock employee data, so that candidate recommendations are meaningful and demonstrable.

#### Acceptance Criteria

1. THE Server SHALL seed the database with a Talent_Pool of at least 20 mock Candidates spanning at least 5 distinct role types: Architect, Engineer, Tester, Data Specialist, and Delivery Manager, with a minimum of 2 Candidates per role type
2. THE Server SHALL store for each Candidate: name (1–100 characters), role type, a list of 1–10 skills, Availability_Band (0–100%), Workload_Indicator (0–10 active engagements), and business unit
3. THE Server SHALL seed Candidates with a combined total of at least 15 distinct skills across the Talent_Pool to enable meaningful filtering
4. THE Server SHALL provide an API endpoint that returns the list of all distinct skills present in the Talent_Pool
5. THE Server SHALL provide an API endpoint that returns the list of all distinct role types present in the Talent_Pool
6. IF the Talent_Pool contains no Candidates when a list endpoint is queried, THEN THE Server SHALL return an empty collection

### Requirement 3: Score and Rank Candidates

**User Story:** As a Delivery_Lead, I want candidates ranked by suitability for my work request, so that I can quickly identify the best available people.

#### Acceptance Criteria

1. WHEN a Work_Request is submitted, THE Scoring_Engine SHALL compute a Match_Score for every Candidate in the Talent_Pool within 5 seconds of submission
2. THE Scoring_Engine SHALL calculate the Skill_Match factor as the ratio of Candidate skills that exactly match (case-insensitive string comparison) any required skill in the Work_Request to the total number of required skills, weighted at 40% of the Match_Score
3. THE Scoring_Engine SHALL calculate the Role_Alignment factor as a binary match (1 if the Candidate's role type matches any requested role type, 0 otherwise), weighted at 20% of the Match_Score
4. THE Scoring_Engine SHALL calculate the availability factor by mapping the Candidate's Availability_Band to a normalised 0–1 scale where Full maps to 1.0, Partial maps to 0.5, and Unavailable maps to 0, weighted at 25% of the Match_Score
5. THE Scoring_Engine SHALL calculate the workload factor as (5 minus the Candidate's Workload_Indicator) divided by 5, weighted at 15% of the Match_Score; IF the Workload_Indicator exceeds 5, THEN THE Scoring_Engine SHALL treat it as 5, yielding a workload factor of 0
6. WHEN the Urgency_Level is Critical or High, THE Scoring_Engine SHALL apply a 1.5x multiplier to the availability factor before computing the final Match_Score
7. THE Scoring_Engine SHALL return Candidates sorted by Match_Score in descending order; IF two or more Candidates have an equal Match_Score, THEN THE Scoring_Engine SHALL sort those Candidates by Skill_Match factor descending as a tiebreaker
8. THE Scoring_Engine SHALL express the final Match_Score as a value ranging from 0.0 to 1.0, capping at 1.0 after all multipliers are applied

### Requirement 4: Present Ranked Shortlist

**User Story:** As a Delivery_Lead, I want to see a ranked shortlist with clear explanations, so that I understand why each person is recommended and can make informed decisions.

#### Acceptance Criteria

1. WHEN a Work_Request is scored, THE Client SHALL display a ranked list of the top 10 Candidates sorted by Match_Score in descending order, where tied Match_Scores are resolved by higher Availability_Band first, then alphabetical order by Candidate name
2. THE Client SHALL display for each Candidate in the shortlist: name (maximum 100 characters), role type, Match_Score (as a percentage from 0% to 100%, rounded to the nearest whole number), matched skills (highlighted), Availability_Band (as a percentage from 0% to 100%), and Workload_Indicator
3. THE Client SHALL display a breakdown of each Candidate's score showing the individual contribution of Skill_Match, Role_Alignment, availability, and workload factors, each expressed as a percentage of the total Match_Score summing to 100%
4. WHEN a Candidate has zero matched skills for the Work_Request, THE Client SHALL exclude that Candidate from the displayed shortlist
5. THE Client SHALL visually distinguish Candidates with an Availability_Band of 70% or above from those below 70% using colour-coded indicators that meet WCAG 2.1 AA contrast ratio of at least 4.5:1, and that do not rely solely on colour to convey the distinction
6. IF fewer than 10 Candidates have a Match_Score above 0% after exclusions, THEN THE Client SHALL display only the qualifying Candidates and show a message indicating the total number of matching Candidates found
7. WHEN the Delivery_Lead selects a Candidate from the shortlist, THE Client SHALL display the full score breakdown and matched skill details within 1 second of the selection event
8. IF the scoring operation returns no qualifying Candidates for a Work_Request, THEN THE Client SHALL display an empty state message indicating that no matching Candidates were found for the specified criteria

### Requirement 5: Select Squad Members

**User Story:** As a Delivery_Lead, I want to select one or more candidates from the shortlist to form a proposed squad, so that I can document my staffing decision.

#### Acceptance Criteria

1. THE Client SHALL allow the Delivery_Lead to select one or more Candidates from the ranked shortlist using checkboxes
2. WHEN the Delivery_Lead confirms the squad selection, THE Server SHALL persist the Squad as an association between the selected Candidates and the Work_Request
3. WHEN a Squad is saved, THE Client SHALL display a summary showing the Work_Request title, selected Candidate names, their roles, and the combined skill coverage percentage calculated as the number of distinct required skills matched by at least one selected Candidate divided by the total number of required skills on the Work_Request expressed as a whole-number percentage
4. IF the Delivery_Lead attempts to confirm a Squad with zero Candidates selected, THEN THE Client SHALL keep the confirm action disabled and display a validation message indicating that at least one Candidate must be selected
5. IF the Server fails to persist the Squad, THEN THE Client SHALL display an error message indicating the save failed and SHALL retain the current selection state so the Delivery_Lead can retry without re-selecting Candidates
6. IF a Squad already exists for the Work_Request, THEN THE Client SHALL present the previously selected Candidates as pre-checked and allow the Delivery_Lead to modify the selection before confirming, and WHEN confirmed THE Server SHALL replace the existing Squad association with the new selection

### Requirement 6: View Work Request History

**User Story:** As a Delivery_Lead, I want to view my previous work requests and assembled squads, so that I can track past staffing decisions.

#### Acceptance Criteria

1. THE Client SHALL display a list of all previously created Work_Requests with their title, Urgency_Level, creation date, and squad status (assembled or pending), showing a maximum of 50 items per page
2. WHEN the Delivery_Lead selects a Work_Request from the history list, THE Client SHALL display the Work_Request details including title, Urgency_Level, creation date, required skills, and the associated Squad member names and roles if one has been assembled
3. THE Server SHALL provide an API endpoint that returns all Work_Requests for the authenticated Delivery_Lead, ordered by creation date in descending order, paginated with a default page size of 20 and a maximum page size of 100
4. IF the Server fails to retrieve the Work_Request history, THEN THE Client SHALL display an error message indicating that history could not be loaded and offer a retry action
5. IF the Delivery_Lead has no previously created Work_Requests, THEN THE Client SHALL display an empty state message indicating no work requests have been created yet

### Requirement 7: Validate Scoring Engine Correctness

**User Story:** As a developer, I want confidence that the scoring engine produces correct and consistent results, so that candidate recommendations are trustworthy.

#### Acceptance Criteria

1. FOR ALL valid Work_Requests, THE Scoring_Engine SHALL produce a Match_Score that is an integer between 0 and 100 inclusive for every Candidate associated with that Work_Request, completing the scoring within 2 seconds per Candidate.
2. FOR ALL pairs of Candidates evaluated against the same Work_Request where Candidate A has a strictly higher Skill_Match percentage, a strictly higher Availability_Band percentage, matching Role_Alignment, and a strictly lower Workload_Indicator than Candidate B, THE Scoring_Engine SHALL assign Candidate A a Match_Score that is at least 1 point higher than Candidate B (dominance property).
3. FOR ALL Work_Requests, THE Scoring_Engine SHALL produce a byte-identical ranked shortlist when invoked 3 or more consecutive times with the same input data and no intervening data changes (determinism property).
4. FOR ALL Candidates with an Availability_Band of 0%, THE Scoring_Engine SHALL assign a Match_Score no higher than 60, regardless of the values of Skill_Match, Role_Alignment, or Workload_Indicator (availability floor property).
5. IF a Work_Request contains no Candidates, THEN THE Scoring_Engine SHALL return an empty ranked shortlist with zero Match_Scores and no error.
6. IF a Candidate record is missing one or more required scoring inputs (Skill_Match, Availability_Band, Role_Alignment, or Workload_Indicator), THEN THE Scoring_Engine SHALL exclude that Candidate from the ranked shortlist and include a validation warning identifying the Candidate and the missing field(s).
7. FOR ALL Work_Requests containing 1,000 or more Candidates, THE Scoring_Engine SHALL complete scoring and produce the ranked shortlist within 10 seconds.
