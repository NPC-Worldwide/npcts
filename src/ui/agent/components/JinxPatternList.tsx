import React from 'react';
import { Sparkles, Zap, X } from 'lucide-react';

export interface JinxPatternListProps {
  patterns: string[];
  onRemove?: (pattern: string) => void;
  onOpenPattern?: (pattern: string) => void;
  emptyText?: string;
  className?: string;
}

export const JinxPatternList: React.FC<JinxPatternListProps> = ({
  patterns,
  onRemove,
  onOpenPattern,
  emptyText = 'No jinx patterns set',
  className = '',
}) => {
  const sorted = [...(patterns || [])].sort((a, b) => a.localeCompare(b));

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold theme-text-secondary">Jinx Patterns</label>
        <span className="text-xs theme-text-secondary">{sorted.length}</span>
      </div>
      <div className="space-y-1">
        {sorted.length > 0 ? (
          sorted.map((pattern) => (
            <div key={pattern} className="flex items-center justify-between w-full px-2 py-1 rounded text-xs theme-bg-secondary">
              <button
                onClick={() => onOpenPattern?.(pattern)}
                className="flex items-center gap-1.5 text-left flex-1 truncate theme-hover rounded px-1"
                disabled={!onOpenPattern}
              >
                {pattern === '*' ? (
                  <Sparkles size={12} className="text-yellow-500" />
                ) : (
                  <Zap size={12} className="text-blue-400" />
                )}
                <span className="font-mono">{pattern}</span>
              </button>
              {onRemove && (
                <button
                  onClick={() => onRemove(pattern)}
                  className="p-0.5 rounded theme-hover text-gray-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))
        ) : (
          <span className="text-xs theme-text-secondary italic">{emptyText}</span>
        )}
      </div>
    </div>
  );
};
