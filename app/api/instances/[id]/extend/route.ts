import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { EXTENSION_DAYS } from '@/app/api/instances/route';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/instances/[id]/extend
// Body (optional): { days: number }  — defaults to EXTENSION_DAYS if omitted.
// Extends the instance expiry from today (or from current expiresAt, whichever is later).
// Also resumes a SUSPENDED instance back to RUNNING.
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const instance = await db.wpInstance.findUnique({ where: { id } });
  if (!instance) return NextResponse.json({ error: 'Instance not found.' }, { status: 404 });

  if (instance.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let days = EXTENSION_DAYS;
  try {
    const body = await req.json();
    if (typeof body?.days === 'number' && body.days > 0 && body.days <= 365) {
      days = Math.floor(body.days);
    }
  } catch { /* no body — use default */ }

  const base = instance.expiresAt && instance.expiresAt > new Date()
    ? instance.expiresAt
    : new Date();
  const newExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await db.wpInstance.update({
    where: { id },
    data: {
      expiresAt: newExpiresAt,
      // Resume container if it was suspended
      ...(instance.status === 'SUSPENDED' ? { status: 'RUNNING' } : {}),
    },
  });

  logger.info('docker', 'Instance expiry extended', {
    instanceId: id,
    days,
    newExpiresAt: newExpiresAt.toISOString(),
    resumed: instance.status === 'SUSPENDED',
  });

  return NextResponse.json({ data: updated });
}
