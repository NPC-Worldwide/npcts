/**
 * Door Component
 *
 * Renders a door that connects rooms.
 * Supports different orientations (up, down, left, right).
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
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

// CSS for pulsing online door glow
const onlineDoorStyle = `
  @keyframes onlineDoorPulse {
    0%, 100% { box-shadow: 0 0 12px rgba(64,145,108,0.4), inset 0 0 10px rgba(0,0,0,0.2); }
    50% { box-shadow: 0 0 20px rgba(64,145,108,0.7), 0 0 30px rgba(64,145,108,0.3), inset 0 0 10px rgba(0,0,0,0.2); }
  }
  .spatial-door-online {
    animation: onlineDoorPulse 2s ease-in-out infinite;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('online-door-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'online-door-styles';
  styleEl.textContent = onlineDoorStyle;
  document.head.appendChild(styleEl);
}

// =============================================================================
// Component Props
// =============================================================================

export interface OnlineRoomInfo {
  serverUrl?: string;
  playerCount?: number;
  zoneName?: string;
  isConnected?: boolean;
}

interface DoorProps {
  door: DoorType;
  name?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (door: DoorType, name?: string) => void;
  onHover?: (door: DoorType | null, name?: string) => void;
  onDragStart?: (door: DoorType, name?: string) => void;
  onDragEnd?: (door: DoorType, name: string, x: number, y: number) => void;
  selected?: boolean;
  highlighted?: boolean;
  showLabel?: boolean;
  draggable?: boolean;
  onlineInfo?: OnlineRoomInfo;
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
  onDragStart,
  onDragEnd,
  selected = false,
  highlighted = false,
  showLabel = false,
  draggable = false,
  onlineInfo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const doorRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - (rect.left + door.x),
      y: e.clientY - (rect.top + door.y),
    });
    onDragStart?.(door, name);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - rect.left - dragOffset.x;
      const newY = moveEvent.clientY - rect.top - dragOffset.y;

      // Update position visually during drag
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.left = `${newX}px`;
        target.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      const newX = upEvent.clientX - rect.left - dragOffset.x;
      const newY = upEvent.clientY - rect.top - dragOffset.y;
      onDragEnd?.(door, name || '', newX, newY);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [draggable, door, name, onDragStart, onDragEnd, dragOffset]);

  const isOutsideDoor = door.type === 'outside';

  const doorStyle = useMemo(() => {
    const isVertical =
      door.orientation === 'left' || door.orientation === 'right';

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: door.x,
      top: door.y,
      width: door.width,
      height: door.height,
      backgroundColor: isOutsideDoor ? '#2d6a4f' : DOOR_COLORS.panel,
      border: isOutsideDoor ? '3px solid #40916c' : `3px solid ${DOOR_COLORS.frame}`,
      borderRadius: isVertical ? '0 4px 4px 0' : '4px 4px 0 0',
      boxShadow: isOutsideDoor
        ? '0 0 12px rgba(64,145,108,0.4), inset 0 0 10px rgba(0,0,0,0.2)'
        : `inset 0 0 10px ${DOOR_COLORS.shadow}`,
      zIndex: isDragging ? 1000 : 15,
      cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      transition: isDragging ? 'none' : 'transform 0.2s, box-shadow 0.2s',
      outline: selected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px',
      userSelect: 'none',
      ...customStyle,
    };

    if (highlighted) {
      baseStyle.boxShadow = isOutsideDoor
        ? '0 0 20px rgba(64,145,108,0.6), inset 0 0 10px rgba(0,0,0,0.2)'
        : `0 0 15px #ffd700, inset 0 0 10px ${DOOR_COLORS.shadow}`;
      baseStyle.transform = 'scale(1.05)';
    }

    return baseStyle;
  }, [door, customStyle, selected, highlighted, isDragging, draggable, isOutsideDoor]);

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
    if (isOutsideDoor && doorRef.current) {
      const rect = doorRef.current.getBoundingClientRect();
      setPanelPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      setShowOnlinePanel(true);
    }
  };

  const handleMouseLeave = () => {
    onHover?.(null);
    setShowOnlinePanel(false);
  };

  return (
    <div
      ref={doorRef}
      className={`spatial-door ${isOutsideDoor ? 'spatial-door-online' : ''} ${className}`}
      style={doorStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
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
          border: `2px solid ${isOutsideDoor ? '#40916c' : DOOR_COLORS.frame}`,
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
            color: isOutsideDoor ? '#95d5b2' : '#fff',
            backgroundColor: isOutsideDoor ? 'rgba(45,106,79,0.85)' : 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}
        >
          {isOutsideDoor ? '🌐 Online' : `→ ${door.leadsTo}`}
        </div>
      )}

      {/* Online room info panel - rendered via portal to avoid clipping */}
      {isOutsideDoor && showOnlinePanel && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: panelPosition.y,
            left: panelPosition.x,
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(45, 106, 79, 0.6)',
            borderRadius: 8,
            padding: '12px 16px',
            minWidth: 200,
            zIndex: 10000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(45,106,79,0.3)',
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: onlineInfo?.isConnected !== false ? '#40916c' : '#ef4444',
              boxShadow: onlineInfo?.isConnected !== false ? '0 0 8px #40916c' : 'none',
            }} />
            <span style={{ color: '#95d5b2', fontSize: 12, fontWeight: 600 }}>
              ONLINE ROOM
            </span>
          </div>

          {/* Room name */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>Room</div>
            <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>
              {onlineInfo?.zoneName || door.leadsTo}
            </div>
          </div>

          {/* Player count */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>Players Online</div>
            <div style={{ color: '#95d5b2', fontSize: 13 }}>
              👥 {onlineInfo?.playerCount ?? '...'} online
            </div>
          </div>

          {/* Server */}
          {onlineInfo?.serverUrl && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>Server</div>
              <div style={{
                color: '#94a3b8',
                fontSize: 11,
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '4px 6px',
                borderRadius: 4,
              }}>
                {onlineInfo.serverUrl}
              </div>
            </div>
          )}

          {/* Enter prompt */}
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            backgroundColor: 'rgba(45,106,79,0.2)',
            border: '1px solid rgba(45,106,79,0.4)',
            borderRadius: 6,
            color: '#95d5b2',
            fontSize: 11,
            textAlign: 'center',
          }}>
            Walk through to enter →
          </div>
        </div>,
        document.body
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
