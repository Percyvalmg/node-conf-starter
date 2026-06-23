import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prismaClient.js';
import { rankCandidates } from '../scoring/index.js';
import type { CandidateData, WorkRequestData } from '../scoring/index.js';

export const workRequestsRouter = Router();

const VALID_URGENCY_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;

interface ValidationErrors {
  [field: string]: string;
}

function validateWorkRequestInput(body: unknown): ValidationErrors | null {
  const errors: ValidationErrors = {};

  if (!body || typeof body !== 'object') {
    return { body: 'Request body is required' };
  }

  const input = body as Record<string, unknown>;

  // Title: required, 1-150 chars
  if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
    errors.title = 'Title is required and must be between 1 and 150 characters';
  } else if (input.title.length > 150) {
    errors.title = 'Title must be at most 150 characters';
  }

  // Description: optional but max 2000 chars
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (input.description.length > 2000) {
      errors.description = 'Description must be at most 2000 characters';
    }
  }

  // Required skills: 1-20 skill names
  if (!Array.isArray(input.requiredSkills) || input.requiredSkills.length === 0) {
    errors.requiredSkills = 'At least 1 skill is required';
  } else if (input.requiredSkills.length > 20) {
    errors.requiredSkills = 'At most 20 skills are allowed';
  } else if (!input.requiredSkills.every((s: unknown) => typeof s === 'string' && s.trim().length > 0)) {
    errors.requiredSkills = 'All skills must be non-empty strings';
  }

  // Required roles: 1-10 role type names
  if (!Array.isArray(input.requiredRoles) || input.requiredRoles.length === 0) {
    errors.requiredRoles = 'At least 1 role is required';
  } else if (input.requiredRoles.length > 10) {
    errors.requiredRoles = 'At most 10 roles are allowed';
  } else if (!input.requiredRoles.every((r: unknown) => typeof r === 'string' && r.trim().length > 0)) {
    errors.requiredRoles = 'All roles must be non-empty strings';
  }

  // Urgency level: required, must be one of the valid values
  if (
    !input.urgencyLevel ||
    typeof input.urgencyLevel !== 'string' ||
    !VALID_URGENCY_LEVELS.includes(input.urgencyLevel as (typeof VALID_URGENCY_LEVELS)[number])
  ) {
    errors.urgencyLevel = 'Urgency level must be one of: Critical, High, Medium, Low';
  }

  // Duration weeks: required, 1-104
  if (input.durationWeeks === undefined || input.durationWeeks === null) {
    errors.durationWeeks = 'Duration in weeks is required';
  } else if (
    typeof input.durationWeeks !== 'number' ||
    !Number.isInteger(input.durationWeeks) ||
    input.durationWeeks < 1 ||
    input.durationWeeks > 104
  ) {
    errors.durationWeeks = 'Duration must be an integer between 1 and 104 weeks';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// POST /api/work-requests — create a work request
workRequestsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationErrors = validateWorkRequestInput(req.body);
    if (validationErrors) {
      res.status(400).json({ error: 'Validation failed', fields: validationErrors });
      return;
    }

    const { title, description, requiredSkills, requiredRoles, urgencyLevel, durationWeeks } = req.body;

    // Look up skills by name
    const skills = await prisma.skill.findMany({
      where: { name: { in: requiredSkills } },
    });

    if (skills.length !== requiredSkills.length) {
      const foundNames = skills.map((s) => s.name);
      const missing = (requiredSkills as string[]).filter((name) => !foundNames.includes(name));
      res.status(400).json({
        error: 'Validation failed',
        fields: { requiredSkills: `Unknown skills: ${missing.join(', ')}` },
      });
      return;
    }

    // Look up roles by name
    const roles = await prisma.roleType.findMany({
      where: { name: { in: requiredRoles } },
    });

    if (roles.length !== requiredRoles.length) {
      const foundNames = roles.map((r) => r.name);
      const missing = (requiredRoles as string[]).filter((name) => !foundNames.includes(name));
      res.status(400).json({
        error: 'Validation failed',
        fields: { requiredRoles: `Unknown roles: ${missing.join(', ')}` },
      });
      return;
    }

    // Create the work request with skill and role associations
    const workRequest = await prisma.workRequest.create({
      data: {
        title: title.trim(),
        description: description ?? '',
        urgencyLevel,
        durationWeeks,
        requiredSkills: {
          create: skills.map((skill) => ({ skillId: skill.id })),
        },
        requiredRoles: {
          create: roles.map((role) => ({ roleTypeId: role.id })),
        },
      },
      include: {
        requiredSkills: { include: { skill: true } },
        requiredRoles: { include: { roleType: true } },
      },
    });

    res.status(201).json({
      id: workRequest.id,
      title: workRequest.title,
      description: workRequest.description,
      urgencyLevel: workRequest.urgencyLevel,
      durationWeeks: workRequest.durationWeeks,
      requiredSkills: workRequest.requiredSkills.map((ws) => ws.skill.name),
      requiredRoles: workRequest.requiredRoles.map((wr) => wr.roleType.name),
      createdAt: workRequest.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/work-requests — list with pagination
workRequestsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));

    const [data, total] = await Promise.all([
      prisma.workRequest.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          requiredSkills: { include: { skill: true } },
          requiredRoles: { include: { roleType: true } },
          squad: { select: { id: true } },
        },
      }),
      prisma.workRequest.count(),
    ]);

    res.json({
      data: data.map((wr) => ({
        id: wr.id,
        title: wr.title,
        description: wr.description,
        urgencyLevel: wr.urgencyLevel,
        durationWeeks: wr.durationWeeks,
        requiredSkills: wr.requiredSkills.map((ws) => ws.skill.name),
        requiredRoles: wr.requiredRoles.map((wrr) => wrr.roleType.name),
        createdAt: wr.createdAt.toISOString(),
        hasSquad: wr.squad !== null,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/work-requests/:id/shortlist — score and rank candidates for a work request
workRequestsRouter.get('/:id/shortlist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch the work request with required skills and roles
    const workRequest = await prisma.workRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requiredSkills: { include: { skill: true } },
        requiredRoles: { include: { roleType: true } },
      },
    });

    if (!workRequest) {
      res.status(404).json({ error: 'Work request not found' });
      return;
    }

    // Fetch all candidates with their skills
    const candidates = await prisma.candidate.findMany({
      include: {
        skills: { include: { skill: true } },
      },
    });

    // Map DB data to CandidateData[]
    const candidateData: CandidateData[] = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      skills: c.skills.map((cs) => cs.skill.name),
      availabilityBand: c.availabilityBand,
      workloadIndicator: c.workloadIndicator,
    }));

    // Map DB data to WorkRequestData
    const workRequestData: WorkRequestData = {
      id: workRequest.id,
      requiredSkills: workRequest.requiredSkills.map((ws) => ws.skill.name),
      requiredRoles: workRequest.requiredRoles.map((wr) => wr.roleType.name),
      urgencyLevel: workRequest.urgencyLevel as WorkRequestData['urgencyLevel'],
      durationWeeks: workRequest.durationWeeks,
    };

    // Invoke scoring engine
    const rankingResult = rankCandidates(candidateData, workRequestData);

    res.json({
      candidates: rankingResult.results,
      warnings: rankingResult.warnings,
      totalCandidates: rankingResult.totalCandidates,
      qualifiedCount: rankingResult.qualifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/work-requests/:id — get work request details (includes squad when present)
workRequestsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workRequest = await prisma.workRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requiredSkills: { include: { skill: true } },
        requiredRoles: { include: { roleType: true } },
        squad: {
          include: {
            members: {
              include: { candidate: true },
            },
          },
        },
      },
    });

    if (!workRequest) {
      res.status(404).json({ error: 'Work request not found' });
      return;
    }

    const response: Record<string, unknown> = {
      id: workRequest.id,
      title: workRequest.title,
      description: workRequest.description,
      urgencyLevel: workRequest.urgencyLevel,
      durationWeeks: workRequest.durationWeeks,
      requiredSkills: workRequest.requiredSkills.map((ws) => ws.skill.name),
      requiredRoles: workRequest.requiredRoles.map((wr) => wr.roleType.name),
      createdAt: workRequest.createdAt.toISOString(),
    };

    if (workRequest.squad) {
      response.squad = {
        id: workRequest.squad.id,
        skillCoveragePercent: workRequest.squad.skillCoveragePercent,
        createdAt: workRequest.squad.createdAt.toISOString(),
        updatedAt: workRequest.squad.updatedAt.toISOString(),
        members: workRequest.squad.members.map((m) => ({
          id: m.candidate.id,
          name: m.candidate.name,
          role: m.candidate.role,
        })),
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/work-requests/:id — delete a work request and all associated records
workRequestsRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if the work request exists
    const workRequest = await prisma.workRequest.findUnique({
      where: { id: req.params.id },
      include: {
        squad: { select: { id: true } },
      },
    });

    if (!workRequest) {
      res.status(404).json({ error: 'Work request not found' });
      return;
    }

    // Delete all associated records in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete SquadMember records (via squad)
      if (workRequest.squad) {
        await tx.squadMember.deleteMany({
          where: { squadId: workRequest.squad.id },
        });

        // 2. Delete Squad record
        await tx.squad.delete({
          where: { id: workRequest.squad.id },
        });
      }

      // 3. Delete WorkRequestSkill records
      await tx.workRequestSkill.deleteMany({
        where: { workRequestId: req.params.id },
      });

      // 4. Delete WorkRequestRole records
      await tx.workRequestRole.deleteMany({
        where: { workRequestId: req.params.id },
      });

      // 5. Delete WorkRequest record
      await tx.workRequest.delete({
        where: { id: req.params.id },
      });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/work-requests/:id/squad — save or replace squad selection
workRequestsRouter.post('/:id/squad', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { candidateIds } = req.body;

    // Validate candidateIds
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        fields: { candidateIds: 'At least one candidate must be selected' },
      });
      return;
    }

    if (!candidateIds.every((id: unknown) => typeof id === 'string' && id.trim().length > 0)) {
      res.status(400).json({
        error: 'Validation failed',
        fields: { candidateIds: 'All candidate IDs must be non-empty strings' },
      });
      return;
    }

    // Fetch the work request with required skills
    const workRequest = await prisma.workRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requiredSkills: { include: { skill: true } },
        requiredRoles: { include: { roleType: true } },
      },
    });

    if (!workRequest) {
      res.status(404).json({ error: 'Work request not found' });
      return;
    }

    // Verify all candidates exist
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      include: { skills: { include: { skill: true } } },
    });

    if (candidates.length !== candidateIds.length) {
      const foundIds = candidates.map((c) => c.id);
      const missing = (candidateIds as string[]).filter((id) => !foundIds.includes(id));
      res.status(400).json({
        error: 'Validation failed',
        fields: { candidateIds: `Unknown candidate IDs: ${missing.join(', ')}` },
      });
      return;
    }

    // Calculate skill coverage: distinct matched skills / total required skills × 100
    const requiredSkillNames = workRequest.requiredSkills.map((ws) => ws.skill.name);
    const squadSkills = new Set<string>();
    for (const candidate of candidates) {
      for (const cs of candidate.skills) {
        if (requiredSkillNames.includes(cs.skill.name)) {
          squadSkills.add(cs.skill.name);
        }
      }
    }
    const skillCoveragePercent =
      requiredSkillNames.length > 0
        ? Math.round((squadSkills.size / requiredSkillNames.length) * 100 * 100) / 100
        : 0;

    // Upsert: delete existing squad if present, then create new one
    const existingSquad = await prisma.squad.findUnique({
      where: { workRequestId: req.params.id },
    });

    if (existingSquad) {
      await prisma.squad.delete({ where: { id: existingSquad.id } });
    }

    const squad = await prisma.squad.create({
      data: {
        workRequestId: req.params.id,
        skillCoveragePercent,
        members: {
          create: candidateIds.map((candidateId: string) => ({ candidateId })),
        },
      },
      include: {
        members: {
          include: { candidate: true },
        },
      },
    });

    res.status(201).json({
      id: squad.id,
      workRequestId: squad.workRequestId,
      skillCoveragePercent: squad.skillCoveragePercent,
      createdAt: squad.createdAt.toISOString(),
      updatedAt: squad.updatedAt.toISOString(),
      members: squad.members.map((m) => ({
        id: m.candidate.id,
        name: m.candidate.name,
        role: m.candidate.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});
