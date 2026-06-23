import { Router } from 'express';
import { skillsRouter } from './skills.js';
import { rolesRouter } from './roles.js';
import { workRequestsRouter } from './workRequests.js';

export const apiRouter = Router();

apiRouter.use('/skills', skillsRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/work-requests', workRequestsRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

apiRouter.post('/echo', (req, res) => {
  res.json({
    echo: req.body,
    receivedAt: new Date().toISOString(),
  });
});

apiRouter.get('/info', (_req, res) => {
  res.json({
    name: 'Node Conf Starter API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});
