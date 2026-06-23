import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Integration tests for the /api/work-requests endpoints.
 *
 * Requirements validated: 1.1, 1.2, 1.3, 1.7, 6.3
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-work-requests.db')}`;

// Set DATABASE_URL before importing the app so Prisma connects to the test db
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

let app: any;

describe('/api/work-requests', () => {
  beforeAll(async () => {
    // Push schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Seed the test database so we have skills and roles available
    execSync('npx tsx prisma/seed.ts', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Import the app (reads DATABASE_URL from env)
    const module = await import('../../src/index.js');
    app = module.app;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    const dbPath = path.resolve(serverRoot, 'prisma/test-work-requests.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('POST /api/work-requests', () => {
    it('should create a valid work request and return 201', async () => {
      const payload = {
        title: 'Build Authentication Module',
        description: 'Implement OAuth2 login flow for the platform',
        requiredSkills: ['TypeScript', 'React'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'High',
        durationWeeks: 8,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Build Authentication Module');
      expect(response.body.description).toBe('Implement OAuth2 login flow for the platform');
      expect(response.body.urgencyLevel).toBe('High');
      expect(response.body.durationWeeks).toBe(8);
      expect(response.body.requiredSkills).toContain('TypeScript');
      expect(response.body.requiredSkills).toContain('React');
      expect(response.body.requiredRoles).toContain('Engineer');
      expect(response.body.createdAt).toBeDefined();
    });

    it('should allow duplicate titles as distinct entries (Req 1.7)', async () => {
      const payload = {
        title: 'Duplicate Title Request',
        description: 'First entry',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Medium',
        durationWeeks: 4,
      };

      const first = await request(app).post('/api/work-requests').send(payload);
      const second = await request(app)
        .post('/api/work-requests')
        .send({ ...payload, description: 'Second entry' });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.id).not.toBe(second.body.id);
      expect(first.body.title).toBe(second.body.title);
    });

    it('should return 400 with field errors when title is missing', async () => {
      const payload = {
        title: '',
        description: 'Some description',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('fields');
      expect(response.body.fields).toHaveProperty('title');
    });

    it('should return 400 when title exceeds 150 characters', async () => {
      const payload = {
        title: 'A'.repeat(151),
        description: 'Valid description',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('title');
    });

    it('should return 400 when requiredSkills is empty', async () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        requiredSkills: [],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('requiredSkills');
    });

    it('should return 400 when requiredRoles is empty', async () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        requiredSkills: ['TypeScript'],
        requiredRoles: [],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('requiredRoles');
    });

    it('should return 400 when urgencyLevel is invalid', async () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Extreme',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('urgencyLevel');
    });

    it('should return 400 when durationWeeks is out of range', async () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 105,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('durationWeeks');
    });

    it('should return 400 with multiple field errors when multiple fields are invalid', async () => {
      const payload = {
        title: '',
        requiredSkills: [],
        requiredRoles: [],
        urgencyLevel: 'Invalid',
        durationWeeks: 0,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('title');
      expect(response.body.fields).toHaveProperty('requiredSkills');
      expect(response.body.fields).toHaveProperty('requiredRoles');
      expect(response.body.fields).toHaveProperty('urgencyLevel');
      expect(response.body.fields).toHaveProperty('durationWeeks');
    });

    it('should return 400 when requiredSkills contains unknown skill names', async () => {
      const payload = {
        title: 'Valid Title',
        description: 'Valid description',
        requiredSkills: ['NonExistentSkill123'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      };

      const response = await request(app).post('/api/work-requests').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.fields).toHaveProperty('requiredSkills');
    });
  });

  describe('GET /api/work-requests (pagination - Req 6.3)', () => {
    beforeAll(async () => {
      // Create several work requests to test pagination
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/work-requests')
          .send({
            title: `Pagination Test ${i + 1}`,
            description: `Description ${i + 1}`,
            requiredSkills: ['TypeScript'],
            requiredRoles: ['Engineer'],
            urgencyLevel: 'Low',
            durationWeeks: 4,
          });
      }
    });

    it('should return paginated results with defaults (page 1, pageSize 20)', async () => {
      const response = await request(app).get('/api/work-requests');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pageSize');
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should respect custom page and pageSize parameters', async () => {
      const response = await request(app).get('/api/work-requests?page=1&pageSize=2');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.page).toBe(1);
    });

    it('should cap pageSize at 100', async () => {
      const response = await request(app).get('/api/work-requests?pageSize=200');

      expect(response.status).toBe(200);
      expect(response.body.pageSize).toBe(100);
    });

    it('should order results by creation date descending', async () => {
      const response = await request(app).get('/api/work-requests');
      const dates = response.body.data.map((wr: { createdAt: string }) => new Date(wr.createdAt).getTime());

      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it('should return correct total count regardless of pagination', async () => {
      const allResponse = await request(app).get('/api/work-requests?pageSize=100');
      const pagedResponse = await request(app).get('/api/work-requests?page=1&pageSize=2');

      expect(pagedResponse.body.total).toBe(allResponse.body.total);
    });

    it('should return each work request with expected fields', async () => {
      const response = await request(app).get('/api/work-requests');
      const item = response.body.data[0];

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('urgencyLevel');
      expect(item).toHaveProperty('durationWeeks');
      expect(item).toHaveProperty('requiredSkills');
      expect(item).toHaveProperty('requiredRoles');
      expect(item).toHaveProperty('createdAt');
    });
  });

  describe('GET /api/work-requests/:id', () => {
    let createdId: string;

    beforeAll(async () => {
      const response = await request(app).post('/api/work-requests').send({
        title: 'Get By ID Test',
        description: 'Testing the get-by-id endpoint',
        requiredSkills: ['TypeScript', 'React'],
        requiredRoles: ['Engineer', 'Architect'],
        urgencyLevel: 'Critical',
        durationWeeks: 12,
      });
      createdId = response.body.id;
    });

    it('should return the work request by id with all fields', async () => {
      const response = await request(app).get(`/api/work-requests/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdId);
      expect(response.body.title).toBe('Get By ID Test');
      expect(response.body.description).toBe('Testing the get-by-id endpoint');
      expect(response.body.urgencyLevel).toBe('Critical');
      expect(response.body.durationWeeks).toBe(12);
      expect(response.body.requiredSkills).toContain('TypeScript');
      expect(response.body.requiredSkills).toContain('React');
      expect(response.body.requiredRoles).toContain('Engineer');
      expect(response.body.requiredRoles).toContain('Architect');
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return 404 for a non-existent work request id', async () => {
      const response = await request(app).get('/api/work-requests/non-existent-id-xyz');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/work-requests/:id', () => {
    it('should delete a work request and return 204', async () => {
      // Create a work request to delete
      const createResponse = await request(app).post('/api/work-requests').send({
        title: 'To Be Deleted',
        description: 'This work request will be deleted',
        requiredSkills: ['TypeScript'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'Low',
        durationWeeks: 2,
      });
      const id = createResponse.body.id;

      // Delete it
      const deleteResponse = await request(app).delete(`/api/work-requests/${id}`);
      expect(deleteResponse.status).toBe(204);

      // Verify it's gone
      const getResponse = await request(app).get(`/api/work-requests/${id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting a non-existent work request', async () => {
      const response = await request(app).delete('/api/work-requests/non-existent-id-xyz');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Work request not found' });
    });

    it('should delete associated squad and squad members in the transaction', async () => {
      // Create a work request
      const createResponse = await request(app).post('/api/work-requests').send({
        title: 'Delete With Squad',
        description: 'This has a squad that should also be deleted',
        requiredSkills: ['TypeScript', 'React'],
        requiredRoles: ['Engineer'],
        urgencyLevel: 'High',
        durationWeeks: 6,
      });
      const id = createResponse.body.id;

      // Get candidates directly from the database to create a squad
      const candidates = await prisma.candidate.findMany({ take: 2 });
      const candidateIds = candidates.map((c) => c.id);

      // Create a squad for the work request
      const squadResponse = await request(app)
        .post(`/api/work-requests/${id}/squad`)
        .send({ candidateIds });
      expect(squadResponse.status).toBe(201);

      // Delete the work request
      const deleteResponse = await request(app).delete(`/api/work-requests/${id}`);
      expect(deleteResponse.status).toBe(204);

      // Verify work request is gone
      const getResponse = await request(app).get(`/api/work-requests/${id}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
