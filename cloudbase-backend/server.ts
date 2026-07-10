import express, { type Request, type Response, type NextFunction } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import healthHandler from './api/health.js';
import loginHandler from './api/auth/login.js';
import initDbHandler from './api/admin/init-db.js';
import knowledgeIndexHandler from './api/knowledge/index.js';
import knowledgeIdHandler from './api/knowledge/[id].js';
import mistakesIndexHandler from './api/mistakes/index.js';
import mistakesIdHandler from './api/mistakes/[id].js';
import studyLogsIndexHandler from './api/study-logs/index.js';
import studyLogsIdHandler from './api/study-logs/[id].js';
import reviewRecordsHandler from './api/review-records/index.js';
import overviewHandler from './api/stats/overview.js';
import progressHandler from './api/progress.js';

type VercelHandler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

function adapt(handler: VercelHandler) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
    } catch (error) {
      next(error);
    }
  };
}

// Health and authentication
app.all('/api/health', adapt(healthHandler));
app.all('/api/auth/login', adapt(loginHandler));
app.all('/api/admin/init-db', adapt(initDbHandler));

// Knowledge points
app.all('/api/knowledge', adapt(knowledgeIndexHandler));
app.all('/api/knowledge/:id', (req, _res, next) => {
  req.query.id = req.params.id;
  next();
}, adapt(knowledgeIdHandler));

// Mistakes
app.all('/api/mistakes', adapt(mistakesIndexHandler));
app.all('/api/mistakes/:id', (req, _res, next) => {
  req.query.id = req.params.id;
  next();
}, adapt(mistakesIdHandler));

// Study logs
app.all('/api/study-logs', adapt(studyLogsIndexHandler));
app.all('/api/study-logs/:id', (req, _res, next) => {
  req.query.id = req.params.id;
  next();
}, adapt(studyLogsIdHandler));

// Reviews, statistics and extended resources
app.all('/api/review-records', adapt(reviewRecordsHandler));
app.all('/api/stats/overview', adapt(overviewHandler));
app.all('/api/progress', adapt(progressHandler));

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'math-wiki-cloudbase-api',
    health: '/api/health'
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ error: '服务器处理失败，请稍后重试。' });
});

const port = Number(process.env.PORT || 80);
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`math-wiki CloudBase API listening on http://${host}:${port}`);
});
