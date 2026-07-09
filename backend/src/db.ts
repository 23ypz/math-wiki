import mysql, { type Pool, type ResultSetHeader } from 'mysql2/promise';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const useSsl = process.env.TIDB_SSL !== 'false';
  pool = mysql.createPool({
    uri,
    connectionLimit: 5,
    waitForConnections: true,
    enableKeepAlive: true,
    dateStrings: true,
    ssl: useSsl ? { minVersion: 'TLSv1.2' } : undefined
  });

  return pool;
}

export async function rows<T = Record<string, unknown>>(sql: string, params: any[] = []): Promise<T[]> {
  const [result] = await getPool().execute(sql, params);
  return result as T[];
}

export async function exec(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);
  return result as ResultSetHeader;
}