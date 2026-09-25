import React from 'react';

export interface AgentEditorProps {
  name: string;
  model: string;
  provider?: string;
  primaryDirective?: string;
  sourcePath?: string;
  onNameChange?: (name: string) => void;
  onModelChange?: (model: string) => void;
  onProviderChange?: (provider: string) => void;
  onDirectiveChange?: (directive: string) => void;
  renderModelSelector?: (value: string, onChange: (value: string) => void) => React.ReactNode;
  renderProviderSelector?: (value: string, onChange: (value: string) => void) => React.ReactNode;
  nameClassName?: string;
  readOnly?: boolean;
}

export const AgentEditor: React.FC<AgentEditorProps> = ({
  name,
  model,
  provider = '',
  primaryDirective = '',
  sourcePath,
  onNameChange,
  onModelChange,
  onProviderChange,
  onDirectiveChange,
  renderModelSelector,
  renderProviderSelector,
  nameClassName = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm',
  readOnly = false,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs theme-text-secondary mb-1">Agent Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange?.(e.target.value)}
          readOnly={readOnly}
          className={nameClassName}
        />
      </div>

      {sourcePath && (
        <div className="text-xs theme-text-secondary font-mono truncate" title={sourcePath}>
          {sourcePath}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold theme-text-secondary mb-1">Model</label>
        <div className="mb-3">
          {renderModelSelector
            ? renderModelSelector(model, (v) => onModelChange?.(v))
            : (
              <input
                type="text"
                value={model}
                onChange={(e) => onModelChange?.(e.target.value)}
                className="w-full theme-input text-sm p-2"
              />
            )}
        </div>
      </div>

      {onProviderChange && (
        <div>
          <label className="block text-sm font-semibold theme-text-secondary mb-1">Provider</label>
          <div className="mb-3">
            {renderProviderSelector
              ? renderProviderSelector(provider, (v) => onProviderChange?.(v))
              : (
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => onProviderChange?.(e.target.value)}
                  className="w-full theme-input text-sm p-2"
                />
              )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold theme-text-secondary mb-1">Primary Directive</label>
        <textarea
          value={primaryDirective}
          onChange={(e) => onDirectiveChange?.(e.target.value)}
          rows={6}
          className="w-full theme-input p-2 rounded text-sm resize-none min-h-[60px]"
          placeholder="Describe this agent's role..."
        />
      </div>
    </div>
  );
};
