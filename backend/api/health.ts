import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, ok } from '../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  ok(res, { ok: true, service: 'kaoyan-math-api' });
}
