/**
 * MenuOverlay Component
 *
 * Renders a modern app menu overlay when an app with menuItems is interacted with.
 * Shows clickable menu items that execute commands when clicked.
 */

import React, { useState, useEffect } from 'react';
import type { Application } from '../../../core/spatial';

interface MenuOverlayProps {
  /** The app whose menu is being shown */
  app: Application;
  /** The menu items to display */
  menuItems: Record<string, any>;
  /** Called when a menu item is clicked */
  onItemClick: (item: any) => void;
  /** Called to close the menu */
  onClose: () => void;
  /** Whether edit mode is enabled (shows delete buttons) */
  editMode?: boolean;
  /** Called when delete is clicked on a menu item */
  onDeleteItem?: (item: any) => void;
  /** Called when add button is clicked */
  onAddItem?: () => void;
  /** Called to toggle edit mode */
  onToggleEditMode?: () => void;
}

// Sleek styles - Incognide-inspired
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease-out',
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 20,
    minWidth: 320,
    maxWidth: 480,
    maxHeight: '80vh',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    animation: 'slideUp 0.25s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    objectFit: 'contain' as const,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: 16,
    transition: 'all 0.15s',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 10,
    marginBottom: 14,
  },
  menuItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    padding: 14,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    position: 'relative' as const,
  },
  menuItemHover: {
    background: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    transform: 'translateY(-1px)',
  },
  menuItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'contain' as const,
    background: 'rgba(255, 255, 255, 0.05)',
    padding: 6,
  },
  menuItemPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuItemName: {
    fontSize: 12,
    fontWeight: 500,
    color: '#cbd5e1',
    textAlign: 'center' as const,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  deleteButton: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#ef4444',
    border: '2px solid #0f172a',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s',
  },
  addButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    background: 'rgba(59, 130, 246, 0.06)',
    border: '1px dashed rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    minHeight: 90,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#3b82f6',
    fontSize: 20,
  },
  addText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 500,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 14,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
};

export function MenuOverlay({
  app,
  menuItems,
  onItemClick,
  onClose,
  editMode = false,
  onDeleteItem,
  onAddItem,
  onToggleEditMode,
}: MenuOverlayProps): React.ReactElement {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleItemClick = (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editMode) {
      onItemClick(item);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDeleteClick = (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteItem?.(item);
  };

  const menuEntries = Object.entries(menuItems);

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.title}>
              {app.image && (
                <img src={app.image} alt={app.name} style={styles.titleIcon} />
              )}
              {app.name}
            </h2>
            <button
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ×
            </button>
          </div>

          {/* Menu Items Grid */}
          <div style={styles.itemsGrid}>
            {menuEntries.map(([key, item]) => (
              <div
                key={item.name || key}
                style={{
                  ...styles.menuItem,
                  ...(hoveredItem === key ? styles.menuItemHover : {}),
                }}
                onClick={(e) => handleItemClick(item, e)}
                onMouseEnter={() => setHoveredItem(key)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {editMode && onDeleteItem && (
                  <button
                    style={styles.deleteButton}
                    onClick={(e) => handleDeleteClick(item, e)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                )}
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name || key}
                    style={styles.menuItemImage}
                  />
                ) : (
                  <div style={styles.menuItemPlaceholder}>
                    {(item.name || key).charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={styles.menuItemName}>{item.name || key}</span>
              </div>
            ))}

            {/* Add Item Button (only in edit mode) */}
            {editMode && onAddItem && (
              <div
                style={{
                  ...styles.addButton,
                  ...(hoveredItem === '_add' ? {
                    background: 'rgba(99, 102, 241, 0.2)',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                  } : {}),
                }}
                onClick={onAddItem}
                onMouseEnter={() => setHoveredItem('_add')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div style={styles.addIcon}>+</div>
                <span style={styles.addText}>Add Item</span>
              </div>
            )}
          </div>

          {/* Footer with Edit Button */}
          {onToggleEditMode && (
            <div style={styles.footer}>
              <button
                style={{
                  background: editMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  border: editMode ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: editMode ? '#f87171' : '#60a5fa',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={onToggleEditMode}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = editMode
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = editMode
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)';
                }}
              >
                {editMode ? (
                  <>
                    <span>✓</span>
                    Done Editing
                  </>
                ) : (
                  <>
                    <span>✏️</span>
                    Edit Menu
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MenuOverlay;
