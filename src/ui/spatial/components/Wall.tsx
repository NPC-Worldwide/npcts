/**
 * Wall Component
 *
 * Renders a wall with CSS-based texture patterns.
 * Supports brick, wood, and office styles.
 */

import React, { useMemo } from 'react';
import type { Wall as WallType, WallStyle } from '../../../core/spatial';

// =============================================================================
// Wall Style Definitions (CSS-based textures)
// =============================================================================

const WALL_STYLES: Record<
  WallStyle,
  {
    background: string;
    borderColor: string;
    boxShadow?: string;
  }
> = {
  brick: {
    background: `
      repeating-linear-gradient(
        90deg,
        #b37160 0px,
        #b37160 30px,
        #a86555 30px,
        #a86555 32px
      ),
      repeating-linear-gradient(
        0deg,
        #c4847a 0px,
        #b37160 4px,
        #8B4513 4px,
        #8B4513 5px
      )
    `,
    borderColor: '#8B4513',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
  },
  wood: {
    background: `
      repeating-linear-gradient(
        0deg,
        #8b5e3c 0px,
        #a67c52 4px,
        #8b5e3c 8px,
        #6e4930 10px,
        #8b5e3c 12px
      )
    `,
    borderColor: '#6e4930',
    boxShadow: 'inset 0 0 15px rgba(0,0,0,0.2)',
  },
  office: {
    background: `
      linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 50%, #d0d0d0 100%)
    `,
    borderColor: '#c0c0c0',
    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.1)',
  },
};

// =============================================================================
// Component Props
// =============================================================================

interface WallProps {
  wall: WallType;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (wall: WallType) => void;
  selected?: boolean;
}

// =============================================================================
// Wall Component
// =============================================================================

export const Wall: React.FC<WallProps> = ({
  wall,
  className = '',
  style: customStyle,
  onClick,
  selected = false,
}) => {
  const wallStyle = useMemo(() => {
    const styleConfig = WALL_STYLES[wall.style || 'brick'];

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: wall.x,
      top: wall.y,
      width: wall.width,
      height: wall.height,
      background: styleConfig.background,
      borderColor: styleConfig.borderColor,
      boxShadow: styleConfig.boxShadow,
      borderWidth: wall.orientation === 'horizontal' ? '0 0 3px 0' : '0 3px 0 0',
      borderStyle: 'solid',
      zIndex: 10,
      pointerEvents: onClick ? 'auto' : 'none',
      cursor: onClick ? 'pointer' : 'default',
      outline: selected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px',
      ...customStyle,
    };

    return baseStyle;
  }, [wall, customStyle, onClick, selected]);

  const handleClick = () => {
    onClick?.(wall);
  };

  return (
    <div
      className={`spatial-wall ${className}`}
      style={wallStyle}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    />
  );
};

// =============================================================================
// Exports
// =============================================================================

export { WALL_STYLES };
