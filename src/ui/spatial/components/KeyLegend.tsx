/**
 * KeyLegend Component
 *
 * Displays a modern, compact key legend in the corner of the screen.
 */

import React, { useState } from 'react';

// =============================================================================
// Component Props
// =============================================================================

interface KeyLegendProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsed?: boolean;
  className?: string;
  /** Offset from right edge when position is bottom-right (to sit left of dock) */
  rightOffset?: number;
}

// =============================================================================
// Key binding data
// =============================================================================

interface KeyInfo {
  key: string;
  description: string;
  color: string;
}

const KEY_ITEMS: KeyInfo[] = [
  { key: 'WASD', description: 'Move', color: '#3b82f6' },
  { key: 'O', description: 'Interact', color: '#10b981' },
  { key: 'F', description: 'Edit mode', color: '#f59e0b' },
  { key: '?', description: 'Help', color: '#8b5cf6' },
];

// =============================================================================
// KeyLegend Component
// =============================================================================

export const KeyLegend: React.FC<KeyLegendProps> = ({
  position = 'bottom-left',
  collapsed: initialCollapsed = false,
  className = '',
  /** Offset from right edge to sit left of dock */
  rightOffset = 200,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [isHovered, setIsHovered] = useState(false);

  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50,
    ...(position.includes('top') ? { top: 20 } : { bottom: 4 }),
    ...(position.includes('left') ? { left: 8 } : { right: rightOffset }),
  };

  if (collapsed) {
    return (
      <button
        className={`spatial-key-legend spatial-key-legend-collapsed ${className}`}
        style={{
          ...positionStyle,
          backgroundColor: isHovered ? 'rgba(99, 102, 241, 0.3)' : 'rgba(30, 30, 46, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '10px 14px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onClick={() => setCollapsed(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={{ fontSize: 14 }}>⌨️</span>
        <span>Keys</span>
      </button>
    );
  }

  return (
    <div
      className={`spatial-key-legend ${className}`}
      style={{
        ...positionStyle,
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 14,
        padding: 16,
        fontSize: 12,
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        minWidth: 160,
      }}
    >
      {/* Header with collapse button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⌨️</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Controls</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: 12,
            lineHeight: 1,
            borderRadius: 6,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          −
        </button>
      </div>

      {/* Key bindings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {KEY_ITEMS.map((item) => (
          <KeyItem
            key={item.key}
            keyName={item.key}
            description={item.description}
            color={item.color}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// KeyItem Component
// =============================================================================

interface KeyItemProps {
  keyName: string;
  description: string;
  color: string;
}

const KeyItem: React.FC<KeyItemProps> = ({ keyName, description, color }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '6px 8px',
        borderRadius: 8,
        background: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        transition: 'background 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <kbd
        style={{
          backgroundColor: `${color}20`,
          border: `1px solid ${color}40`,
          padding: '4px 8px',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 10,
          fontWeight: 600,
          color: color,
          minWidth: 42,
          textAlign: 'center',
        }}
      >
        {keyName}
      </kbd>
      <span style={{ color: '#9ca3af', fontSize: 12 }}>{description}</span>
    </div>
  );
};
