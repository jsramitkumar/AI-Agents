import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateDbName, generateDbUser, generateDbPassword } from '@/lib/utils';
import { provisionDatabase } from '@/lib/mysql';
import { createWordPressContainer } from '@/lib/docker';
import { createTunnelRoute } from '@/lib/cloudflare';
import { getSettings } from '@/lib/settings';
import { logger } from '@/lib/logger';

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  subdomain: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format.'),
});

// Port allocation range for WordPress containers on the Docker host
const PORT_MIN = 3011;
const PORT_MAX = 5011;

async function allocatePort(): Promise<number> {
  const usedPorts = await db.wpInstance.findMany({ select: { port: true } });
  const used = new Set(usedPorts.map((i) => i.port));

  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (!used.has(port)) return port;
  }

  throw new Error('No available ports. Please contact support.');
}

// GET /api/instances — list authenticated user's instances
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const instances = await db.wpInstance.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: instances });
}

export const TRIAL_DAYS = 30;
export const EXTENSION_DAYS = 35;

// POST /api/instances — create a new WordPress instance
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  const parsed = createInstanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed.' },
      { status: 422 }
    );
  }

  const { name, subdomain } = parsed.data;

  // Check subdomain uniqueness
  const existing = await db.wpInstance.findUnique({ where: { subdomain } });
  if (existing) {
    return NextResponse.json({ error: 'Subdomain is already taken.' }, { status: 409 });
  }

  const dbName = generateDbName();
  const dbUser = generateDbUser();
  const dbPassword = generateDbPassword();
  const port = await allocatePort();

  const expiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Create DB record with PENDING status first
  const instance = await db.wpInstance.create({
    data: {
      name,
      subdomain,
      port,
      dbName,
      dbUser,
      dbPassword,
      userId: session.user.id,
      status: 'PENDING',
      expiresAt,
    },
  });

  // Provision in background — keep the HTTP response fast
  provisionAndStart(instance.id, subdomain, { dbName, dbUser, dbPassword, port }).catch(() => {});

  return NextResponse.json({ data: instance }, { status: 202 });
}

async function provisionAndStart(
  instanceId: string,
  subdomain: string,
  params: { dbName: string; dbUser: string; dbPassword: string; port: number }
) {
  logger.info('mysql', 'provisionAndStart: begin', { instanceId, subdomain, port: params.port });

  let containerId: string | null = null;
  let cfDnsRecordId: string | null = null;

  try {
    // ── Step 1: Load settings ──────────────────────────────────────────────
    const s = await getSettings();
    const baseDomain = s.baseDomain;

    // ── Step 2: MySQL ──────────────────────────────────────────────────────
    try {
      await provisionDatabase(params.dbName, params.dbUser, params.dbPassword, s);
    } catch (err) {
      logger.error('mysql', 'provisionAndStart: MySQL provisioning failed', {
        instanceId,
        dbName: params.dbName,
        host: s.mysqlHost,
        error: String(err),
      });
      throw err; // abort — no point starting a container without a DB
    }

    // ── Step 3: Docker container ───────────────────────────────────────────
    try {
      containerId = await createWordPressContainer({
        instanceId,
        subdomain,
        port: params.port,
        dbName: params.dbName,
        dbUser: params.dbUser,
        dbPassword: params.dbPassword,
      });
    } catch (err) {
      logger.error('docker', 'provisionAndStart: Docker container creation failed', {
        instanceId,
        port: params.port,
        error: String(err),
      });
      throw err;
    }

    // ── Step 4: Cloudflare tunnel route ────────────────────────────────────
    try {
      cfDnsRecordId = await createTunnelRoute(subdomain, params.port, baseDomain, s);
    } catch (err) {
      logger.error('cloudflare', 'provisionAndStart: Cloudflare tunnel route failed', {
        instanceId,
        subdomain,
        port: params.port,
        error: String(err),
      });
      throw err;
    }

    // ── Step 5: Mark RUNNING ───────────────────────────────────────────────
    await db.wpInstance.update({
      where: { id: instanceId },
      data: { containerId, cfDnsRecordId, status: 'RUNNING' },
    });
    logger.info('mysql', 'provisionAndStart: instance is RUNNING', { instanceId, containerId });

  } catch (err) {
    logger.error('mysql', 'provisionAndStart: failed, marking ERROR', {
      instanceId,
      error: String(err),
    });
    await db.wpInstance.update({
      where: { id: instanceId },
      data: { status: 'ERROR' },
    });
  }
}
