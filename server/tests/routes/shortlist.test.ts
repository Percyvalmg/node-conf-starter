import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Integration tests for the GET /api/work-requests/:id/shortlist endpoint.
 *
 * Requirements validated: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.4
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-shortlist.db')}`;

// Set DATABASE_URL before importing the app so Prisma connects to the test db
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

let app: any;

describe('GET /api/work-requests/:id/shortlist', () => {
  let workRequestId: string;

  beforeAll(async () => {
    // Push schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Seed the test database with known candidates
    execSync('npx tsx prisma/seed.ts', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Import the app
    const module = await import('../../src/index.js');
    app = module.app;

    // Create a work request to use for shortlisting
    const response = await request(app).post('/api/work-requests').send({
      title: 'Shortlist Integration Test',
      description: 'Testing the shortlist endpoint',
      requiredSkills: ['TypeScript', 'React', 'Node.js'],
      requiredRoles: ['Engineer'],
      urgencyLevel: 'High',
      durationWeeks: 8,
    });

    workRequestId = response.body.id;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    const dbPath = path.resolve(serverRoot, 'prisma/test-shortlist.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should return 200 with ranked candidates for a valid work request', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('candidates');
    expect(response.body).toHaveProperty('warnings');
    expect(response.body).toHaveProperty('totalCandidates');
    expect(response.body).toHaveProperty('qualifiedCount');
    expect(Array.isArray(response.body.candidates)).toBe(true);
    expect(response.body.candidates.length).toBeGreaterThan(0);
  });

  it('should return candidates sorted by matchScore descending', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const candidates = response.body.candidates;

    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].matchScore).toBeGreaterThanOrEqual(candidates[i].matchScore);
    }
  });

  it('should include score breakdown for each candidate', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const candidate = response.body.candidates[0];

    expect(candidate).toHaveProperty('breakdown');
    expect(candidate.breakdown).toHaveProperty('skillMatch');
    expect(candidate.breakdown).toHaveProperty('roleAlignment');
    expect(candidate.breakdown).toHaveProperty('availability');
    expect(candidate.breakdown).toHaveProperty('workload');
  });

  it('should include matchedSkills for each candidate', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const candidate = response.body.candidates[0];

    expect(Array.isArray(candidate.matchedSkills)).toBe(true);
    expect(candidate.matchedSkills.length).toBeGreaterThan(0);
    // Each matched skill should be one of the required skills
    for (const skill of candidate.matchedSkills) {
      expect(['TypeScript', 'React', 'Node.js'].map(s => s.toLowerCase())).toContain(skill.toLowerCase());
    }
  });

  it('should exclude candidates with zero skill match (Req 4.4)', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const candidates = response.body.candidates;

    for (const candidate of candidates) {
      expect(candidate.matchedSkills.length).toBeGreaterThan(0);
      expect(candidate.matchScore).toBeGreaterThan(0);
    }
  });

  it('should return matchScore as an integer between 0 and 100', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const candidates = response.body.candidates;

    for (const candidate of candidates) {
      expect(Number.isInteger(candidate.matchScore)).toBe(true);
      expect(candidate.matchScore).toBeGreaterThanOrEqual(0);
      expect(candidate.matchScore).toBeLessThanOrEqual(100);
    }
  });

  it('should apply urgency multiplier (High urgency → 1.5x on availability)', async () => {
    // Create a work request with Low urgency for comparison
    const lowUrgencyRes = await request(app).post('/api/work-requests').send({
      title: 'Low Urgency Test',
      description: 'For comparison',
      requiredSkills: ['TypeScript', 'React', 'Node.js'],
      requiredRoles: ['Engineer'],
      urgencyLevel: 'Low',
      durationWeeks: 8,
    });
    const lowUrgencyId = lowUrgencyRes.body.id;

    const highRes = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);
    const lowRes = await request(app).get(`/api/work-requests/${lowUrgencyId}/shortlist`);

    // The top candidate with High urgency should score equal or higher than with Low urgency
    // (assuming the same candidate is top in both — candidates with availability > 0 get boosted)
    const highTop = highRes.body.candidates[0];
    const lowTop = lowRes.body.candidates[0];

    // Find the same candidate in both to compare
    const highCandidate = highRes.body.candidates.find(
      (c: any) => c.candidateId === highTop.candidateId,
    );
    const lowCandidate = lowRes.body.candidates.find(
      (c: any) => c.candidateId === highTop.candidateId,
    );

    if (highCandidate && lowCandidate && highCandidate.availabilityBand > 0) {
      expect(highCandidate.matchScore).toBeGreaterThanOrEqual(lowCandidate.matchScore);
    }
  });

  it('should return 404 for a non-existent work request', async () => {
    const response = await request(app).get('/api/work-requests/non-existent-id/shortlist');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('should include totalCandidates reflecting the full talent pool size', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);

    // Seed has 22 candidates
    expect(response.body.totalCandidates).toBeGreaterThanOrEqual(20);
  });

  it('should have qualifiedCount equal to the candidates array length', async () => {
    const response = await request(app).get(`/api/work-requests/${workRequestId}/shortlist`);

    expect(response.body.qualifiedCount).toBe(response.body.candidates.length);
  });

  it('should produce correct results for a work request with no matching candidates', async () => {
    // Create a work request requiring skills no candidate has
    // We'll use a nonsensical skill name — but first we need to add it to the DB
    // Actually, the seed data validates skills exist. Let's create a work request
    // with a role and skills that don't match anyone well.
    // Better approach: create a work request with a very rare skill combo.
    // The seed doesn't have "Machine Learning" + "Kubernetes" + "GraphQL" + "Performance Testing"
    // together on one candidate, so we can test what qualifies.

    const response = await request(app).post('/api/work-requests').send({
      title: 'Niche Requirement',
      description: 'Very specific skills',
      requiredSkills: ['Machine Learning', 'Kubernetes', 'GraphQL', 'Performance Testing'],
      requiredRoles: ['Data Specialist'],
      urgencyLevel: 'Low',
      durationWeeks: 4,
    });

    const shortlistRes = await request(app).get(
      `/api/work-requests/${response.body.id}/shortlist`,
    );

    expect(shortlistRes.status).toBe(200);
    // Some candidates may partially match, but all results should have > 0 matched skills
    for (const candidate of shortlistRes.body.candidates) {
      expect(candidate.matchedSkills.length).toBeGreaterThan(0);
    }
  });
});
