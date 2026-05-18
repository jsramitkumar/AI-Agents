import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteWordPressContainer } from '@/lib/docker';
import { deprovisionDatabase } from '@/lib/mysql';
import { deleteTunnelRoute } from '@/lib/cloudflare';
import { getSettings } from '@/lib/settings';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/instances/[id]
// Add ?force=true to skip infrastructure cleanup and remove the DB record directly.
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const instance = await db.wpInstance.findUnique({ where: { id } });

  if (!instance) return NextResponse.json({ error: 'Instance not found.' }, { status: 404 });

  // Ownership check — users can only delete their own instances
  if (instance.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (instance.status === 'DELETING') {
    return NextResponse.json({ error: 'Instance is already being deleted.' }, { status: 409 });
  }

  const force = req.nextUrl.searchParams.get('force') === 'true';

  // Mark as deleting immediately so the UI reflects the state
  await db.wpInstance.update({
    where: { id },
    data: { status: 'DELETING' },
  });

  // Teardown in background — keep the HTTP response fast
  teardown(instance, force).catch(() => {});

  return NextResponse.json({ message: 'Deletion started.' });
}

async function teardown(
  instance: {
    id: string;
    subdomain: string;
    containerId: string | null;
    dbName: string;
    dbUser: string;
    cfDnsRecordId: string | null;
  },
  force: boolean
) {
  // Each step is best-effort — a failure is logged but does NOT stop the rest of the cleanup.
  // The DB record is always removed at the end.

  if (!force) {
    const s = await getSettings().catch((err) => {
      logger.error('mysql', 'teardown: failed to load settings', { instanceId: instance.id, error: String(err) });
      return null;
    });

    // 1. Docker — stop & remove container
    if (instance.containerId) {
      try {
        await deleteWordPressContainer(instance.containerId);
      } catch (err) {
        logger.error('docker', 'teardown: failed to remove container', {
          instanceId: instance.id,
          containerId: instance.containerId,
          error: String(err),
        });
        // Continue — container may already be gone
      }
    }

    // 2. MySQL — drop database and user
    if (s) {
      try {
        await deprovisionDatabase(instance.dbName, instance.dbUser, s);
      } catch (err) {
        logger.error('mysql', 'teardown: failed to deprovision database', {
          instanceId: instance.id,
          dbName: instance.dbName,
          dbUser: instance.dbUser,
          error: String(err),
        });
        // Continue — DB may already be gone
      }
    }

    // 3. Cloudflare — remove tunnel ingress and DNS record
    if (s && instance.cfDnsRecordId) {
      try {
        await deleteTunnelRoute(instance.subdomain, instance.cfDnsRecordId, s.baseDomain, s);
      } catch (err) {
        logger.error('cloudflare', 'teardown: failed to delete tunnel route', {
          instanceId: instance.id,
          subdomain: instance.subdomain,
          cfDnsRecordId: instance.cfDnsRecordId,
          error: String(err),
        });
        // Continue — DNS record may already be gone
      }
    }
  } else {
    logger.warn('docker', 'teardown: force-delete requested, skipping infrastructure cleanup', {
      instanceId: instance.id,
    });
  }

  // 4. Always remove the DB record — even if infrastructure cleanup partially failed
  try {
    await db.wpInstance.delete({ where: { id: instance.id } });
  } catch (err) {
    logger.error('mysql', 'teardown: failed to delete instance record', {
      instanceId: instance.id,
      error: String(err),
    });
    // As a last resort, mark it ERROR so the user can force-delete from the UI
    await db.wpInstance.update({
      where: { id: instance.id },
      data: { status: 'ERROR' },
    }).catch(() => {});
  }
}

