import type { VercelRequest, VercelResponse } from '@vercel/node';

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-init-token');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export function ok(res: VercelResponse, data: unknown = { ok: true }) {
  return res.status(200).json(data);
}

export function created(res: VercelResponse, data: unknown) {
  return res.status(201).json(data);
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message });
}

export function unauthorized(res: VercelResponse, message = 'Unauthorized') {
  return res.status(401).json({ error: message });
}

export function notFound(res: VercelResponse, message = 'Not found') {
  return res.status(404).json({ error: message });
}

export function methodNotAllowed(res: VercelResponse) {
  return res.status(405).json({ error: 'Method not allowed' });
}

export function serverError(res: VercelResponse, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(error);
  return res.status(500).json({ error: message });
}

export function body<T extends Record<string, unknown>>(req: VercelRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}

export function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function asInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
