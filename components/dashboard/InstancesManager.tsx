'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import InstanceCard from './InstanceCard';
import CreateInstanceModal from './CreateInstanceModal';
import EmptyState from './EmptyState';

type InstanceStatus = 'PENDING' | 'RUNNING' | 'STOPPED' | 'SUSPENDED' | 'DELETING' | 'ERROR';

interface Instance {
  id: string;
  name: string;
  subdomain: string;
  containerId: string | null;
  port: number;
  status: InstanceStatus;
  createdAt: Date | string;
  expiresAt: Date | string | null;
}

interface InstancesManagerProps {
  initialInstances: Instance[];
  baseDomain: string;
}

interface StatCardProps {
  label: string;
  value: number;
  colorClass?: string;
}

  const TRANSIENT: InstanceStatus[] = ['PENDING', 'DELETING'];
const POLL_INTERVAL_MS = 3000;

function StatCard({ label, value, colorClass = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

export default function InstancesManager({ initialInstances, baseDomain }: InstancesManagerProps) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasTransient = instances.some((i) => TRANSIENT.includes(i.status));

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/instances', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setInstances(data.data as Instance[]);
      }
    } catch {
      // network blip — silent, try again next tick
    }
  }, []);

  // Schedule polling while any instance is in a transient state.
  useEffect(() => {
    if (!hasTransient) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(async () => {
      await poll();
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasTransient, instances, poll]);

  async function handleCreate(name: string, subdomain: string) {
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subdomain }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message =
        typeof data.error === 'string' ? data.error : 'Failed to create instance.';
      throw new Error(message);
    }

    // Immediately add an optimistic PENDING card, then let polling take over.
    await poll();
  }

  async function handleDelete(id: string, force = false) {
    const url = force ? `/api/instances/${id}?force=true` : `/api/instances/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Failed to delete instance.');
    }
    // Optimistically mark as DELETING, then let polling resolve the removal.
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'DELETING' } : i))
    );
    await poll();
  }

  async function handleExtend(id: string, days: number) {
    const res = await fetch(`/api/instances/${id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    });
    if (!res.ok) throw new Error('Failed to extend instance.');
    await poll();
  }

  const running = instances.filter((i) => i.status === 'RUNNING').length;
  const errors  = instances.filter((i) => i.status === 'ERROR').length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Sites" value={instances.length} />
        <StatCard label="Running" value={running} colorClass="text-emerald-400" />
        <StatCard label="Errors" value={errors} colorClass={errors > 0 ? 'text-red-400' : 'text-gray-600'} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {instances.length} site{instances.length !== 1 ? 's' : ''}
          {hasTransient && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              updating…
            </span>
          )}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New Site
        </button>
      </div>

      {/* Grid or empty state */}
      {instances.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onDelete={handleDelete}
              onExtend={handleExtend}
              baseDomain={baseDomain}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          baseDomain={baseDomain}
        />
      )}
    </>
  );
}
