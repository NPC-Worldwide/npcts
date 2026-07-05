import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface BookmarkItem {
  id: string;
  url: string;
  title?: string;
  favicon?: string;
  folder?: string;
  created_at?: string;
}

export interface BookmarkListProps {
  bookmarks: BookmarkItem[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  loading = false,
  error = null,
  onRefresh,
}) => {
  return (
    <div className="h-full flex flex-col theme-bg-primary theme-text-primary">
      <div className="flex items-center justify-between p-4 border-b theme-border">
        <h2 className="text-lg font-medium">Bookmarks</h2>
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
        {bookmarks.length === 0 ? (
          <p className="text-sm text-white/40">No bookmarks.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookmarks.map((b, i) => (
              <a
                key={b.id || i}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border theme-border rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="text-sm font-medium text-indigo-400 truncate">
                  {b.title || b.url}
                </div>
                <div className="text-xs text-white/40 truncate mt-1">{b.url}</div>
                {b.folder && (
                  <span className="inline-block mt-2 text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded">
                    {b.folder}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
