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
    const [mistakeCount] = await rows<{ count: number }>('SELECT COUNT(*) AS count FROM mistakes WHERE user_id = ?', [user.userId]);
    const [knowledgeCount] = await rows<{ count: number }>('SELECT COUNT(*) AS count FROM knowledge_points WHERE user_id = ?', [user.userId]);
    const [dueCount] = await rows<{ count: number }>(
      `SELECT COUNT(*) AS count FROM mistakes
       WHERE user_id = ? AND next_review_date IS NOT NULL AND next_review_date <= CURDATE() AND status <> '已掌握'`,
      [user.userId]
    );
    const [weekStudy] = await rows<{ minutes: number | null }>(
      `SELECT SUM(duration_minutes) AS minutes FROM study_logs
       WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [user.userId]
    );
    const statusStats = await rows<{ status: string; count: number }>(
      'SELECT status, COUNT(*) AS count FROM mistakes WHERE user_id = ? GROUP BY status ORDER BY count DESC',
      [user.userId]
    );
    const weakChapters = await rows(
      `SELECT subject, chapter, COUNT(*) AS count
       FROM mistakes
       WHERE user_id = ?
       GROUP BY subject, chapter
       ORDER BY count DESC
       LIMIT 8`,
      [user.userId]
    );

    return ok(res, {
      mistakeCount: mistakeCount?.count ?? 0,
      knowledgeCount: knowledgeCount?.count ?? 0,
      dueCount: dueCount?.count ?? 0,
      weekStudyMinutes: weekStudy?.minutes ?? 0,
      statusStats,
      weakChapters
    });
  } catch (error) {
    return serverError(res, error);
  }
}
