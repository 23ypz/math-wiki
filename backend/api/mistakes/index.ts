import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, ok, one, serverError } from '../../src/http.js';

type Mistake = {
  id: number;
  title: string;
  subject: string;
  chapter: string | null;
  source: string | null;
  question_text: string | null;
  answer_text: string | null;
  wrong_reason: string | null;
  summary: string | null;
  difficulty: number;
  status: string;
  next_review_date: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const subject = one(req.query.subject);
      const status = one(req.query.status);
      const q = one(req.query.q);
      const params: unknown[] = [user.userId];
      let sql = 'SELECT * FROM mistakes WHERE user_id = ?';

      if (subject) {
        sql += ' AND subject = ?';
        params.push(subject);
      }
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      if (q) {
        sql += ' AND (title LIKE ? OR chapter LIKE ? OR source LIKE ? OR question_text LIKE ? OR summary LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY COALESCE(next_review_date, DATE(\'2999-12-31\')) ASC, id DESC LIMIT 200';
      return ok(res, { items: await rows<Mistake>(sql, params) });
    }

    if (req.method === 'POST') {
      const data = body<Record<string, unknown>>(req);
      const title = asString(data.title);
      const subject = asString(data.subject);
      if (!title || !subject) return badRequest(res, 'title and subject are required.');

      const result = await exec(
        `INSERT INTO mistakes
        (user_id, title, subject, chapter, knowledge_point_id, source, question_text, answer_text, wrong_reason, summary, difficulty, status, next_review_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.userId,
          title,
          subject,
          asString(data.chapter),
          data.knowledge_point_id ? Number(data.knowledge_point_id) : null,
          asString(data.source),
          asString(data.question_text),
          asString(data.answer_text),
          asString(data.wrong_reason),
          asString(data.summary),
          asInt(data.difficulty, 3),
          asString(data.status, '待复习'),
          asString(data.next_review_date) || null
        ]
      );
      return created(res, { id: result.insertId });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
