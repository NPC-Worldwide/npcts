import React from 'react';
import { Zap, Brain, Repeat } from 'lucide-react';

interface KGControlsProps {
  currentGeneration: number;
  maxGeneration: number;
  onGenerationChange: (gen: number) => void;
  onRollback: () => void;
  onSleep: () => void;
  onDream: () => void;
  loading?: boolean;
}

export const KGControls: React.FC<KGControlsProps> = ({
  currentGeneration,
  maxGeneration,
  onGenerationChange,
  onRollback,
  onSleep,
  onDream,
  loading = false
}) => {
  return (
    <div className="space-y-3 p-3 bg-gray-800 rounded">
      <h5 className="font-semibold text-sm">Controls</h5>
      
      <div>
        <label className="text-xs text-gray-400">Active Generation</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={maxGeneration}
            value={currentGeneration}
            onChange={(e) => onGenerationChange(parseInt(e.target.value))}
            className="w-full"
            disabled={maxGeneration === 0}
          />
          <span className="font-mono text-sm p-1 bg-gray-900 rounded min-w-[3ch] text-center">
            {currentGeneration}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={onSleep}
          disabled={loading}
          className="flex-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 
            rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Zap size={14} /> Sleep
        </button>
        <button
          onClick={onDream}
          disabled={loading}
          className="flex-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 
            rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Brain size={14} /> Dream
        </button>
      </div>
      
      <button
        onClick={onRollback}
        disabled={currentGeneration === 0 || loading}
        className="w-full text-xs py-1 bg-red-900 hover:bg-red-800 rounded 
          flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Repeat size={14} /> Rollback One Gen
      </button>
    </div>
  );
};
