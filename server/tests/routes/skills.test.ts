import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Integration tests for the GET /api/skills endpoint.
 *
 * Requirements validated: 2.4, 2.6
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-skills.db')}`;

// Set DATABASE_URL before importing the app so Prisma connects to the test db
process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
});

let app: any;

describe('GET /api/skills', () => {
  beforeAll(async () => {
    // Push schema to test database
    execSync('npx prisma db push --force-reset --skip-generate', {
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
    const dbPath = path.resolve(serverRoot, 'prisma/test-skills.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('with empty database', () => {
    it('should return an empty skills array when no skills exist', async () => {
      const response = await request(app).get('/api/skills');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ skills: [] });
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

    it('should return all distinct skill names', async () => {
      const response = await request(app).get('/api/skills');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('skills');
      expect(Array.isArray(response.body.skills)).toBe(true);
      expect(response.body.skills.length).toBeGreaterThanOrEqual(15);
    });

    it('should return skills in a consistent sorted order', async () => {
      const response = await request(app).get('/api/skills');

      const skills: string[] = response.body.skills;
      // The API sorts using database collation (case-sensitive ASC).
      // Verify that the list is sorted by simple string comparison (matching SQLite behavior).
      for (let i = 1; i < skills.length; i++) {
        expect(
          skills[i - 1] <= skills[i],
          `Expected "${skills[i - 1]}" to sort before or equal to "${skills[i]}"`
        ).toBe(true);
      }
    });

    it('should return skills as an array of strings', async () => {
      const response = await request(app).get('/api/skills');

      for (const skill of response.body.skills) {
        expect(typeof skill).toBe('string');
        expect(skill.length).toBeGreaterThan(0);
      }
    });

    it('should include known skills from the seed data', async () => {
      const response = await request(app).get('/api/skills');
      const skills: string[] = response.body.skills;

      expect(skills).toContain('TypeScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Python');
      expect(skills).toContain('AWS');
    });
  });
});
