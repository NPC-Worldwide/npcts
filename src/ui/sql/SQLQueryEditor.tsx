import React from 'react';
import { Play, Loader } from 'lucide-react';

interface SQLQueryEditorProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  loading?: boolean;
}

export const SQLQueryEditor: React.FC<SQLQueryEditorProps> = ({
  query,
  onQueryChange,
  onExecute,
  loading = false
}) => {
  return (
    <div className="space-y-2">
      <textarea
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        rows={5}
        className="w-full p-2 bg-gray-800 border border-gray-700 rounded font-mono text-sm"
        placeholder="Enter your SQL query here..."
      />
      <div className="flex justify-end">
        <button
          onClick={onExecute}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm 
            disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
          {loading ? 'Executing...' : 'Execute Query'}
        </button>
      </div>
    </div>
  );
};
