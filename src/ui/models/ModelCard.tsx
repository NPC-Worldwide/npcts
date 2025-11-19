import React from 'react';
import { BrainCircuit, Trash2 } from 'lucide-react';

export interface MLModel {
  id: string;
  name: string;
  type: string;
  target: string;
  features: string[];
  metrics?: Record<string, number>;
  created?: string;
}

interface ModelCardProps {
  model: MLModel;
  onDelete?: (id: string) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model, onDelete }) => {
  return (
    <div className="p-4 bg-gray-800 rounded border border-gray-700">
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-semibold flex items-center gap-2">
          <BrainCircuit size={16} className="text-purple-400" />
          {model.name}
        </h5>
        {onDelete && (
          <button
            onClick={() => onDelete(model.id)}
            className="p-1 hover:bg-gray-700 rounded text-red-400"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      <div className="text-xs space-y-1 text-gray-400">
        <div>Type: <span className="text-blue-400">{model.type}</span></div>
        <div>Target: <span className="font-mono">{model.target}</span></div>
        <div>
          Features: <span className="font-mono">{model.features.join(', ')}</span>
        </div>
        
        {model.metrics && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="font-semibold text-green-400">Metrics:</div>
            {Object.entries(model.metrics).map(([k, v]) => (
              <div key={k}>
                {k}: {typeof v === 'number' ? v.toFixed(4) : v}
              </div>
            ))}
          </div>
        )}
        
        {model.created && (
          <div className="text-[10px] text-gray-500 mt-2">
            Created: {new Date(model.created).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};
