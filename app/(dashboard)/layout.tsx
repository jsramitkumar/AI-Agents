import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={{ ...session.user, role: session.user.role }} />
      <main className="flex-1 ml-60 min-h-screen">{children}</main>
    </div>
  );
}
