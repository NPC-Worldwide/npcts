import React from 'react';

interface NPCEditorProps {
  name: string;
  model: string;
  provider: string;
  primaryDirective: string;
  onNameChange: (name: string) => void;
  onModelChange: (model: string) => void;
  onProviderChange: (provider: string) => void;
  onDirectiveChange: (directive: string) => void;
  availableModels?: Array<{ value: string; label: string }>;
  availableProviders?: Array<{ value: string; label: string }>;
}

export const NPCEditor: React.FC<NPCEditorProps> = ({
  name,
  model,
  provider,
  primaryDirective,
  onNameChange,
  onModelChange,
  onProviderChange,
  onDirectiveChange,
  availableModels = [],
  availableProviders = []
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">NPC Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Model</label>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            {availableModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1 block">Provider</label>
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            {availableProviders.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-1 block">Primary Directive</label>
        <textarea
          value={primaryDirective}
          onChange={(e) => onDirectiveChange(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          placeholder="System prompt for this NPC..."
        />
      </div>
    </div>
  );
};
