import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, ok, one, serverError } from '../../src/http.js';

type Mistake = {
  id: number;
  title: string;
  subject: string;
  chapter: string | null;
  knowledge_point_id: number | null;
  knowledge_title: string | null;
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
      const params: any[] = [user.userId];
      let sql = `SELECT m.*, kp.title AS knowledge_title
                 FROM mistakes m
                 LEFT JOIN knowledge_points kp ON kp.id = m.knowledge_point_id AND kp.user_id = m.user_id
                 WHERE m.user_id = ?`;

      if (subject) {
        sql += ' AND m.subject = ?';
        params.push(subject);
      }
      if (status) {
        sql += ' AND m.status = ?';
        params.push(status);
      }
      if (q) {
        sql += ' AND (m.title LIKE ? OR m.chapter LIKE ? OR m.source LIKE ? OR m.question_text LIKE ? OR m.summary LIKE ? OR kp.title LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY COALESCE(m.next_review_date, DATE(\'2999-12-31\')) ASC, m.id DESC LIMIT 200';
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
