import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec, rows } from '../../src/db.js';
import { requireUser } from '../../src/auth.js';
import { applyCors, asInt, asString, badRequest, body, created, methodNotAllowed, ok, one, serverError } from '../../src/http.js';

type MistakeRow = {
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
  tags_json: string | null;
  difficulty: number;
  status: string;
  next_review_date: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
};

function parseTags(value: string | null) {
  if (!value) return [];
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

  try {
    if (req.method === 'GET') {
      const subject = one(req.query.subject);
      const chapter = one(req.query.chapter);
      const status = one(req.query.status);
      const knowledgePointId = one(req.query.knowledge_point_id);
      const difficulty = one(req.query.difficulty);
      const tag = one(req.query.tag);
      const overdue = one(req.query.overdue);
      const sort = one(req.query.sort) || 'review_date';
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
      if (chapter) {
        sql += ' AND COALESCE(m.chapter, \'\') = ?';
        params.push(chapter);
      }
      if (status) {
        sql += ' AND m.status = ?';
        params.push(status);
      }
      if (knowledgePointId) {
        sql += ' AND m.knowledge_point_id = ?';
        params.push(Number(knowledgePointId));
      }
      if (difficulty) {
        sql += ' AND m.difficulty = ?';
        params.push(Number(difficulty));
      }
      if (tag) {
        sql += ' AND m.tags_json LIKE ?';
        params.push(`%"${tag}"%`);
      }
      if (overdue === '1') {
        sql += " AND m.next_review_date < CURDATE() AND m.status <> '已掌握'";
      }
      if (q) {
        sql += ' AND (m.title LIKE ? OR m.chapter LIKE ? OR m.source LIKE ? OR m.question_text LIKE ? OR m.answer_text LIKE ? OR m.wrong_reason LIKE ? OR m.summary LIKE ? OR kp.title LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like, like, like, like, like, like);
      }

      const orderMap: Record<string, string> = {
        created_desc: 'm.created_at DESC, m.id DESC',
        created_asc: 'm.created_at ASC, m.id ASC',
        difficulty_desc: 'm.difficulty DESC, m.id DESC',
        review_count_desc: 'm.review_count DESC, m.id DESC',
        review_date: "COALESCE(m.next_review_date, DATE('2999-12-31')) ASC, m.id DESC"
      };
      sql += ` ORDER BY ${orderMap[sort] || orderMap.review_date} LIMIT 500`;

      const result = await rows<MistakeRow>(sql, params);
      return ok(res, { items: result.map((item) => ({ ...item, tags: parseTags(item.tags_json) })) });
    }

    if (req.method === 'POST') {
      const data = body<Record<string, unknown>>(req);
      const title = asString(data.title);
      const subject = asString(data.subject);
      if (!title || !subject) return badRequest(res, 'title and subject are required.');

      const result = await exec(
        `INSERT INTO mistakes
        (user_id, title, subject, chapter, knowledge_point_id, source, question_text, answer_text, wrong_reason, summary, tags_json, difficulty, status, next_review_date, review_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          serializeTags(data.tags),
          asInt(data.difficulty, 3),
          asString(data.status, '待复习'),
          asString(data.next_review_date) || null,
          asInt(data.review_count, 0)
        ]
      );
      return created(res, { id: result.insertId });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return serverError(res, error);
  }
}
