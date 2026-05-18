import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { pingDocker } from '@/lib/docker';
import { pingMySQL } from '@/lib/mysql';
import { pingCloudflare } from '@/lib/cloudflare';

const serviceSchema = z.enum(['docker', 'mysql', 'cloudflare']);

// POST /api/settings/test-connection
// Body: { service: 'docker' | 'mysql' | 'cloudflare' }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body?.service);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid service. Must be docker, mysql, or cloudflare.' }, { status: 400 });
  }

  const service = parsed.data;

  if (service === 'docker') {
    const result = await pingDocker();
    return NextResponse.json({ data: result });
  }

  // MySQL and Cloudflare need the saved settings from DB
  const s = await getSettings();

  if (service === 'mysql') {
    const result = await pingMySQL(s);
    return NextResponse.json({ data: result });
  }

  // cloudflare
  const result = await pingCloudflare(s);
  return NextResponse.json({ data: result });
}
