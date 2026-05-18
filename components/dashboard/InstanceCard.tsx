'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Globe, Clock, Server, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

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

interface InstanceCardProps {
  instance: Instance;
  onDelete: (id: string, force?: boolean) => Promise<void>;
  onExtend: (id: string, days: number) => Promise<void>;
  baseDomain: string;
}

const statusConfig: Record<InstanceStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral'; dot: string }> = {
  RUNNING:   { label: 'Running',   variant: 'success', dot: 'bg-emerald-400 animate-pulse' },
  PENDING:   { label: 'Pending',   variant: 'warning', dot: 'bg-amber-400 animate-pulse' },
  STOPPED:   { label: 'Stopped',   variant: 'neutral', dot: 'bg-gray-500' },
  SUSPENDED: { label: 'Suspended', variant: 'warning', dot: 'bg-amber-500' },
  DELETING:  { label: 'Deleting',  variant: 'error',   dot: 'bg-red-400 animate-pulse' },
  ERROR:     { label: 'Error',     variant: 'error',   dot: 'bg-red-500' },
};

function daysUntil(date: Date | string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InstanceCard({ instance, onDelete, onExtend, baseDomain }: InstanceCardProps) {
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmForce, setConfirmForce]   = useState(false);
  const [extending, setExtending]         = useState(false);
  const [extendDays, setExtendDays]       = useState(30);
  const [showExtend, setShowExtend]       = useState(false);
  const [daysLeft, setDaysLeft]           = useState<number | null>(null);

  useEffect(() => {
    setDaysLeft(daysUntil(instance.expiresAt));
    // Auto-open extend panel when suspended or expired
    if (instance.status === 'SUSPENDED') setShowExtend(true);
  }, [instance.expiresAt, instance.status]);

  const isError     = instance.status === 'ERROR';
  const isSuspended = instance.status === 'SUSPENDED';
  const status      = statusConfig[instance.status];
  const siteUrl     = `https://${instance.subdomain}.${baseDomain}`;
  const canVisit    = instance.status === 'RUNNING';

  const expiryWarning = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const expiryUrgent  = daysLeft !== null && daysLeft <= 0;

  // Expiry label: always show the absolute date + a relative hint
  function expiryLabel(): string {
    if (!instance.expiresAt) return '';
    const date = fmtDate(instance.expiresAt);
    if (isSuspended)     return `Expired ${date}`;
    if (expiryUrgent)    return `Expired ${date}`;
    if (daysLeft === 1)  return `${date} — tomorrow`;
    if (daysLeft !== null) return `${date} — ${daysLeft}d left`;
    return date;
  }

  const accentClass = isSuspended || expiryUrgent
    ? 'text-red-400'
    : expiryWarning
      ? 'text-amber-400'
      : 'text-gray-500';

  const extendAccent = isSuspended || expiryUrgent
    ? { bg: 'bg-amber-500/10 border-amber-500/20', pill: 'bg-amber-500/30 border-amber-400/50 text-amber-200', btn: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' }
    : expiryWarning
      ? { bg: 'bg-emerald-500/10 border-emerald-500/20', pill: 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200', btn: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' }
      : { bg: 'bg-gray-800/50 border-gray-700', pill: 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200', btn: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' };

  async function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try { await onDelete(instance.id); }
    catch { setDeleting(false); setConfirmDelete(false); }
  }

  async function handleForceDelete() {
    if (!confirmForce) { setConfirmForce(true); return; }
    setDeleting(true);
    try { await onDelete(instance.id, true); }
    catch { setDeleting(false); setConfirmForce(false); }
  }

  async function handleExtend() {
    setExtending(true);
    try { await onExtend(instance.id, extendDays); }
    finally { setExtending(false); }
  }

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{instance.name}</h3>
            <p className="text-xs text-gray-500 truncate mt-0.5">{instance.subdomain}.{baseDomain}</p>
          </div>
        </div>
        <Badge variant={status.variant}>
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', status.dot)} />
          {status.label}
        </Badge>
      </div>

      {/* Metadata */}
      <div className="space-y-1.5 flex-1 mb-4">
        {instance.containerId && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Server className="w-3 h-3 flex-shrink-0" />
            <span className="font-mono truncate">{instance.containerId.slice(0, 12)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>Created {fmtDate(instance.createdAt)}</span>
        </div>
        {instance.expiresAt && (
          <div className={cn('flex items-center gap-2 text-xs', accentClass)}>
            {expiryUrgent || isSuspended
              ? <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              : <Clock className="w-3 h-3 flex-shrink-0" />}
            <span>Expires {expiryLabel().replace(/^Expired /, 'Expired ')}</span>
          </div>
        )}
      </div>

      {/* Error notice */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">Provisioning failed — use Force Delete to clean up.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-800">

        {/* Primary row: Visit + Delete */}
        <div className="flex items-center gap-2">
          <a
            href={canVisit ? siteUrl : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!canVisit}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              canVisit
                ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed pointer-events-none'
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit
          </a>

          <button
            onClick={handleDeleteClick}
            disabled={deleting || instance.status === 'DELETING'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              confirmDelete ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-red-500/10',
              (deleting || instance.status === 'DELETING') && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm?' : 'Delete'}
          </button>

          {confirmDelete && !deleting && (
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-300 px-1">
              ✕
            </button>
          )}

          {/* Extend toggle button */}
          {!isError && (
            <button
              onClick={() => setShowExtend((v) => !v)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showExtend ? extendAccent.btn : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <ChevronDown className={cn('w-3 h-3 transition-transform', showExtend && 'rotate-180')} />
            </button>
          )}
        </div>

        {/* Extend panel */}
        {showExtend && !isError && (
          <div className={cn('flex flex-col gap-2 rounded-lg border px-3 py-2.5', extendAccent.bg)}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setExtendDays(d)}
                  disabled={extending}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border',
                    extendDays === d
                      ? extendAccent.pill
                      : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300',
                    extending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className={cn('w-3.5 h-3.5 flex-shrink-0', accentClass, extending && 'animate-spin')} />
              <span className={cn('text-xs flex-1', accentClass)}>+{extendDays} days from current expiry</span>
              <button
                onClick={handleExtend}
                disabled={extending}
                className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', extendAccent.btn, extending && 'opacity-50 cursor-not-allowed')}
              >
                {extending ? 'Extending…' : 'Extend'}
              </button>
            </div>
          </div>
        )}

        {/* Force delete for ERROR */}
        {isError && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleForceDelete}
              disabled={deleting}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                confirmForce ? 'bg-red-600/30 text-red-300 hover:bg-red-600/40' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
                deleting && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Removing…' : confirmForce ? 'Confirm?' : 'Force Delete'}
            </button>
            {confirmForce && !deleting && (
              <button onClick={() => setConfirmForce(false)} className="text-xs text-gray-500 hover:text-gray-300 px-1">✕</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
