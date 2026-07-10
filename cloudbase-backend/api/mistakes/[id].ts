import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, methodNotAllowed, notFound, ok, one, serverError } from '../../src/http.js';

function parseTags(value: unknown) {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serializeTags(value: unknown) {
  if (!Array.isArray(value)) return '[]';
  return JSON.stringify(Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean))));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  const id = Number(one(req.query.id));
  if (!Number.isFinite(id)) return badRequest(res, 'Invalid id.');

  try {
    if (req.method === 'GET') {
      const items = await rows<Record<string, unknown>>(
        `SELECT m.*, kp.title AS knowledge_title
         FROM mistakes m
         LEFT JOIN knowledge_points kp ON kp.id = m.knowledge_point_id AND kp.user_id = m.user_id
         WHERE m.id = ? AND m.user_id = ?
         LIMIT 1`,
        [id, user.userId]
      );
      if (!items.length) return notFound(res);
      return ok(res, { item: { ...items[0], tags: parseTags(items[0].tags_json) } });
    }

    if (req.method === 'PUT') {
      const data = body<Record<string, unknown>>(req);
      const result = await exec(
        `UPDATE mistakes
         SET title = ?, subject = ?, chapter = ?, knowledge_point_id = ?, source = ?, question_text = ?, answer_text = ?,
             wrong_reason = ?, summary = ?, tags_json = ?, difficulty = ?, status = ?, next_review_date = ?
         WHERE id = ? AND user_id = ?`,
        [
          asString(data.title),
          asString(data.subject),
          asString(data.chapter),
          data.knowledge_point_id ? Number(data.knowledge_point_id) : null,
          asString(data.source),
          asString(data.question_text),
          asString(data.answer_text),
          asString(data.wrong_reason),
          asString(data.summary),
          serializeTags(data.tags),
          asInt(data.difficulty, 3),
          asString(data.status, '待复习'),
          asString(data.next_review_date) || null,
          id,
          user.userId
        ]
      );
      if (result.affectedRows === 0) return notFound(res);
      return ok(res, { ok: true });
    }

    if (req.method === 'DELETE') {
      await exec('DELETE FROM review_records WHERE mistake_id = ? AND user_id = ?', [id, user.userId]);
      const result = await exec('DELETE FROM mistakes WHERE id = ? AND user_id = ?', [id, user.userId]);
      if (result.affectedRows === 0) return notFound(res);
      return ok(res, { ok: true });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
