import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/cron/suspend-expired
// Marks all RUNNING instances whose expiresAt has passed as SUSPENDED.
// Must be called with Authorization: Bearer <CRON_SECRET> header.
// Set up a cron job / scheduled task to call this daily.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const now = new Date();

  const expired = await db.wpInstance.findMany({
    where: {
      status: { in: ['RUNNING', 'STOPPED'] },
      expiresAt: { lte: now },
    },
    select: { id: true, subdomain: true, expiresAt: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ data: { suspended: 0 } });
  }

  await db.wpInstance.updateMany({
    where: { id: { in: expired.map((i) => i.id) } },
    data: { status: 'SUSPENDED' },
  });

  for (const i of expired) {
    logger.warn('docker', 'Instance suspended: trial expired', {
      instanceId: i.id,
      subdomain: i.subdomain,
      expiresAt: i.expiresAt?.toISOString(),
    });
  }

  return NextResponse.json({ data: { suspended: expired.length, ids: expired.map((i) => i.id) } });
}
