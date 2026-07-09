import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, methodNotAllowed, ok, serverError } from '../../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const items = await rows(
      `SELECT * FROM mistakes
       WHERE user_id = ?
         AND next_review_date IS NOT NULL
         AND next_review_date <= CURDATE()
         AND status <> '已掌握'
       ORDER BY next_review_date ASC, id DESC
       LIMIT 100`,
      [user.userId]
    );
    return ok(res, { items });
  } catch (error) {
    return serverError(res, error);
  }
}
