# API Contracts — server

**Generated:** 2026-06-23  
**Base URL (dev):** `http://localhost:3001`  
**Client proxy:** Vite proxies `/api/*` → `http://localhost:3001/api/*` during development  
**Content-Type:** `application/json` for all request and response bodies  
**Authentication:** None (no auth layer implemented)

---

## Health & Utility

### GET /health

Liveness check — indicates the process is running.

**Response 200**
```json
{
  "status": "ok",
  "timestamp": "2026-06-23T08:00:00.000Z"
}
```

---

### GET /api/health

API health check — includes uptime.

**Response 200**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-23T08:00:00.000Z",
  "uptime": 42.5
}
```

---

### GET /api/info

Returns API name, version, and current environment.

**Response 200**
```json
{
  "name": "Node Conf Starter API",
  "version": "1.0.0",
  "environment": "development"
}
```

---

### POST /api/echo

Echoes the JSON body back. Useful for debugging.

**Request body:** any valid JSON object

**Response 200**
```json
{
  "echo": { "your": "payload" },
  "receivedAt": "2026-06-23T08:00:00.000Z"
}
```

---

## Reference Data

### GET /api/skills

Returns the list of all available skill names, ordered alphabetically.

**Response 200**
```json
{
  "skills": ["Agile", "AWS", "CI/CD", "Data Modelling", "Docker", "GraphQL", "Java", "JavaScript", "Kubernetes", "Machine Learning", "Node.js", "Performance Testing", "Python", "React", "REST API Design", "Security", "SQL", "System Design", "Test Automation", "TypeScript"]
}
```

---

### GET /api/roles

Returns the list of all available role type names, ordered alphabetically.

**Response 200**
```json
{
  "roles": ["Architect", "Data Specialist", "Delivery Manager", "DevOps Engineer", "Engineer", "Tester"]
}
```

---

## Work Requests

### POST /api/work-requests

Creates a new work request. Validates that all specified skill and role names exist in the database.

**Request body**
```json
{
  "title": "Platform Migration Team",
  "description": "Migrate legacy monolith to microservices on AWS.",
  "requiredSkills": ["TypeScript", "Docker", "AWS"],
  "requiredRoles": ["Architect", "Engineer"],
  "urgencyLevel": "High",
  "durationWeeks": 24
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | yes | 1–150 characters |
| `description` | string | no | max 2000 characters |
| `requiredSkills` | string[] | yes | 1–20 items; each must be a known skill name |
| `requiredRoles` | string[] | yes | 1–10 items; each must be a known role name |
| `urgencyLevel` | string | yes | One of: `Critical`, `High`, `Medium`, `Low` |
| `durationWeeks` | integer | yes | 1–104 |

**Response 201**
```json
{
  "id": "clxyz123",
  "title": "Platform Migration Team",
  "description": "Migrate legacy monolith to microservices on AWS.",
  "urgencyLevel": "High",
  "durationWeeks": 24,
  "requiredSkills": ["TypeScript", "Docker", "AWS"],
  "requiredRoles": ["Architect", "Engineer"],
  "createdAt": "2026-06-23T08:00:00.000Z"
}
```

**Response 400 — validation failure**
```json
{
  "error": "Validation failed",
  "fields": {
    "title": "Title is required and must be between 1 and 150 characters",
    "requiredSkills": "Unknown skills: FakeSkill"
  }
}
```

---

### GET /api/work-requests

Returns a paginated list of all work requests, newest first. Each item includes a `hasSquad` flag.

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `pageSize` | integer | 20 | Results per page (1–100) |

**Response 200**
```json
{
  "data": [
    {
      "id": "clxyz123",
      "title": "Platform Migration Team",
      "description": "...",
      "urgencyLevel": "High",
      "durationWeeks": 24,
      "requiredSkills": ["TypeScript", "Docker", "AWS"],
      "requiredRoles": ["Architect", "Engineer"],
      "createdAt": "2026-06-23T08:00:00.000Z",
      "hasSquad": true
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### GET /api/work-requests/:id

Returns a single work request by ID. Includes the assembled squad if one has been saved.

**Path parameter:** `id` — CUID string

**Response 200 (without squad)**
```json
{
  "id": "clxyz123",
  "title": "Platform Migration Team",
  "description": "...",
  "urgencyLevel": "High",
  "durationWeeks": 24,
  "requiredSkills": ["TypeScript", "Docker", "AWS"],
  "requiredRoles": ["Architect", "Engineer"],
  "createdAt": "2026-06-23T08:00:00.000Z"
}
```

**Response 200 (with squad)**
```json
{
  "id": "clxyz123",
  "title": "Platform Migration Team",
  "description": "...",
  "urgencyLevel": "High",
  "durationWeeks": 24,
  "requiredSkills": ["TypeScript", "Docker", "AWS"],
  "requiredRoles": ["Architect", "Engineer"],
  "createdAt": "2026-06-23T08:00:00.000Z",
  "squad": {
    "id": "sqabc456",
    "skillCoveragePercent": 100.0,
    "createdAt": "2026-06-23T09:00:00.000Z",
    "updatedAt": "2026-06-23T09:00:00.000Z",
    "members": [
      { "id": "cand1", "name": "Thandi Mokoena", "role": "Engineer" },
      { "id": "cand2", "name": "Sipho Ndlovu", "role": "Architect" }
    ]
  }
}
```

**Response 404**
```json
{ "error": "Work request not found" }
```

---

### GET /api/work-requests/:id/shortlist

Scores and ranks all candidates against the work request. Returns only candidates with at least one matching skill.

**Path parameter:** `id` — CUID string

**Response 200**
```json
{
  "candidates": [
    {
      "candidateId": "cand1",
      "name": "Thandi Mokoena",
      "role": "Engineer",
      "matchScore": 87,
      "matchedSkills": ["TypeScript", "Docker"],
      "availabilityBand": 90,
      "workloadIndicator": 1,
      "breakdown": {
        "skillMatch": 0.67,
        "roleAlignment": 1.0,
        "availability": 0.9,
        "workload": 0.8
      }
    }
  ],
  "warnings": [
    {
      "candidateId": "cand99",
      "reason": "Zero overlapping skills with work request requirements",
      "type": "excluded"
    }
  ],
  "totalCandidates": 15,
  "qualifiedCount": 8
}
```

**Scoring formula:**
```
matchScore = min(1.0,
  skillMatch × 0.40
  + roleAlignment × 0.20
  + availability × urgencyMultiplier × 0.25
  + workload × 0.15
) × 100  (rounded to integer)

urgencyMultiplier = 1.5 if urgencyLevel ∈ {Critical, High}, else 1.0
workload factor   = max(0, (5 - min(workloadIndicator, 5)) / 5)
```

**Sorting:** descending by `matchScore`, then by `breakdown.skillMatch` as tiebreaker.

**Response 404**
```json
{ "error": "Work request not found" }
```

---

### POST /api/work-requests/:id/squad

Saves (or replaces) the squad for a work request. Calculates and persists skill coverage.

**Path parameter:** `id` — CUID string

**Request body**
```json
{
  "candidateIds": ["cand1", "cand2", "cand3"]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `candidateIds` | string[] | yes | ≥1 item; all must be known Candidate IDs |

**Response 201**
```json
{
  "id": "sqabc456",
  "workRequestId": "clxyz123",
  "skillCoveragePercent": 100.0,
  "createdAt": "2026-06-23T09:00:00.000Z",
  "updatedAt": "2026-06-23T09:00:00.000Z",
  "members": [
    { "id": "cand1", "name": "Thandi Mokoena", "role": "Engineer" },
    { "id": "cand2", "name": "Sipho Ndlovu", "role": "Architect" }
  ]
}
```

**Response 400 — validation failure**
```json
{
  "error": "Validation failed",
  "fields": {
    "candidateIds": "Unknown candidate IDs: fake-id-1"
  }
}
```

**Response 404**
```json
{ "error": "Work request not found" }
```

**Note:** Saving a squad is destructive — the existing squad for this work request (if any) is deleted before the new one is created.

---

## Error Envelope

All unhandled server errors return a standardised JSON envelope:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong",
    "status": 500,
    "timestamp": "2026-06-23T08:00:00.000Z"
  }
}
```

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Process liveness |
| GET | `/api/health` | API health + uptime |
| GET | `/api/info` | API name/version/env |
| POST | `/api/echo` | Echo request body |
| GET | `/api/skills` | List all skills |
| GET | `/api/roles` | List all role types |
| POST | `/api/work-requests` | Create work request |
| GET | `/api/work-requests` | List work requests (paginated) |
| GET | `/api/work-requests/:id` | Get work request detail (+ squad) |
| GET | `/api/work-requests/:id/shortlist` | Score + rank candidates |
| POST | `/api/work-requests/:id/squad` | Save/replace squad |
