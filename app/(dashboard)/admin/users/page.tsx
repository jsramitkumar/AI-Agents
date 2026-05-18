import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import TopBar from '@/components/layout/TopBar';
import { UsersTable } from '@/components/admin/UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

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

  return (
    <>
      <TopBar
        title="User Management"
        subtitle="Manage roles and delegate administrator access"
      />
      <div className="px-6 py-8 max-w-5xl">
        <UsersTable
          initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
          currentUserId={session.user.id}
        />
      </div>
    </>
  );
}
