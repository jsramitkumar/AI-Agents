import mysql from 'mysql2/promise';
import { escape as mysqlEscape } from 'mysql2';
import { logger } from '@/lib/logger';

// Only allow safe, server-generated identifiers (alphanumeric + underscore, max 64 chars)
const SAFE_IDENTIFIER_RE = /^[a-z0-9_]{1,64}$/;

function assertSafeIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(value)) {
    throw new Error(`Unsafe MySQL identifier for ${label}: "${value}"`);
  }
}

interface MySQLSettings {
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
}

function createAdminConnection(s: MySQLSettings) {
  if (!s.mysqlHost || !s.mysqlUser) {
    throw new Error('MySQL admin host is not configured. Go to Settings to set it up.');
  }
  return mysql.createConnection({
    host: s.mysqlHost,
    port: s.mysqlPort,
    user: s.mysqlUser,
    password: s.mysqlPassword,
  });
}

/**
 * Create a MySQL database and a scoped user for a new WordPress instance.
 */
export async function provisionDatabase(
  dbName: string,
  dbUser: string,
  dbPassword: string,
  s: MySQLSettings
): Promise<void> {
  assertSafeIdentifier(dbName, 'dbName');
  assertSafeIdentifier(dbUser, 'dbUser');

  logger.info('mysql', 'Provisioning database', { dbName, dbUser, host: s.mysqlHost });
  const conn = await createAdminConnection(s);
  try {
    await conn.query(`CREATE DATABASE \`${dbName}\``);
    await conn.query(`CREATE USER '${dbUser}'@'%' IDENTIFIED BY ${mysqlEscape(dbPassword)}`);
    await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'%'`);
    await conn.query('FLUSH PRIVILEGES');
    logger.info('mysql', 'Database provisioned', { dbName, dbUser });
  } finally {
    await conn.end();
  }
}

/**
 * Drop the MySQL database and user when a WordPress instance is deleted.
 */
export async function deprovisionDatabase(
  dbName: string,
  dbUser: string,
  s: MySQLSettings
): Promise<void> {
  assertSafeIdentifier(dbName, 'dbName');
  assertSafeIdentifier(dbUser, 'dbUser');

  logger.info('mysql', 'Deprovisioning database', { dbName, dbUser, host: s.mysqlHost });
  const conn = await createAdminConnection(s);
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(`DROP USER IF EXISTS '${dbUser}'@'%'`);
    await conn.query('FLUSH PRIVILEGES');
    logger.info('mysql', 'Database deprovisioned', { dbName, dbUser });
  } finally {
    await conn.end();
  }
}

/**
 * Verify MySQL admin connectivity. Used by the test-connection API.
 */
export async function pingMySQL(s: MySQLSettings): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const conn = await createAdminConnection(s);
    const [rows] = await conn.execute('SELECT VERSION() AS v');
    await conn.end();
    const version = (rows as Array<{ v: string }>)[0]?.v;
    logger.info('mysql', 'Connection test passed', { version, host: s.mysqlHost });
    return { ok: true, version };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('mysql', 'Connection test failed', { error, host: s.mysqlHost });
    return { ok: false, error };
  }
}
