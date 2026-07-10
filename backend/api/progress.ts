import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../src/db.js';
import { requireUser } from '../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, notFound, ok, one, serverError } from '../src/http.js';

function resource(req: VercelRequest) {
  return one(req.query.resource) || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  const kind = resource(req);
  if (!['exams', 'goals'].includes(kind)) return badRequest(res, 'resource must be exams or goals.');

  try {
    if (req.method === 'GET') {
      if (kind === 'exams') {
        const items = await rows(
          `SELECT id, exam_name, exam_type, exam_date, total_score, calculus_score,
                  linear_algebra_score, probability_score, duration_minutes,
                  mistake_count, note, created_at, updated_at
           FROM exam_scores WHERE user_id = ?
           ORDER BY exam_date DESC, id DESC`,
          [user.userId]
        );
        return ok(res, { items });
      }
      const items = await rows(
        `SELECT id, title, goal_type, start_date, deadline, current_value,
                target_value, status, note, created_at, updated_at
         FROM study_goals WHERE user_id = ?
         ORDER BY CASE status WHEN '进行中' THEN 0 WHEN '已逾期' THEN 1 ELSE 2 END,
                  deadline ASC, id DESC`,
        [user.userId]
      );
      return ok(res, { items });
    }

    const data = body<Record<string, unknown>>(req);
    const id = Number(data.id ?? one(req.query.id));

    if (req.method === 'POST') {
      if (kind === 'exams') {
        const examName = asString(data.exam_name);
        if (!examName) return badRequest(res, 'exam_name is required.');
        const result = await exec(
          `INSERT INTO exam_scores
           (user_id, exam_name, exam_type, exam_date, total_score, calculus_score,
            linear_algebra_score, probability_score, duration_minutes, mistake_count, note)
           VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?)`,
          [user.userId, examName, asString(data.exam_type, '历年真题'), asString(data.exam_date),
           Number(data.total_score) || 0, Number(data.calculus_score) || 0,
           Number(data.linear_algebra_score) || 0, Number(data.probability_score) || 0,
           asInt(data.duration_minutes), asInt(data.mistake_count), asString(data.note)]
        );
        return created(res, { id: result.insertId });
      }
      const title = asString(data.title);
      if (!title) return badRequest(res, 'title is required.');
      const result = await exec(
        `INSERT INTO study_goals
         (user_id, title, goal_type, start_date, deadline, current_value, target_value, status, note)
         VALUES (?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, ?)`,
        [user.userId, title, asString(data.goal_type, '学习任务'), asString(data.start_date),
         asString(data.deadline), Number(data.current_value) || 0, Number(data.target_value) || 1,
         asString(data.status, '进行中'), asString(data.note)]
      );
      return created(res, { id: result.insertId });
    }

    if (!Number.isFinite(id)) return badRequest(res, 'id is required.');

    if (req.method === 'PUT') {
      if (kind === 'exams') {
        const result = await exec(
          `UPDATE exam_scores SET exam_name = ?, exam_type = ?, exam_date = NULLIF(?, ''),
             total_score = ?, calculus_score = ?, linear_algebra_score = ?, probability_score = ?,
             duration_minutes = ?, mistake_count = ?, note = ?
           WHERE id = ? AND user_id = ?`,
          [asString(data.exam_name), asString(data.exam_type), asString(data.exam_date),
           Number(data.total_score) || 0, Number(data.calculus_score) || 0,
           Number(data.linear_algebra_score) || 0, Number(data.probability_score) || 0,
           asInt(data.duration_minutes), asInt(data.mistake_count), asString(data.note), id, user.userId]
        );
        if (!result.affectedRows) return notFound(res);
        return ok(res);
      }
      const result = await exec(
        `UPDATE study_goals SET title = ?, goal_type = ?, start_date = NULLIF(?, ''),
           deadline = NULLIF(?, ''), current_value = ?, target_value = ?, status = ?, note = ?
         WHERE id = ? AND user_id = ?`,
        [asString(data.title), asString(data.goal_type), asString(data.start_date), asString(data.deadline),
         Number(data.current_value) || 0, Number(data.target_value) || 1,
         asString(data.status), asString(data.note), id, user.userId]
      );
      if (!result.affectedRows) return notFound(res);
      return ok(res);
    }

    if (req.method === 'DELETE') {
      const table = kind === 'exams' ? 'exam_scores' : 'study_goals';
      const result = await exec(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, user.userId]);
      if (!result.affectedRows) return notFound(res);
      return ok(res);
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
