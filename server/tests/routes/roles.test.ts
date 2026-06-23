import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Integration tests for the GET /api/roles endpoint.
 *
 * Requirements validated: 2.5, 2.6
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-roles.db')}`;

// Set DATABASE_URL before importing the app so Prisma connects to the test db
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

let app: any;

describe('GET /api/roles', () => {
  beforeAll(async () => {
    // Push schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'pipe',
    });

    // Import the app
    const module = await import('../../src/index.js');
    app = module.app;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    const dbPath = path.resolve(serverRoot, 'prisma/test-roles.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('with empty database', () => {
    it('should return an empty roles array when no roles exist', async () => {
      const response = await request(app).get('/api/roles');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ roles: [] });
    });
  });

  describe('with seeded data', () => {
    beforeAll(async () => {
      // Seed the test database
      execSync('npx tsx prisma/seed.ts', {
        cwd: serverRoot,
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'pipe',
      });
    }, 30000);

    it('should return all distinct role type names', async () => {
      const response = await request(app).get('/api/roles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('roles');
      expect(Array.isArray(response.body.roles)).toBe(true);
      expect(response.body.roles.length).toBeGreaterThanOrEqual(5);
    });

    it('should return roles in a consistent sorted order', async () => {
      const response = await request(app).get('/api/roles');

      const roles: string[] = response.body.roles;
      // The API sorts using database collation (case-sensitive ASC).
      for (let i = 1; i < roles.length; i++) {
        expect(
          roles[i - 1] <= roles[i],
          `Expected "${roles[i - 1]}" to sort before or equal to "${roles[i]}"`
        ).toBe(true);
      }
    });

    it('should return roles as an array of strings', async () => {
      const response = await request(app).get('/api/roles');

      for (const role of response.body.roles) {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      }
    });

    it('should include the required role types from the seed data', async () => {
      const response = await request(app).get('/api/roles');
      const roles: string[] = response.body.roles;

      expect(roles).toContain('Architect');
      expect(roles).toContain('Engineer');
      expect(roles).toContain('Tester');
      expect(roles).toContain('Data Specialist');
      expect(roles).toContain('Delivery Manager');
    });
  });
});
