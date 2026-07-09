import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asString, badRequest, body, created, methodNotAllowed, serverError } from '../../src/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);
  const user = requireUser(req, res);
  if (!user) return;

  try {
    const data = body<Record<string, unknown>>(req);
    const mistakeId = Number(data.mistake_id);
    const result = asString(data.result);
    const note = asString(data.note);
    const nextReviewDate = asString(data.next_review_date) || null;
    const status = asString(data.status, result === '完全会了' ? '已掌握' : '待复习');

    if (!Number.isFinite(mistakeId) || !result) {
      return badRequest(res, 'mistake_id and result are required.');
    }

    const insertResult = await exec(
      `INSERT INTO review_records (user_id, mistake_id, review_date, result, note, next_review_date)
       VALUES (?, ?, CURDATE(), ?, ?, ?)`,
      [user.userId, mistakeId, result, note, nextReviewDate]
    );

    await exec(
      `UPDATE mistakes
       SET review_count = review_count + 1, status = ?, next_review_date = ?
       WHERE id = ? AND user_id = ?`,
      [status, nextReviewDate, mistakeId, user.userId]
    );

    return created(res, { id: insertResult.insertId });
  } catch (error) {
    return serverError(res, error);
  }
}
