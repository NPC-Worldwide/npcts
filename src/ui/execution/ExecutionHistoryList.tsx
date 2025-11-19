import React from 'react';
import { Play, Copy, Star, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

export interface Execution {
  id: string;
  timestamp: string;
  input: string;
  output: string;
  label?: 'good' | 'bad' | 'neutral';
  favorited?: boolean;
}

interface ExecutionHistoryListProps {
  executions: Execution[];
  onRun?: (id: string) => void;
  onCopy?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLabel?: (id: string, label: 'good' | 'bad' | 'neutral') => void;
}

export const ExecutionHistoryList: React.FC<ExecutionHistoryListProps> = ({
  executions,
  onRun,
  onCopy,
  onToggleFavorite,
  onDelete,
  onLabel
}) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <ul className="space-y-1 text-sm font-mono">
      {executions.map((exec) => (
        <li key={exec.id} className="group rounded hover:bg-gray-800">
          <div className="flex items-center justify-between p-2">
            <button
              onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
              className="flex-1 text-left truncate flex items-center gap-2"
              title={exec.input}
            >
              {expandedId === exec.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="truncate">{exec.input}</span>
            </button>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onRun && (
                <button
                  onClick={() => onRun(exec.id)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Run"
                >
                  <Play size={14} />
                </button>
              )}
              {onCopy && (
                <button
                  onClick={() => onCopy(exec.id)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              )}
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(exec.id)}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Favorite"
                >
                  <Star
                    size={14}
                    className={exec.favorited ? 'fill-yellow-400 text-yellow-400' : ''}
                  />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(exec.id)}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          
          {expandedId === exec.id && (
            <div className="px-2 pb-2 space-y-2 text-xs">
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-gray-500 mb-1">Output:</div>
                <div>{exec.output}</div>
              </div>
              {onLabel && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onLabel(exec.id, 'good')}
                    className={`px-2 py-1 rounded ${
                      exec.label === 'good'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Good
                  </button>
                  <button
                    onClick={() => onLabel(exec.id, 'bad')}
                    className={`px-2 py-1 rounded ${
                      exec.label === 'bad'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Bad
                  </button>
                  <button
                    onClick={() => onLabel(exec.id, 'neutral')}
                    className={`px-2 py-1 rounded ${
                      exec.label === 'neutral'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Neutral
                  </button>
                </div>
              )}
            </div>
          )}
        </li>
      ))}
      {executions.length === 0 && (
        <li className="text-center p-4 text-gray-500">No execution history</li>
      )}
    </ul>
  );
};
