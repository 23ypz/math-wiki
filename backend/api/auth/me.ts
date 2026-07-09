import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, methodNotAllowed, ok } from '../../src/http.js';
import { requireUser } from '../../src/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const user = requireUser(req, res);
  if (!user) return;
  return ok(res, { user });
}
