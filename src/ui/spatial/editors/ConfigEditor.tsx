/**
 * ConfigEditor Component
 *
 * A hierarchical tree editor for spatial world configuration.
 */

import React, { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

type ConfigValue = string | number | boolean | null | ConfigObject | ConfigArray;
type ConfigObject = { [key: string]: ConfigValue };
type ConfigArray = ConfigValue[];

interface ConfigEditorProps {
  /** Configuration object to edit */
  config: ConfigObject;
  /** Called when any value changes */
  onChange: (path: string[], value: ConfigValue) => void;
  /** Called when save is requested */
  onSave?: () => void;
  /** Whether the config has unsaved changes */
  isDirty?: boolean;
  /** Additional class name */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Fields to exclude from display */
  excludeFields?: string[];
  /** Initial expanded paths */
  initialExpanded?: string[];
}

// =============================================================================
// ConfigEditor Component
// =============================================================================

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  config,
  onChange,
  onSave,
  isDirty = false,
  className = '',
  readOnly = false,
  excludeFields = [],
  initialExpanded = [],
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(initialExpanded)
  );

  const toggleExpand = useCallback((pathStr: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathStr)) {
        next.delete(pathStr);
      } else {
        next.add(pathStr);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const paths = new Set<string>();
    const collectPaths = (obj: ConfigValue, currentPath: string[] = []) => {
      if (typeof obj === 'object' && obj !== null) {
        const pathStr = currentPath.join('.');
        if (pathStr) paths.add(pathStr);
        for (const key in obj as ConfigObject) {
          collectPaths((obj as ConfigObject)[key], [...currentPath, key]);
        }
      }
    };
    collectPaths(config);
    setExpandedPaths(paths);
  }, [config]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  return (
    <div
      className={`spatial-config-editor ${className}`}
      style={{
        backgroundColor: '#1e1e2e',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #3a3a4a',
          backgroundColor: '#2a2a3a',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={expandAll}
            style={{
              background: 'none',
              border: '1px solid #4a4a5a',
              color: '#9ca3af',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              background: 'none',
              border: '1px solid #4a4a5a',
              color: '#9ca3af',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Collapse All
          </button>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={!isDirty}
            style={{
              backgroundColor: isDirty ? '#3b82f6' : '#4a4a5a',
              border: 'none',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: 4,
              cursor: isDirty ? 'pointer' : 'default',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Save
          </button>
        )}
      </div>

      {/* Tree */}
      <div
        style={{
          padding: 12,
          maxHeight: 500,
          overflow: 'auto',
        }}
      >
        <ConfigNode
          value={config}
          path={[]}
          expandedPaths={expandedPaths}
          onToggle={toggleExpand}
          onChange={onChange}
          readOnly={readOnly}
          excludeFields={excludeFields}
        />
      </div>
    </div>
  );
};

// =============================================================================
// ConfigNode Component
// =============================================================================

interface ConfigNodeProps {
  value: ConfigValue;
  path: string[];
  expandedPaths: Set<string>;
  onToggle: (pathStr: string) => void;
  onChange: (path: string[], value: ConfigValue) => void;
  readOnly: boolean;
  excludeFields: string[];
}

const ConfigNode: React.FC<ConfigNodeProps> = ({
  value,
  path,
  expandedPaths,
  onToggle,
  onChange,
  readOnly,
  excludeFields,
}) => {
  const pathStr = path.join('.');
  const key = path[path.length - 1] || 'config';

  // Skip excluded fields
  if (excludeFields.includes(key)) {
    return null;
  }

  // Render primitive values
  if (typeof value !== 'object' || value === null) {
    return (
      <PrimitiveEditor
        label={key}
        value={value as string | number | boolean | null}
        onChange={(newValue) => onChange(path, newValue)}
        readOnly={readOnly}
      />
    );
  }

  // Render object/array
  const isExpanded = expandedPaths.has(pathStr);
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as [string, ConfigValue])
    : Object.entries(value as ConfigObject);
  const isArray = Array.isArray(value);

  return (
    <div style={{ marginLeft: path.length > 0 ? 16 : 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: 'pointer',
          padding: '2px 0',
        }}
        onClick={() => onToggle(pathStr)}
      >
        <span
          style={{
            color: '#6b7280',
            fontSize: 10,
            width: 12,
            textAlign: 'center',
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </span>
        <span
          style={{
            color: '#10b981',
            fontWeight: 'bold',
            fontSize: 13,
          }}
        >
          {key}
        </span>
        <span style={{ color: '#6b7280', fontSize: 11 }}>
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </div>

      {isExpanded && (
        <div
          style={{
            borderLeft: '1px solid #3a3a4a',
            marginLeft: 6,
            paddingLeft: 8,
          }}
        >
          {entries.map(([childKey, childValue]) => (
            <ConfigNode
              key={childKey}
              value={childValue}
              path={[...path, childKey]}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onChange={onChange}
              readOnly={readOnly}
              excludeFields={excludeFields}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// PrimitiveEditor Component
// =============================================================================

interface PrimitiveEditorProps {
  label: string;
  value: string | number | boolean | null;
  onChange: (value: ConfigValue) => void;
  readOnly: boolean;
}

const PrimitiveEditor: React.FC<PrimitiveEditorProps> = ({
  label,
  value,
  onChange,
  readOnly,
}) => {
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);

    // Try to parse as number
    const numValue = Number(editValue);
    if (!isNaN(numValue) && editValue.trim() !== '') {
      onChange(numValue);
      return;
    }

    // Try to parse as boolean
    if (editValue.toLowerCase() === 'true') {
      onChange(true);
      return;
    }
    if (editValue.toLowerCase() === 'false') {
      onChange(false);
      return;
    }

    // Try to parse as null
    if (editValue.toLowerCase() === 'null') {
      onChange(null);
      return;
    }

    // Keep as string
    onChange(editValue);
  };

  const getValueColor = () => {
    if (typeof value === 'number') return '#f59e0b';
    if (typeof value === 'boolean') return '#8b5cf6';
    if (value === null) return '#6b7280';
    return '#3b82f6';
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 0',
      }}
    >
      <span
        style={{
          color: '#9ca3af',
          fontSize: 12,
          minWidth: 80,
        }}
      >
        {label}:
      </span>

      {isEditing && !readOnly ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlur();
            if (e.key === 'Escape') {
              setEditValue(String(value ?? ''));
              setIsEditing(false);
            }
          }}
          autoFocus
          style={{
            backgroundColor: '#2a2a3a',
            border: '1px solid #3b82f6',
            borderRadius: 3,
            padding: '2px 6px',
            color: '#fff',
            fontSize: 12,
            outline: 'none',
            flex: 1,
            maxWidth: 200,
          }}
        />
      ) : (
        <span
          style={{
            color: getValueColor(),
            fontSize: 12,
            cursor: readOnly ? 'default' : 'pointer',
            padding: '2px 4px',
            borderRadius: 3,
            backgroundColor: readOnly ? 'transparent' : 'rgba(255,255,255,0.05)',
          }}
          onClick={() => !readOnly && setIsEditing(true)}
        >
          {value === null ? 'null' : String(value)}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// Export
// =============================================================================

export default ConfigEditor;
