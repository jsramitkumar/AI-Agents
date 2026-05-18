'use client';

import { useState } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';
import { slugify } from '@/lib/utils';

interface CreateInstanceModalProps {
  onClose: () => void;
  onCreate: (name: string, subdomain: string) => Promise<void>;
  baseDomain: string;
}

export default function CreateInstanceModal({
  onClose,
  onCreate,
  baseDomain,
}: CreateInstanceModalProps) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!subdomainTouched) {
      setSubdomain(slugify(value));
    }
  }

  function handleSubdomainChange(value: string) {
    setSubdomainTouched(true);
    setSubdomain(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedSub = subdomain.trim();

    if (!trimmedName) return setError('Site name is required.');
    if (!trimmedSub) return setError('Subdomain is required.');
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(trimmedSub)) {
      return setError('Subdomain may only contain lowercase letters, numbers, and hyphens.');
    }

    setLoading(true);
    try {
      await onCreate(trimmedName, trimmedSub);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create instance.';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h2 id="modal-title" className="text-base font-semibold text-white">
              New WordPress Site
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Site name */}
          <div className="space-y-1.5">
            <label htmlFor="site-name" className="block text-sm font-medium text-gray-300">
              Site Name
            </label>
            <input
              id="site-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Awesome Blog"
              maxLength={100}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-600 transition-all"
            />
          </div>

          {/* Subdomain */}
          <div className="space-y-1.5">
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-300">
              Subdomain
            </label>
            <div className="flex rounded-lg border border-gray-700 hover:border-gray-600 focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500 transition-all overflow-hidden">
              <input
                id="subdomain"
                type="text"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="my-site"
                maxLength={63}
                className="flex-1 px-3 py-2.5 bg-gray-800 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <div className="flex items-center px-3 bg-gray-800/80 border-l border-gray-700 text-xs text-gray-500 whitespace-nowrap select-none">
                .{baseDomain}
              </div>
            </div>
            {subdomain && (
              <p className="text-xs text-indigo-400 font-mono">
                https://{subdomain}.{baseDomain}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating…' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
