import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import TopBar from '@/components/layout/TopBar';
import InstancesManager from '@/components/dashboard/InstancesManager';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const [instances, settings] = await Promise.all([
    db.wpInstance.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    getSettings(),
  ]);

  const baseDomain = settings.baseDomain;

  return (
    <>
      <TopBar
        title="WordPress Sites"
        subtitle="Manage your WordPress instances"
      />
      <div className="px-8 py-8">
        <InstancesManager initialInstances={instances} baseDomain={baseDomain} />
      </div>
    </>
  );
}
