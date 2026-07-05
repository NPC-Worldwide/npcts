import React, { useState, useMemo } from 'react';

export interface SearchableBookmark {
  id: string;
  url: string;
  title?: string;
  folder?: string;
}

export interface SearchableHistory {
  id: string;
  url: string;
  title?: string;
  visit_time?: string;
}

export interface SearchableMessage {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
}

export interface UnifiedSearchProps {
  bookmarks?: SearchableBookmark[];
  history?: SearchableHistory[];
  messages?: SearchableMessage[];
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  bookmarks = [],
  history = [],
  messages = [],
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return { bookmarks: [], history: [], messages: [] };
    const q = query.toLowerCase();
    return {
      bookmarks: bookmarks.filter(b =>
        (b.title?.toLowerCase() || '').includes(q) ||
        (b.url?.toLowerCase() || '').includes(q)
      ),
      history: history.filter(h =>
        (h.title?.toLowerCase() || '').includes(q) ||
        (h.url?.toLowerCase() || '').includes(q)
      ),
      messages: messages.filter(m =>
        (m.content?.toLowerCase() || '').includes(q)
      ),
    };
  }, [query, bookmarks, history, messages]);

  const total = results.bookmarks.length + results.history.length + results.messages.length;

  return (
    <div className="h-full flex flex-col theme-bg-primary theme-text-primary">
      <div className="p-4 border-b theme-border">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search bookmarks, history, messages..."
          className="w-full bg-white/5 border theme-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-white/30"
        />
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!query.trim() ? (
          <p className="text-sm text-white/40">Type to search across your synced data.</p>
        ) : total === 0 ? (
          <p className="text-sm text-white/40">No results for "{query}".</p>
        ) : (
          <div className="space-y-6">
            {results.bookmarks.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                  Bookmarks ({results.bookmarks.length})
                </h3>
                <div className="space-y-2">
                  {results.bookmarks.map((b, i) => (
                    <a
                      key={b.id || i}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border theme-border rounded-lg hover:bg-white/5"
                    >
                      <div className="text-sm text-indigo-400 truncate">{b.title || b.url}</div>
                      <div className="text-xs text-white/40 truncate">{b.url}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {results.history.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                  History ({results.history.length})
                </h3>
                <div className="space-y-2">
                  {results.history.map((h, i) => (
                    <a
                      key={h.id || i}
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border theme-border rounded-lg hover:bg-white/5"
                    >
                      <div className="text-sm text-white/80 truncate">{h.title || h.url}</div>
                      <div className="text-xs text-white/40 truncate">{h.url}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {results.messages.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                  Messages ({results.messages.length})
                </h3>
                <div className="space-y-2">
                  {results.messages.map((m, i) => (
                    <div key={m.id || i} className="p-3 border theme-border rounded-lg">
                      <div className="text-xs text-white/40 mb-1">
                        {m.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <div className="text-sm text-white/80 line-clamp-3">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
