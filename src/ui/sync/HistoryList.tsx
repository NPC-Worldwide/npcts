import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface HistoryItem {
  id: string;
  url: string;
  title?: string;
  visit_time?: string;
}

export interface HistoryListProps {
  history: HistoryItem[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const sorted = React.useMemo(() => {
    return [...history].sort((a, b) => {
      const ta = a.visit_time ? new Date(a.visit_time).getTime() : 0;
      const tb = b.visit_time ? new Date(b.visit_time).getTime() : 0;
      return tb - ta;
    });
  }, [history]);

  return (
    <div className="h-full flex flex-col theme-bg-primary theme-text-primary">
      <div className="flex items-center justify-between p-4 border-b theme-border">
        <h2 className="text-lg font-medium">Browser History</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-white/40 hover:text-white disabled:opacity-30"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        {sorted.length === 0 ? (
          <p className="text-sm text-white/40">No history.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((h, i) => (
              <a
                key={h.id || i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 border theme-border rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm text-white/80 truncate">
                    {h.title || h.url}
                  </div>
                  <div className="text-xs text-white/40 truncate">{h.url}</div>
                </div>
                {h.visit_time && (
                  <div className="text-xs text-white/30 shrink-0 ml-4">
                    {new Date(h.visit_time).toLocaleString()}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
