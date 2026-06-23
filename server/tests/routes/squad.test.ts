import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Integration tests for the squad endpoints.
 *
 * Requirements validated: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-squad.db')}`;

process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

let app: any;
let workRequestId: string;
let candidateIds: string[];
let candidateWithSkills: { id: string; skills: string[] }[];

describe('/api/work-requests/:id/squad', () => {
  beforeAll(async () => {
    // Push schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Seed the test database
    execSync('npx tsx prisma/seed.ts', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Import the app
    const module = await import('../../src/index.js');
    app = module.app;

    // Create a work request for testing
    const res = await request(app).post('/api/work-requests').send({
      title: 'Squad Test Work Request',
      description: 'Test description',
      requiredSkills: ['TypeScript', 'React', 'Node.js'],
      requiredRoles: ['Engineer'],
      urgencyLevel: 'High',
      durationWeeks: 8,
    });
    workRequestId = res.body.id;

    // Get candidates from DB
    const candidates = await prisma.candidate.findMany({
      include: { skills: { include: { skill: true } } },
    });
    candidateIds = candidates.map((c) => c.id);
    candidateWithSkills = candidates.map((c) => ({
      id: c.id,
      skills: c.skills.map((cs) => cs.skill.name),
    }));
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    const dbPath = path.resolve(serverRoot, 'prisma/test-squad.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('POST /api/work-requests/:id/squad', () => {
    it('should save a squad with valid candidate IDs and return 201', async () => {
      const selectedIds = candidateIds.slice(0, 3);
      const res = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: selectedIds })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('workRequestId', workRequestId);
      expect(res.body).toHaveProperty('skillCoveragePercent');
      expect(typeof res.body.skillCoveragePercent).toBe('number');
      expect(res.body.skillCoveragePercent).toBeGreaterThanOrEqual(0);
      expect(res.body.skillCoveragePercent).toBeLessThanOrEqual(100);
      expect(res.body.members).toHaveLength(3);
      expect(res.body.members[0]).toHaveProperty('id');
      expect(res.body.members[0]).toHaveProperty('name');
      expect(res.body.members[0]).toHaveProperty('role');
    });

    it('should replace an existing squad (upsert)', async () => {
      // Save initial squad
      const firstIds = candidateIds.slice(0, 2);
      const first = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: firstIds })
        .expect(201);

      expect(first.body.members).toHaveLength(2);

      // Replace with different selection
      const secondIds = candidateIds.slice(2, 5);
      const second = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: secondIds })
        .expect(201);

      expect(second.body.members).toHaveLength(3);
      expect(second.body.id).not.toBe(first.body.id);

      // Verify only one squad exists for this work request
      const squads = await prisma.squad.findMany({
        where: { workRequestId },
      });
      expect(squads).toHaveLength(1);
      expect(squads[0].id).toBe(second.body.id);
    });

    it('should calculate skill coverage correctly', async () => {
      // Find candidates that have some of the required skills (TypeScript, React, Node.js)
      const requiredSkills = ['TypeScript', 'React', 'Node.js'];
      const candidatesWithRelevantSkills = candidateWithSkills.filter((c) =>
        c.skills.some((s) => requiredSkills.includes(s))
      );

      // Pick candidates that together cover all 3 required skills
      const selected: string[] = [];
      const coveredSkills = new Set<string>();
      for (const c of candidatesWithRelevantSkills) {
        const newSkills = c.skills.filter((s) => requiredSkills.includes(s) && !coveredSkills.has(s));
        if (newSkills.length > 0) {
          selected.push(c.id);
          newSkills.forEach((s) => coveredSkills.add(s));
        }
        if (coveredSkills.size === requiredSkills.length) break;
      }

      const res = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: selected })
        .expect(201);

      // If we covered all 3 skills, coverage should be 100%
      if (coveredSkills.size === requiredSkills.length) {
        expect(res.body.skillCoveragePercent).toBe(100);
      } else {
        const expectedCoverage =
          Math.round((coveredSkills.size / requiredSkills.length) * 100 * 100) / 100;
        expect(res.body.skillCoveragePercent).toBe(expectedCoverage);
      }
    });

    it('should return 400 when candidateIds is empty', async () => {
      const res = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: [] })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.fields.candidateIds).toBeDefined();
    });

    it('should return 400 when candidateIds is missing', async () => {
      const res = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.fields.candidateIds).toBeDefined();
    });

    it('should return 400 for unknown candidate IDs', async () => {
      const res = await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: ['nonexistent-id-123'] })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.fields.candidateIds).toContain('nonexistent-id-123');
    });

    it('should return 404 for non-existent work request', async () => {
      const res = await request(app)
        .post('/api/work-requests/nonexistent-id/squad')
        .send({ candidateIds: candidateIds.slice(0, 2) })
        .expect(404);

      expect(res.body.error).toBe('Work request not found');
    });
  });

  describe('GET /api/work-requests/:id (with squad)', () => {
    it('should include squad in the work request details after saving', async () => {
      // Save a squad first
      const selectedIds = candidateIds.slice(0, 3);
      await request(app)
        .post(`/api/work-requests/${workRequestId}/squad`)
        .send({ candidateIds: selectedIds })
        .expect(201);

      // Fetch the work request
      const res = await request(app)
        .get(`/api/work-requests/${workRequestId}`)
        .expect(200);

      expect(res.body).toHaveProperty('squad');
      expect(res.body.squad).toHaveProperty('id');
      expect(res.body.squad).toHaveProperty('skillCoveragePercent');
      expect(res.body.squad.members).toHaveLength(3);
      expect(res.body.squad.members[0]).toHaveProperty('id');
      expect(res.body.squad.members[0]).toHaveProperty('name');
      expect(res.body.squad.members[0]).toHaveProperty('role');
    });

    it('should not include squad when none has been saved for a new work request', async () => {
      // Create a new work request without a squad
      const createRes = await request(app).post('/api/work-requests').send({
        title: 'No Squad Work Request',
        description: 'Test',
        requiredSkills: ['Python'],
        requiredRoles: ['Tester'],
        urgencyLevel: 'Low',
        durationWeeks: 4,
      });

      const res = await request(app)
        .get(`/api/work-requests/${createRes.body.id}`)
        .expect(200);

      expect(res.body.squad).toBeUndefined();
    });
  });
});
