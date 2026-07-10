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
    const [overdueCount] = await rows<{ count: number }>(
      `SELECT COUNT(*) AS count FROM mistakes
       WHERE user_id = ? AND next_review_date < CURDATE() AND status <> '已掌握'`,
      [user.userId]
    );
    const [weekStudy] = await rows<{ minutes: number | null }>(
      `SELECT SUM(duration_minutes) AS minutes FROM study_logs
       WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [user.userId]
    );
    const [reviewedWeek] = await rows<{ count: number }>(
      `SELECT COUNT(*) AS count FROM review_records
       WHERE user_id = ? AND review_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [user.userId]
    );
    const statusStats = await rows<{ status: string; count: number }>(
      'SELECT status, COUNT(*) AS count FROM mistakes WHERE user_id = ? GROUP BY status ORDER BY count DESC',
      [user.userId]
    );
    const weakChapters = await rows(
      `SELECT subject, chapter, COUNT(*) AS count
       FROM mistakes
       WHERE user_id = ? AND status <> '已掌握'
       GROUP BY subject, chapter
       ORDER BY count DESC
       LIMIT 8`,
      [user.userId]
    );
    const weakKnowledge = await rows(
      `SELECT kp.id, kp.subject, kp.chapter, kp.title, kp.mastery_level, COUNT(m.id) AS mistake_count
       FROM knowledge_points kp
       LEFT JOIN mistakes m
         ON m.knowledge_point_id = kp.id
        AND m.user_id = kp.user_id
        AND m.status <> '已掌握'
       WHERE kp.user_id = ?
       GROUP BY kp.id, kp.subject, kp.chapter, kp.title, kp.mastery_level
       HAVING mistake_count > 0 OR kp.mastery_level <= 2
       ORDER BY mistake_count DESC, kp.mastery_level ASC, kp.id DESC
       LIMIT 8`,
      [user.userId]
    );
    const recentStudy = await rows(
      `SELECT study_date, SUM(duration_minutes) AS minutes
       FROM study_logs
       WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY study_date
       ORDER BY study_date ASC`,
      [user.userId]
    );

    return ok(res, {
      mistakeCount: mistakeCount?.count ?? 0,
      knowledgeCount: knowledgeCount?.count ?? 0,
      dueCount: dueCount?.count ?? 0,
      overdueCount: overdueCount?.count ?? 0,
      weekStudyMinutes: weekStudy?.minutes ?? 0,
      reviewedWeekCount: reviewedWeek?.count ?? 0,
      statusStats,
      weakChapters,
      weakKnowledge,
      recentStudy
    });
  } catch (error) {
    return serverError(res, error);
  }
}
