import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, badRequest, body, methodNotAllowed, ok, serverError, unauthorized, asString } from '../../src/http.js';
import { signToken } from '../../src/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const data = body<{ email?: string; password?: string; guest?: boolean }>(req);

    if (data.guest === true) {
      const userId = 'default-user';
      const email = 'guest@math-wiki.local';
      const token = signToken({ userId, email, role: 'guest' });
      return ok(res, { token, user: { userId, email, role: 'guest' } });
    }
    const email = asString(data.email).toLowerCase();
    const password = asString(data.password);

    if (!email || !password) return badRequest(res, 'Email and password are required.');

    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';

    if (!adminEmail || !adminPassword) {
      return serverError(res, new Error('ADMIN_EMAIL or ADMIN_PASSWORD is not configured.'));
    }

    if (email !== adminEmail || password !== adminPassword) {
      return unauthorized(res, 'Email or password is incorrect.');
    }

    const userId = 'default-user';
    const token = signToken({ userId, email, role: 'admin' });
    return ok(res, { token, user: { userId, email, role: 'admin' } });
  } catch (error) {
    return serverError(res, error);
  }
}
