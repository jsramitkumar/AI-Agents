'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Globe, LayoutDashboard, Settings, LogOut, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const customerNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: 'ADMIN' | 'CUSTOMER' | null;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === 'ADMIN';
  const navItems = isAdmin ? adminNav : customerNav;
  const initials = (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 flex flex-col bg-gray-900 border-r border-gray-800 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">WP Cloud</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <div className="flex items-center gap-3 px-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name ?? 'User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isAdmin && <Shield className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
              <p className="text-xs text-gray-500 truncate">
                {isAdmin ? 'Administrator' : 'Customer'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
