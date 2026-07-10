import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { unauthorized } from './http.js';

export type AuthUser = {
  userId: string;
  email: string;
  role: 'admin' | 'guest';
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { email: user.email, role: user.role },
    jwtSecret(),
    { subject: user.userId, expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, jwtSecret()) as jwt.JwtPayload;
  const userId = decoded.sub;
  const email = decoded.email;
  const role = decoded.role === 'guest' ? 'guest' : 'admin';
  if (!userId || typeof email !== 'string') {
    throw new Error('Invalid token payload.');
  }
  return { userId, email, role };
}

export function requireUser(req: VercelRequest, res: VercelResponse): AuthUser | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    unauthorized(res);
    return undefined;
  }

  try {
    const user = verifyToken(header.slice('Bearer '.length));
    const method = String(req.method || 'GET').toUpperCase();
    if (user.role === 'guest' && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      res.status(403).json({ error: '游客模式仅支持浏览，不能保存或修改内容。' });
      return undefined;
    }
    return user;
  } catch {
    unauthorized(res, 'Invalid or expired token.');
    return undefined;
  }
}
