import { Router } from 'express';
import { prisma } from '../prismaClient.js';

export const skillsRouter = Router();

skillsRouter.get('/', async (_req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    res.json({ skills: skills.map((s) => s.name) });
  } catch (error) {
    next(error);
  }
});
