import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, ok, one, serverError } from '../../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const from = one(req.query.from);
      const to = one(req.query.to);
      const params: any[] = [user.userId];
      let sql = 'SELECT * FROM study_logs WHERE user_id = ?';
      if (from) {
        sql += ' AND study_date >= ?';
        params.push(from);
      }
      if (to) {
        sql += ' AND study_date <= ?';
        params.push(to);
      }
      sql += ' ORDER BY study_date DESC, id DESC LIMIT 120';
      return ok(res, { items: await rows(sql, params) });
    }

    if (req.method === 'POST') {
      const data = body<Record<string, unknown>>(req);
      const studyDate = asString(data.study_date);
      if (!studyDate) return badRequest(res, 'study_date is required.');

      const result = await exec(
        `INSERT INTO study_logs
        (user_id, study_date, subject, content, duration_minutes, new_mistakes_count, reviewed_mistakes_count, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.userId,
          studyDate,
          asString(data.subject),
          asString(data.content),
          asInt(data.duration_minutes, 0),
          asInt(data.new_mistakes_count, 0),
          asInt(data.reviewed_mistakes_count, 0),
          asString(data.summary)
        ]
      );
      return created(res, { id: result.insertId });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
