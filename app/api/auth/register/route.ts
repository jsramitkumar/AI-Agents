import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';

const registerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed.' },
      { status: 422 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const hashedPassword = await hash(password, 12);

  // The very first registered user becomes the platform administrator
  const userCount = await db.user.count();
  const role = userCount === 0 ? 'ADMIN' : 'CUSTOMER';

  await db.user.create({
    data: { name, email, password: hashedPassword, role },
  });

  return NextResponse.json({ message: 'Account created.' }, { status: 201 });
}
