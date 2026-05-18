import { Globe, Plus } from 'lucide-react';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/20 flex items-center justify-center mb-5">
        <Globe className="w-8 h-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No sites yet</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Spin up your first WordPress instance in seconds. Each site gets its own container and
        database.
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
      >
        <Plus className="w-4 h-4" />
        Create your first site
      </button>
    </div>
  );
}
