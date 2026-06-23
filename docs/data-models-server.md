# Data Models — server

**Generated:** 2026-06-23  
**Schema file:** `server/prisma/schema.prisma`  
**Database:** SQLite (development) — provider is configurable via `DATABASE_URL`  
**ORM:** Prisma 5

---

## Entity Relationship Overview

```
Skill ──────────────── CandidateSkill ──── Candidate
  │                                            │
  └── WorkRequestSkill ──── WorkRequest        └── SquadMember ──── Squad
                              │                                        │
                           WorkRequestRole                     (workRequestId FK)
                              │
                           RoleType
```

---

## Models

### Candidate

Represents a person available for squad assignment.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, CUID default | Unique identifier |
| `name` | String | required | Full name |
| `role` | String | required | Job role (e.g. "Engineer", "Architect") |
| `availabilityBand` | Int | required | Percentage available (0–100) |
| `workloadIndicator` | Int | required | Active engagement count (0–10) |
| `businessUnit` | String | required | Owning business unit |
| `createdAt` | DateTime | default now() | Record creation timestamp |

**Relations:**
- `skills` → `CandidateSkill[]` (many-to-many with Skill)
- `squadMembers` → `SquadMember[]` (participates in squads)

**Scoring note:** `availabilityBand` and `workloadIndicator` are the two candidate-side inputs to the scoring engine. Higher availability = higher score; workload ≥ 5 yields a workload factor of 0.

---

### Skill

A named skill tag. Acts as a vocabulary/lookup table.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, CUID default | Unique identifier |
| `name` | String | UNIQUE | Skill name (e.g. "TypeScript", "Docker") |

**Relations:**
- `candidates` → `CandidateSkill[]`
- `workRequestSkills` → `WorkRequestSkill[]`

**Seed data (20 skills):** TypeScript, JavaScript, React, Node.js, Python, Java, SQL, AWS, Docker, Kubernetes, GraphQL, REST API Design, CI/CD, Agile, Test Automation, Machine Learning, Data Modelling, System Design, Performance Testing, Security.

---

### CandidateSkill

Explicit join table linking Candidates to Skills.

| Field | Type | Constraints |
|-------|------|-------------|
| `candidateId` | String | FK → Candidate.id |
| `skillId` | String | FK → Skill.id |

**Primary key:** composite `(candidateId, skillId)`

---

### RoleType

A named role type. Acts as a vocabulary/lookup table.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, CUID default | Unique identifier |
| `name` | String | UNIQUE | Role name (e.g. "Engineer", "Architect") |

**Relations:**
- `workRequestRoles` → `WorkRequestRole[]`

**Seed data (6 roles):** Architect, Engineer, Tester, Data Specialist, Delivery Manager, DevOps Engineer.

---

### WorkRequest

A delivery request specifying skill and role requirements.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, CUID default | Unique identifier |
| `title` | String | required, max 150 chars | Short descriptive title |
| `description` | String | required, max 2000 chars | Detailed delivery description |
| `urgencyLevel` | String | required | One of: Critical, High, Medium, Low |
| `durationWeeks` | Int | required, 1–104 | Estimated engagement length |
| `createdAt` | DateTime | default now() | Creation timestamp |

**Relations:**
- `requiredSkills` → `WorkRequestSkill[]`
- `requiredRoles` → `WorkRequestRole[]`
- `squad` → `Squad?` (optional one-to-one)

**Business rules (enforced at API layer):**
- `urgencyLevel` must be one of the four valid values
- `requiredSkills` must reference known Skill names (1–20)
- `requiredRoles` must reference known RoleType names (1–10)

---

### WorkRequestSkill

Explicit join table linking WorkRequests to Skills.

| Field | Type | Constraints |
|-------|------|-------------|
| `workRequestId` | String | FK → WorkRequest.id |
| `skillId` | String | FK → Skill.id |

**Primary key:** composite `(workRequestId, skillId)`

---

### WorkRequestRole

Explicit join table linking WorkRequests to RoleTypes.

| Field | Type | Constraints |
|-------|------|-------------|
| `workRequestId` | String | FK → WorkRequest.id |
| `roleTypeId` | String | FK → RoleType.id |

**Primary key:** composite `(workRequestId, roleTypeId)`

---

### Squad

A saved squad assignment for a work request. One-to-one with WorkRequest.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | PK, CUID default | Unique identifier |
| `workRequestId` | String | UNIQUE FK → WorkRequest.id | One squad per work request |
| `skillCoveragePercent` | Float | required | % of required skills covered by the squad (0–100) |
| `createdAt` | DateTime | default now() | Creation timestamp |
| `updatedAt` | DateTime | auto-updated | Last modification timestamp |

**Relations:**
- `workRequest` → `WorkRequest`
- `members` → `SquadMember[]`

**Business rule:** Saving a squad is an **upsert by deletion** — the existing squad (if any) is deleted before the new one is created, cascading to all `SquadMember` rows.

**Skill coverage formula:**
```
coverage = (distinct required skills covered by ≥1 squad member) / (total required skills) × 100
```
Rounded to 2 decimal places.

---

### SquadMember

Links a Candidate to a Squad.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | String | PK, CUID default |
| `squadId` | String | FK → Squad.id (cascade delete) |
| `candidateId` | String | FK → Candidate.id |

**Unique constraint:** `(squadId, candidateId)` — a candidate can only appear once per squad.

---

## Migration Strategy

Prisma Migrate manages schema changes. Migration files live in `server/prisma/migrations/`.

| Command | Purpose |
|---------|---------|
| `pnpm --filter server db:migrate` | Apply pending migrations (dev) |
| `pnpm --filter server db:migrate:deploy` | Apply migrations without prompts (production) |
| `pnpm --filter server db:generate` | Regenerate Prisma client after schema changes |
| `pnpm --filter server db:seed` | Seed roles, skills, and 15 sample candidates |
| `pnpm --filter server db:studio` | Open Prisma Studio web UI |

---

## Notes

- The SQLite file (`server/prisma/dev.db`) and the generated Prisma client (`server/node_modules/.prisma`) are git-ignored.
- The `DATABASE_URL` environment variable is required at runtime. Copy `server/.env.example` → `server/.env` to set it.
- There is **no Candidate management API** — candidates are loaded via the seed script only. The scoring engine reads all candidates from the DB when generating a shortlist.
