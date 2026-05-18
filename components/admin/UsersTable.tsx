'use client';

import { useState } from 'react';
import { Shield, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  createdAt: string;
  _count: { instances: number };
}

interface Props {
  initialUsers: UserRow[];
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  CUSTOMER: 'Customer',
};

export function UsersTable({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function changeRole(userId: string, role: 'ADMIN' | 'CUSTOMER') {
    setUpdating(userId);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update role.');
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: data.data.role } : u))
        );
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-800">
              <th className="text-left px-5 py-3.5 font-medium text-gray-400">User</th>
              <th className="text-left px-5 py-3.5 font-medium text-gray-400">Sites</th>
              <th className="text-left px-5 py-3.5 font-medium text-gray-400">Joined</th>
              <th className="text-left px-5 py-3.5 font-medium text-gray-400">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900/50">
            {users.map((user) => {
              const initials = (user.name?.[0] ?? user.email[0]).toUpperCase();
              const isCurrentUser = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">{initials}</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user.name ?? '—'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">(you)</span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{user._count.instances}</td>
                  <td className="px-5 py-4 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <RoleSelect
                      userId={user.id}
                      currentRole={user.role}
                      loading={updating === user.id}
                      onChange={(role) => changeRole(user.id, role)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleSelect({
  userId,
  currentRole,
  loading,
  onChange,
}: {
  userId: string;
  currentRole: 'ADMIN' | 'CUSTOMER';
  loading: boolean;
  onChange: (role: 'ADMIN' | 'CUSTOMER') => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <div className={cn(
        'absolute left-2.5 pointer-events-none',
        currentRole === 'ADMIN' ? 'text-indigo-400' : 'text-gray-500'
      )}>
        {currentRole === 'ADMIN' ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>
      <select
        value={currentRole}
        disabled={loading}
        onChange={(e) => onChange(e.target.value as 'ADMIN' | 'CUSTOMER')}
        className="appearance-none rounded-lg bg-gray-800 border border-gray-700 text-white text-xs pl-7 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
      >
        <option value="ADMIN">Administrator</option>
        <option value="CUSTOMER">Customer</option>
      </select>
      <ChevronDown className="absolute right-2 h-3 w-3 text-gray-400 pointer-events-none" />
    </div>
  );
}
