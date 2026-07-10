import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { unauthorized } from './http.js';

export type AuthUser = {
  userId: string;
  email: string;
};

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { email: user.email },
    jwtSecret(),
    { subject: user.userId, expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, jwtSecret()) as jwt.JwtPayload;
  const userId = decoded.sub;
  const email = decoded.email;
  if (!userId || typeof email !== 'string') {
    throw new Error('Invalid token payload.');
  }
  return { userId, email };
}

export function requireUser(req: VercelRequest, res: VercelResponse): AuthUser | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    unauthorized(res);
    return undefined;
  }

  try {
    return verifyToken(header.slice('Bearer '.length));
  } catch {
    unauthorized(res, 'Invalid or expired token.');
    return undefined;
  }
}
