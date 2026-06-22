# API Specification: Squad Assembly

## Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/api/work-requests` | Create a work request | `WorkRequestInput` | `{ id, title, ... }` |
| `GET` | `/api/work-requests` | List work requests (paginated) | Query: `page`, `pageSize` | `{ data: [...], total, page, pageSize }` |
| `GET` | `/api/work-requests/:id` | Get work request details + squad | — | `WorkRequestDetail` |
| `GET` | `/api/work-requests/:id/shortlist` | Score and rank candidates | — | `{ candidates: ScoredCandidate[] }` |
| `POST` | `/api/work-requests/:id/squad` | Save/replace squad selection | `{ candidateIds: string[] }` | `{ squad: SquadSummary }` |
| `GET` | `/api/skills` | List all distinct skills | — | `{ skills: string[] }` |
| `GET` | `/api/roles` | List all distinct role types | — | `{ roles: string[] }` |

## Request/Response Types

```typescript
// POST /api/work-requests
interface WorkRequestInput {
  title: string;            // 1-150 chars
  description: string;      // 0-2000 chars
  requiredSkills: string[]; // 1-20 skill names
  requiredRoles: string[];  // 1-10 role type names
  urgencyLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  durationWeeks: number;    // 1-104
}

// GET /api/work-requests/:id/shortlist
interface ScoredCandidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;         // 0-100 integer
  matchedSkills: string[];
  availabilityBand: number;   // 0-100
  workloadIndicator: number;  // 0-10
  breakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  skillMatch: number;       // percentage contribution
  roleAlignment: number;    // percentage contribution
  availability: number;     // percentage contribution
  workload: number;         // percentage contribution
}

// POST /api/work-requests/:id/squad
interface SquadSummary {
  workRequestId: string;
  workRequestTitle: string;
  members: { id: string; name: string; role: string }[];
  skillCoveragePercent: number; // 0-100
}
```

## Scoring Engine

The scoring engine is a **pure function module** (`server/src/scoring/engine.ts`) with no database access — it receives data as arguments and returns scored results.

```typescript
// Core scoring function signature
export function scoreCandidate(
  candidate: CandidateData,
  workRequest: WorkRequestData
): ScoredResult | ValidationWarning;

// Orchestration function
export function rankCandidates(
  candidates: CandidateData[],
  workRequest: WorkRequestData
): RankingResult;

interface RankingResult {
  ranked: ScoredResult[];
  warnings: ValidationWarning[];
}
```

### Scoring Formula

```
Match_Score = min(1.0, weighted_sum)

weighted_sum = (skill_match × 0.40)
             + (role_alignment × 0.20)
             + (availability × urgency_multiplier × 0.25)
             + (workload × 0.15)

Where:
  skill_match = |candidate_skills ∩ required_skills| / |required_skills|
  role_alignment = candidate_role ∈ required_roles ? 1.0 : 0.0
  availability = availability_band / 100 (normalised 0-1)
  workload = max(0, (5 - min(workload_indicator, 5)) / 5)
  urgency_multiplier = 1.5 if urgency ∈ {Critical, High} else 1.0
```

The final `Match_Score` is expressed as an integer percentage: `Math.round(Match_Score × 100)`.

## Error Handling

### Server-Side Patterns

| Scenario | Response Code | Body | Client Handling |
|----------|--------------|------|-----------------|
| Validation failure (work request) | `400` | `{ errors: [{ field, message }] }` | Display inline field errors |
| Work request not found | `404` | `{ error: "Work request not found" }` | Redirect to history |
| Scoring engine warning (missing data) | `200` | Include `warnings[]` alongside results | Display warning banner |
| Database write failure | `500` | `{ error: "Failed to save" }` | Display retry-able error toast |
| Unexpected server error | `500` | `{ error: "Internal server error" }` | Display generic error with retry |

### Validation Strategy

- **Client-side**: Immediate feedback using form validation before submission (field presence, length bounds, count constraints). Does NOT replace server validation.
- **Server-side**: Full validation on every write endpoint. Returns structured errors with field identifiers. Single source of truth for business rules.
