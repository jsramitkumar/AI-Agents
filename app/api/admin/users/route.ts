import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Session } from 'next-auth';

function adminOnly(session: Session | null) {
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  return null;
}

// GET /api/admin/users — list all users
export async function GET() {
  const session = await getServerSession(authOptions);
  const err = adminOnly(session);
  if (err) return err;

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { instances: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: users });
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'CUSTOMER']),
});

// PATCH /api/admin/users — update a user's role
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const err = adminOnly(session);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed.' },
      { status: 422 }
    );
  }

  const { userId, role } = parsed.data;

  // Prevent self-demotion — there must always be at least one admin
  if (userId === session!.user.id && role !== 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last administrator.' },
        { status: 409 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
    data: { role },
  });

  return NextResponse.json({ data: updated });
}
