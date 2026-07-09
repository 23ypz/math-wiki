import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, one, ok, serverError } from '../../src/http.js';

type KnowledgePoint = {
  id: number;
  subject: string;
  chapter: string;
  title: string;
  content_md: string | null;
  mastery_level: number;
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
      const q = one(req.query.q);
      const params: unknown[] = [user.userId];
      let sql = 'SELECT * FROM knowledge_points WHERE user_id = ?';
      if (subject) {
        sql += ' AND subject = ?';
        params.push(subject);
      }
      if (q) {
        sql += ' AND (title LIKE ? OR chapter LIKE ? OR content_md LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY subject, chapter, id DESC';
      return ok(res, { items: await rows<KnowledgePoint>(sql, params) });
    }

    if (req.method === 'POST') {
      const data = body<Record<string, unknown>>(req);
      const subject = asString(data.subject);
      const chapter = asString(data.chapter);
      const title = asString(data.title);
      const contentMd = asString(data.content_md);
      const masteryLevel = asInt(data.mastery_level, 0);

      if (!subject || !chapter || !title) {
        return badRequest(res, 'subject, chapter and title are required.');
      }

      const result = await exec(
        `INSERT INTO knowledge_points (user_id, subject, chapter, title, content_md, mastery_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.userId, subject, chapter, title, contentMd, masteryLevel]
      );
      return created(res, { id: result.insertId });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
