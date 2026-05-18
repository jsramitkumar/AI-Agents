import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings';

const settingsSchema = z.object({
  // MySQL admin
  mysqlHost: z.string().trim().default(''),
  mysqlPort: z.coerce.number().int().min(1).max(65535).default(3306),
  mysqlUser: z.string().trim().default('root'),
  mysqlPassword: z.string().default(''),
  // Cloudflare
  cfApiToken: z.string().default(''),
  cfAccountId: z.string().trim().default(''),
  cfZoneId: z.string().trim().default(''),
  cfTunnelId: z.string().trim().default(''),
  // Domain
  baseDomain: z.string().trim().default(''),
});

// GET /api/settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const settings = await getSettings();

  return NextResponse.json({
    data: {
      ...settings,
      mysqlPassword: settings.mysqlPassword ? '••••••••' : '',
      cfApiToken: settings.cfApiToken ? '••••••••' : '',
    },
  });
}

// PUT /api/settings
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed.' },
      { status: 422 }
    );
  }

  // If the client sends the masked placeholder back, preserve the existing value
  const current = await getSettings();
  const data = parsed.data;

  const toSave = {
    ...data,
    mysqlPassword: data.mysqlPassword === '••••••••' ? current.mysqlPassword : data.mysqlPassword,
    cfApiToken: data.cfApiToken === '••••••••' ? current.cfApiToken : data.cfApiToken,
  };

  const updated = await saveSettings(toSave);

  return NextResponse.json({
    data: {
      ...updated,
      mysqlPassword: updated.mysqlPassword ? '••••••••' : '',
      cfApiToken: updated.cfApiToken ? '••••••••' : '',
    },
  });
}
