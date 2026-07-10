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
    const [dueCount] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM mistakes WHERE user_id = ? AND next_review_date IS NOT NULL AND next_review_date <= CURDATE() AND status <> '已掌握'`, [user.userId]);
    const [overdueCount] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM mistakes WHERE user_id = ? AND next_review_date < CURDATE() AND status <> '已掌握'`, [user.userId]);
    const [weekStudy] = await rows<{ minutes: number | null }>(`SELECT SUM(duration_minutes) AS minutes FROM study_logs WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`, [user.userId]);
    const [lastWeekStudy] = await rows<{ minutes: number | null }>(`SELECT SUM(duration_minutes) AS minutes FROM study_logs WHERE user_id = ? AND study_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)`, [user.userId]);
    const [reviewedWeek] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM review_records WHERE user_id = ? AND review_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`, [user.userId]);
    const [newMistakesWeek] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM mistakes WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, [user.userId]);
    const [newKnowledgeWeek] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM knowledge_points WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, [user.userId]);
    const [activeGoalCount] = await rows<{ count: number }>(`SELECT COUNT(*) AS count FROM study_goals WHERE user_id = ? AND status = '进行中'`, [user.userId]);
    const [latestExam] = await rows(`SELECT exam_name, exam_date, total_score FROM exam_scores WHERE user_id = ? ORDER BY exam_date DESC, id DESC LIMIT 1`, [user.userId]);

    const statusStats = await rows(`SELECT status, COUNT(*) AS count FROM mistakes WHERE user_id = ? GROUP BY status ORDER BY count DESC`, [user.userId]);
    const weakChapters = await rows(`SELECT subject, chapter, COUNT(*) AS count FROM mistakes WHERE user_id = ? AND status <> '已掌握' GROUP BY subject, chapter ORDER BY count DESC LIMIT 8`, [user.userId]);
    const weakKnowledge = await rows(`SELECT kp.id, kp.subject, kp.chapter, kp.title, kp.mastery_level, COUNT(m.id) AS mistake_count FROM knowledge_points kp LEFT JOIN mistakes m ON m.knowledge_point_id = kp.id AND m.user_id = kp.user_id AND m.status <> '已掌握' WHERE kp.user_id = ? GROUP BY kp.id, kp.subject, kp.chapter, kp.title, kp.mastery_level HAVING mistake_count > 0 OR kp.mastery_level <= 2 ORDER BY mistake_count DESC, kp.mastery_level ASC, kp.id DESC LIMIT 8`, [user.userId]);
    const recentStudy = await rows(`SELECT study_date, SUM(duration_minutes) AS minutes FROM study_logs WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY study_date ORDER BY study_date ASC`, [user.userId]);
    const activity = await rows(`SELECT activity_date, SUM(study_minutes) AS study_minutes, SUM(new_mistakes) AS new_mistakes, SUM(reviewed) AS reviewed, SUM(new_knowledge) AS new_knowledge FROM (
      SELECT study_date AS activity_date, SUM(duration_minutes) AS study_minutes, 0 AS new_mistakes, 0 AS reviewed, 0 AS new_knowledge FROM study_logs WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 89 DAY) GROUP BY study_date
      UNION ALL SELECT DATE(created_at), 0, COUNT(*), 0, 0 FROM mistakes WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 89 DAY) GROUP BY DATE(created_at)
      UNION ALL SELECT review_date, 0, 0, COUNT(*), 0 FROM review_records WHERE user_id = ? AND review_date >= DATE_SUB(CURDATE(), INTERVAL 89 DAY) GROUP BY review_date
      UNION ALL SELECT DATE(created_at), 0, 0, 0, COUNT(*) FROM knowledge_points WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 89 DAY) GROUP BY DATE(created_at)
    ) x GROUP BY activity_date ORDER BY activity_date ASC`, [user.userId, user.userId, user.userId, user.userId]);
    const [topTag] = await rows<{ tag: string; count: number }>(`SELECT tags_json AS tag, COUNT(*) AS count FROM mistakes WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND tags_json IS NOT NULL AND tags_json <> '[]' GROUP BY tags_json ORDER BY count DESC LIMIT 1`, [user.userId]);

    return ok(res, {
      mistakeCount: mistakeCount?.count ?? 0,
      knowledgeCount: knowledgeCount?.count ?? 0,
      dueCount: dueCount?.count ?? 0,
      overdueCount: overdueCount?.count ?? 0,
      weekStudyMinutes: weekStudy?.minutes ?? 0,
      lastWeekStudyMinutes: lastWeekStudy?.minutes ?? 0,
      reviewedWeekCount: reviewedWeek?.count ?? 0,
      newMistakesWeek: newMistakesWeek?.count ?? 0,
      newKnowledgeWeek: newKnowledgeWeek?.count ?? 0,
      activeGoalCount: activeGoalCount?.count ?? 0,
      latestExam: latestExam || null,
      topTagRaw: topTag?.tag || '',
      statusStats, weakChapters, weakKnowledge, recentStudy, activity
    });
  } catch (error) {
    return serverError(res, error);
  }
}
