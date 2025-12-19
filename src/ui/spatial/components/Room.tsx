/**
 * Room Component
 *
 * Renders a complete room with walls, doors, floor, and applications.
 */

import React from 'react';
import type {
  Room as RoomType,
  Wall as WallType,
  Door as DoorType,
  Application as ApplicationType,
  ViewportDimensions,
} from '../../../core/spatial';
import { Wall } from './Wall';
import { Door } from './Door';
import { FloorPattern } from './FloorPattern';
import { Application } from './Application';

// =============================================================================
// Component Props
// =============================================================================

interface RoomProps {
  room: RoomType;
  viewport: ViewportDimensions;
  className?: string;
  style?: React.CSSProperties;
  /** Edit mode enables selection and dragging */
  editMode?: boolean;
  /** Selected element name */
  selectedElement?: string;
  /** Highlighted door (when character is near) */
  highlightedDoor?: string;
  /** Highlighted app (when character is near) */
  highlightedApp?: string;
  /** Callbacks */
  onWallClick?: (wall: WallType, name: string) => void;
  onDoorClick?: (door: DoorType, name: string) => void;
  onDoorHover?: (door: DoorType | null, name?: string) => void;
  onAppClick?: (app: ApplicationType, name: string) => void;
  onAppDoubleClick?: (app: ApplicationType, name: string) => void;
  onAppHover?: (app: ApplicationType | null, name?: string) => void;
  onAppMouseDown?: (app: ApplicationType, name: string, e: React.MouseEvent) => void;
  onAppDragStart?: (app: ApplicationType, name: string, e: React.DragEvent) => void;
  onAppDragEnd?: (app: ApplicationType, name: string, e: React.DragEvent) => void;
  /** Children (for overlays, character, etc.) */
  children?: React.ReactNode;
}

// =============================================================================
// Room Component
// =============================================================================

export const Room: React.FC<RoomProps> = ({
  room,
  viewport,
  className = '',
  style: customStyle,
  editMode = false,
  selectedElement,
  highlightedDoor,
  highlightedApp,
  onWallClick,
  onDoorClick,
  onDoorHover,
  onAppClick,
  onAppDoubleClick,
  onAppHover,
  onAppMouseDown,
  onAppDragStart,
  onAppDragEnd,
  children,
}) => {
  const roomStyle: React.CSSProperties = {
    position: 'relative',
    width: viewport.width,
    height: viewport.height,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    ...customStyle,
  };

  return (
    <div className={`spatial-room ${className}`} style={roomStyle}>
      {/* Floor Layer */}
      <FloorPattern
        imageUrl={room.floorImage}
        width={viewport.width}
        height={viewport.height}
        offsetX={viewport.wallWidthX}
        offsetY={viewport.wallWidthY}
        pattern="wood"
      />

      {/* Walls Layer */}
      {Object.entries(room.walls).map(([name, wall]) => (
        <Wall
          key={name}
          wall={wall}
          onClick={
            editMode
              ? (w) => onWallClick?.(w, name)
              : undefined
          }
          selected={selectedElement === name}
        />
      ))}

      {/* Doors Layer */}
      {Object.entries(room.doors).map(([name, door]) => (
        <Door
          key={name}
          door={door}
          name={name}
          onClick={(d, n) => onDoorClick?.(d, n || name)}
          onHover={(d, n) => onDoorHover?.(d, n)}
          selected={selectedElement === name}
          highlighted={highlightedDoor === name}
          showLabel={editMode}
        />
      ))}

      {/* Applications Layer */}
      {Object.entries(room.applications).map(([name, app]) => (
        <Application
          key={name}
          app={app}
          name={name}
          onClick={onAppClick}
          onDoubleClick={onAppDoubleClick}
          onHover={onAppHover}
          onMouseDown={onAppMouseDown}
          onDragStart={onAppDragStart}
          onDragEnd={onAppDragEnd}
          selected={selectedElement === name}
          highlighted={highlightedApp === name}
          draggable={editMode}
          showLabel={true}
        />
      ))}

      {/* Children (character, overlays, etc.) */}
      {children}
    </div>
  );
};

// =============================================================================
// Room with Edit Mode Overlay
// =============================================================================

interface EditModeOverlayProps {
  visible: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const EditModeOverlay: React.FC<EditModeOverlayProps> = ({
  visible,
  onClose,
  children,
}) => {
  if (!visible) return null;

  return (
    <div
      className="spatial-edit-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {/* Edit mode indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: '#fff',
          padding: '8px 24px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 'bold',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>EDIT MODE</span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          press f to exit
        </button>
      </div>

      {/* Trash zone indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          border: '2px dashed #ef4444',
          padding: '20px 40px',
          borderRadius: 8,
          color: '#fff',
          fontSize: 12,
          pointerEvents: 'auto',
        }}
      >
        🗑️ Drag here to delete
      </div>

      {children}
    </div>
  );
};

// =============================================================================
// Room Minimap
// =============================================================================

interface MinimapProps {
  room: RoomType;
  characterPosition?: { x: number; y: number };
  scale?: number;
  className?: string;
}

export const Minimap: React.FC<MinimapProps> = ({
  room,
  characterPosition,
  scale = 0.1,
  className = '',
}) => {
  return (
    <div
      className={`spatial-minimap ${className}`}
      style={{
        position: 'relative',
        backgroundColor: '#1a1a2e',
        border: '2px solid #4a5568',
        borderRadius: 4,
        overflow: 'hidden',
        width: 200,
        height: 150,
      }}
    >
      {/* Walls */}
      {Object.entries(room.walls).map(([name, wall]) => (
        <div
          key={name}
          style={{
            position: 'absolute',
            left: wall.x * scale,
            top: wall.y * scale,
            width: wall.width * scale,
            height: wall.height * scale,
            backgroundColor: '#8B4513',
          }}
        />
      ))}

      {/* Doors */}
      {Object.entries(room.doors).map(([name, door]) => (
        <div
          key={name}
          style={{
            position: 'absolute',
            left: door.x * scale,
            top: door.y * scale,
            width: door.width * scale,
            height: door.height * scale,
            backgroundColor: '#8d6e63',
          }}
        />
      ))}

      {/* Applications */}
      {Object.entries(room.applications).map(([name, app]) => (
        <div
          key={name}
          style={{
            position: 'absolute',
            left: app.x * scale,
            top: app.y * scale,
            width: Math.max(app.width * scale, 4),
            height: Math.max(app.height * scale, 4),
            backgroundColor: '#3b82f6',
            borderRadius: 2,
          }}
        />
      ))}

      {/* Character */}
      {characterPosition && (
        <div
          style={{
            position: 'absolute',
            left: characterPosition.x * scale - 3,
            top: characterPosition.y * scale - 3,
            width: 6,
            height: 6,
            backgroundColor: '#fbbf24',
            borderRadius: '50%',
            border: '1px solid #fff',
          }}
        />
      )}
    </div>
  );
};
