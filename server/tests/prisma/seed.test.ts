import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Seed smoke tests verify that the database seed script populates the talent pool
 * with the minimum required data for the squad assembly system to function.
 *
 * Requirements validated: 2.1, 2.2, 2.3
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');
const TEST_DB_URL = `file:${path.resolve(serverRoot, 'prisma/test-seed.db')}`;

const prisma = new PrismaClient({
  datasources: {
    db: { url: TEST_DB_URL },
  },
});

describe('Seed smoke tests', () => {
  beforeAll(async () => {
    // Push schema to a fresh test database and run the seed
    execSync('npx prisma db push --force-reset --skip-generate', {
      cwd: serverRoot,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: 'pipe',
    });

    execSync('npx tsx prisma/seed.ts', {
      cwd: serverRoot,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
      },
      stdio: 'pipe',
    });
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
    const fs = await import('fs');
    const dbPath = path.resolve(serverRoot, 'prisma/test-seed.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('should seed at least 20 candidates', async () => {
    const count = await prisma.candidate.count();
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it('should seed at least 5 distinct role types', async () => {
    const roles = await prisma.roleType.findMany();
    expect(roles.length).toBeGreaterThanOrEqual(5);
  });

  it('should seed at least 15 distinct skills', async () => {
    const skills = await prisma.skill.findMany();
    expect(skills.length).toBeGreaterThanOrEqual(15);
  });

  it('should have at least 2 candidates per required role type', async () => {
    const requiredRoles = [
      'Architect',
      'Engineer',
      'Tester',
      'Data Specialist',
      'Delivery Manager',
    ];

    for (const role of requiredRoles) {
      const count = await prisma.candidate.count({ where: { role } });
      expect(
        count,
        `Expected at least 2 candidates for role "${role}", found ${count}`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('each candidate should have between 1 and 10 skills', async () => {
    const candidates = await prisma.candidate.findMany({
      include: { skills: true },
    });

    for (const candidate of candidates) {
      expect(
        candidate.skills.length,
        `Candidate "${candidate.name}" has ${candidate.skills.length} skills`
      ).toBeGreaterThanOrEqual(1);
      expect(
        candidate.skills.length,
        `Candidate "${candidate.name}" has ${candidate.skills.length} skills`
      ).toBeLessThanOrEqual(10);
    }
  });

  it('each candidate should have availability band between 0 and 100', async () => {
    const candidates = await prisma.candidate.findMany();

    for (const candidate of candidates) {
      expect(candidate.availabilityBand).toBeGreaterThanOrEqual(0);
      expect(candidate.availabilityBand).toBeLessThanOrEqual(100);
    }
  });

  it('each candidate should have workload indicator between 0 and 10', async () => {
    const candidates = await prisma.candidate.findMany();

    for (const candidate of candidates) {
      expect(candidate.workloadIndicator).toBeGreaterThanOrEqual(0);
      expect(candidate.workloadIndicator).toBeLessThanOrEqual(10);
    }
  });
});
