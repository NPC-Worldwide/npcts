/**
 * FurnitureItem Component
 *
 * Renders a furniture/decoration item in the room.
 * Supports drag-to-move in edit mode.
 */

import React, { useState, useCallback } from 'react';
import type { FurnitureItemConfig } from './FurnitureCatalogOverlay';
import { FURNITURE_CATALOG } from './FurnitureCatalogOverlay';

// =============================================================================
// Types
// =============================================================================

export interface FurnitureItemProps {
  item: FurnitureItemConfig;
  viewport: { width: number; height: number };
  editMode?: boolean;
  selected?: boolean;
  onSelect?: (item: FurnitureItemConfig) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onDelete?: (id: string) => void;
}

// =============================================================================
// FurnitureItem Component
// =============================================================================

export const FurnitureItem: React.FC<FurnitureItemProps> = ({
  item,
  viewport,
  editMode = false,
  selected = false,
  onSelect,
  onMove,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Get catalog info for this item type
  const catalogItem = FURNITURE_CATALOG.find(c => c.id === item.type);
  const emoji = catalogItem?.emoji || '📦';

  // Convert percent to pixels
  const x = (item.x / 100) * viewport.width;
  const y = (item.y / 100) * viewport.height;
  const width = (item.width / 100) * viewport.width;
  const height = (item.height / 100) * viewport.height;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setDragStart({
      x: e.clientX - x,
      y: e.clientY - y,
    });

    onSelect?.(item);
  }, [editMode, x, y, item, onSelect]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !onMove) return;

    const newX = ((e.clientX - dragStart.x) / viewport.width) * 100;
    const newY = ((e.clientY - dragStart.y) / viewport.height) * 100;

    // Clamp to room bounds
    const clampedX = Math.max(0, Math.min(100 - item.width, newX));
    const clampedY = Math.max(0, Math.min(100 - item.height, newY));

    onMove(item.id, clampedX, clampedY);
  }, [isDragging, dragStart, viewport, item, onMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(item.id);
  }, [item.id, onDelete]);

  // Attach global mouse listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect?.(item);
  }, [editMode, item, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editMode || !selected) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete?.(item.id);
    }
  }, [editMode, selected, item.id, onDelete]);

  // Base style for the furniture item
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    zIndex: item.zIndex ?? 50,
    transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.min(width, height) * 0.6,
    cursor: editMode ? 'move' : 'default',
    userSelect: 'none',
    transition: isDragging ? 'none' : 'left 0.1s, top 0.1s',
    outline: selected ? '2px solid #f59e0b' : 'none',
    outlineOffset: 2,
    borderRadius: 4,
    overflow: 'visible',
  };

  // Apply color tint if item has color
  const colorStyle: React.CSSProperties = item.color ? {
    filter: `drop-shadow(0 0 2px ${item.color}40)`,
  } : {};

  // Custom image rendering
  if (item.customImage) {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundImage: `url(${item.customImage})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={editMode ? 0 : -1}
        role="button"
        aria-label={item.name}
      >
        {editMode && selected && (
          <div style={{
            position: 'absolute',
            top: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}>
            {item.name}
          </div>
        )}
        {/* Delete button in edit mode */}
        {editMode && onDelete && (
          <button
            onClick={handleDeleteClick}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid #fff',
              color: '#fff',
              fontSize: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Emoji-based rendering
  return (
    <div
      style={{
        ...baseStyle,
        ...colorStyle,
        backgroundColor: editMode ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={editMode ? 0 : -1}
      role="button"
      aria-label={item.name}
    >
      <span style={{
        filter: item.color ? `drop-shadow(0 2px 4px ${item.color})` : undefined,
      }}>
        {emoji}
      </span>

      {/* Item name label in edit mode */}
      {editMode && selected && (
        <div style={{
          position: 'absolute',
          top: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          whiteSpace: 'nowrap',
        }}>
          {item.name}
          {item.style && ` (${item.style})`}
        </div>
      )}

      {/* Delete button in edit mode */}
      {editMode && onDelete && (
        <button
          onClick={handleDeleteClick}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #fff',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// =============================================================================
// FurnitureLayer Component - Renders all furniture in a room
// =============================================================================

export interface FurnitureLayerProps {
  items: FurnitureItemConfig[];
  viewport: { width: number; height: number };
  editMode?: boolean;
  selectedId?: string;
  onSelectItem?: (item: FurnitureItemConfig | null) => void;
  onMoveItem?: (id: string, x: number, y: number) => void;
  onDeleteItem?: (id: string) => void;
}

export const FurnitureLayer: React.FC<FurnitureLayerProps> = ({
  items,
  viewport,
  editMode = false,
  selectedId,
  onSelectItem,
  onMoveItem,
  onDeleteItem,
}) => {
  // Sort by zIndex to ensure proper layering
  const sortedItems = [...items].sort((a, b) => (a.zIndex ?? 50) - (b.zIndex ?? 50));

  return (
    <>
      {sortedItems.map((item) => (
        <FurnitureItem
          key={item.id}
          item={item}
          viewport={viewport}
          editMode={editMode}
          selected={selectedId === item.id}
          onSelect={onSelectItem || undefined}
          onMove={onMoveItem}
          onDelete={onDeleteItem}
        />
      ))}
    </>
  );
};

export default FurnitureItem;
