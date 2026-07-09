import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, methodNotAllowed, notFound, ok, one, serverError } from '../../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  const id = Number(one(req.query.id));
  if (!Number.isFinite(id)) return badRequest(res, 'Invalid id.');

  try {
    if (req.method === 'PUT') {
      const data = body<Record<string, unknown>>(req);
      const result = await exec(
        `UPDATE knowledge_points
         SET subject = ?, chapter = ?, title = ?, content_md = ?, mastery_level = ?
         WHERE id = ? AND user_id = ?`,
        [
          asString(data.subject),
          asString(data.chapter),
          asString(data.title),
          asString(data.content_md),
          asInt(data.mastery_level, 0),
          id,
          user.userId
        ]
      );
      if (result.affectedRows === 0) return notFound(res);
      return ok(res, { ok: true });
    }

    if (req.method === 'DELETE') {
      const result = await exec('DELETE FROM knowledge_points WHERE id = ? AND user_id = ?', [id, user.userId]);
      if (result.affectedRows === 0) return notFound(res);
      return ok(res, { ok: true });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
