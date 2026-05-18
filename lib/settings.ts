import { db } from './db';
import type { SystemSettings } from '@prisma/client';

// Singleton row ID — there is exactly one settings record for the whole platform.
const SETTINGS_ID = 'singleton';

/**
 * Load the platform settings from the database.
 * If no row exists yet (first boot) an empty default row is returned without
 * persisting it — the admin must save from the UI to create it.
 */
export async function getSettings(): Promise<SystemSettings> {
  const existing = await db.systemSettings.findUnique({ where: { id: SETTINGS_ID } });

  if (existing) return existing;

  // Return safe defaults without writing to DB
  return {
    id: SETTINGS_ID,
    mysqlHost: '',
    mysqlPort: 3306,
    mysqlUser: 'root',
    mysqlPassword: '',
    cfApiToken: '',
    cfAccountId: '',
    cfZoneId: '',
    cfTunnelId: '',
    baseDomain: '',
    updatedAt: new Date(0),
  };
}

/**
 * Upsert the platform settings.
 */
export async function saveSettings(
  data: Omit<SystemSettings, 'id' | 'updatedAt'>
): Promise<SystemSettings> {
  return db.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
