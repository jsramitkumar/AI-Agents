import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import TopBar from '@/components/layout/TopBar';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { User, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const settings = await getSettings();

  // Strip internal fields before sending to the client form
  const initialSettings = {
    mysqlHost: settings.mysqlHost,
    mysqlPort: settings.mysqlPort,
    mysqlUser: settings.mysqlUser,
    mysqlPassword: settings.mysqlPassword ? '••••••••' : '',
    cfApiToken: settings.cfApiToken ? '••••••••' : '',
    cfAccountId: settings.cfAccountId,
    cfZoneId: settings.cfZoneId,
    cfTunnelId: settings.cfTunnelId,
    baseDomain: settings.baseDomain,
  };

  return (
    <>
      <TopBar title="Settings" subtitle="Configure your platform and account" />
      <div className="px-6 py-8 max-w-4xl space-y-10">
        {/* Profile (read-only) */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Profile</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm text-white">{session.user.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-white">{session.user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Configuration */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-6">Platform Configuration</h2>
          <SettingsForm
            initialSettings={initialSettings}
            dockerHost={process.env.DOCKER_HOST ?? ''}
          />
        </div>
      </div>
    </>
  );
}

