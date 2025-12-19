/**
 * Door Component
 *
 * Renders a door that connects rooms.
 * Supports different orientations (up, down, left, right).
 */

import React, { useMemo } from 'react';
import type { Door as DoorType, DoorDirection } from '../../../core/spatial';

// =============================================================================
// Door Style Configuration
// =============================================================================

const DOOR_COLORS = {
  frame: '#5d4037',
  panel: '#8d6e63',
  handle: '#ffd700',
  shadow: 'rgba(0,0,0,0.3)',
};

// =============================================================================
// Component Props
// =============================================================================

interface DoorProps {
  door: DoorType;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (door: DoorType, name?: string) => void;
  onHover?: (door: DoorType | null, name?: string) => void;
  selected?: boolean;
  highlighted?: boolean;
  showLabel?: boolean;
}

// =============================================================================
// Door Component
// =============================================================================

export const Door: React.FC<DoorProps> = ({
  door,
  name,
  className = '',
  style: customStyle,
  onClick,
  onHover,
  selected = false,
  highlighted = false,
  showLabel = false,
}) => {
  const doorStyle = useMemo(() => {
    const isVertical =
      door.orientation === 'left' || door.orientation === 'right';

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: door.x,
      top: door.y,
      width: door.width,
      height: door.height,
      backgroundColor: DOOR_COLORS.panel,
      border: `3px solid ${DOOR_COLORS.frame}`,
      borderRadius: isVertical ? '0 4px 4px 0' : '4px 4px 0 0',
      boxShadow: `inset 0 0 10px ${DOOR_COLORS.shadow}`,
      zIndex: 15,
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      outline: selected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px',
      ...customStyle,
    };

    if (highlighted) {
      baseStyle.boxShadow = `0 0 15px #ffd700, inset 0 0 10px ${DOOR_COLORS.shadow}`;
      baseStyle.transform = 'scale(1.05)';
    }

    return baseStyle;
  }, [door, customStyle, selected, highlighted]);

  const handleStyle = useMemo((): React.CSSProperties => {
    const isVertical =
      door.orientation === 'left' || door.orientation === 'right';

    return {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor: DOOR_COLORS.handle,
      boxShadow: '0 0 3px rgba(0,0,0,0.5)',
      ...(isVertical
        ? {
            top: '50%',
            right: door.orientation === 'left' ? 5 : undefined,
            left: door.orientation === 'right' ? 5 : undefined,
            transform: 'translateY(-50%)',
          }
        : {
            left: '50%',
            bottom: door.orientation === 'up' ? 5 : undefined,
            top: door.orientation === 'down' ? 5 : undefined,
            transform: 'translateX(-50%)',
          }),
    };
  }, [door.orientation]);

  const handleClick = () => {
    onClick?.(door, name);
  };

  const handleMouseEnter = () => {
    onHover?.(door, name);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  return (
    <div
      className={`spatial-door ${className}`}
      style={doorStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Door to ${door.leadsTo}`}
    >
      {/* Door panel lines */}
      <div
        style={{
          position: 'absolute',
          inset: '10%',
          border: `2px solid ${DOOR_COLORS.frame}`,
          borderRadius: 2,
          opacity: 0.5,
        }}
      />

      {/* Door handle */}
      <div style={handleStyle} />

      {/* Label */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}
        >
          → {door.leadsTo}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Door Arrow Indicator
// =============================================================================

interface DoorArrowProps {
  direction: DoorDirection;
  size?: number;
}

export const DoorArrow: React.FC<DoorArrowProps> = ({
  direction,
  size = 16,
}) => {
  const rotation = useMemo(() => {
    switch (direction) {
      case 'up':
        return -90;
      case 'down':
        return 90;
      case 'left':
        return 180;
      case 'right':
        return 0;
      default:
        return 0;
    }
  }, [direction]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
        fill="currentColor"
      />
    </svg>
  );
};
