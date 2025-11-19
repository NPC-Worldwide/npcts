import React from 'react';

interface ModelOption {
  value: string;
  label: string;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  label?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange,
  label = 'Select Model'
}) => {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
      >
        {models.map(model => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
    </div>
  );
};
