import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asString, badRequest, body, created, methodNotAllowed, ok, one, serverError } from '../../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  const user = requireUser(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      if (one(req.query.mode) === 'today') {
        const items = await rows(
          `SELECT * FROM mistakes
           WHERE user_id = ?
             AND next_review_date IS NOT NULL
             AND next_review_date <= CURDATE()
             AND status <> '已掌握'
           ORDER BY next_review_date ASC, id DESC
           LIMIT 100`,
          [user.userId]
        );
        return ok(res, { items });
      }
      const mistakeId = Number(one(req.query.mistake_id));
      if (!Number.isFinite(mistakeId)) return badRequest(res, 'mistake_id is required.');
      const items = await rows(
        `SELECT id, mistake_id, review_date, result, note, next_review_date, created_at
         FROM review_records
         WHERE user_id = ? AND mistake_id = ?
         ORDER BY review_date DESC, id DESC`,
        [user.userId, mistakeId]
      );
      return ok(res, { items });
    }

    if (req.method === 'POST') {
      const data = body<Record<string, unknown>>(req);
      const mistakeId = Number(data.mistake_id);
      const result = asString(data.result);
      const note = asString(data.note);
      const nextReviewDate = asString(data.next_review_date) || null;
      const reviewDate = asString(data.review_date) || null;
      const status = asString(data.status, result === '完全会了' ? '已掌握' : '待复习');
      const preserveState = data.preserve_state === true;

      if (!Number.isFinite(mistakeId) || !result) {
        return badRequest(res, 'mistake_id and result are required.');
      }

      const insertResult = await exec(
        `INSERT INTO review_records (user_id, mistake_id, review_date, result, note, next_review_date)
         VALUES (?, ?, COALESCE(?, CURDATE()), ?, ?, ?)`,
        [user.userId, mistakeId, reviewDate, result, note, nextReviewDate]
      );

      if (!preserveState) {
        await exec(
          `UPDATE mistakes
           SET review_count = review_count + 1, status = ?, next_review_date = ?
           WHERE id = ? AND user_id = ?`,
          [status, nextReviewDate, mistakeId, user.userId]
        );
      }

      return created(res, { id: insertResult.insertId });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
