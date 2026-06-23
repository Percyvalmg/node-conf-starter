import { Router } from 'express';
import { prisma } from '../prismaClient.js';

export const rolesRouter = Router();

rolesRouter.get('/', async (_req, res, next) => {
  try {
    const roles = await prisma.roleType.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    res.json({ roles: roles.map((r) => r.name) });
  } catch (error) {
    next(error);
  }
});
