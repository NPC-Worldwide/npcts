/**
 * MenuOverlay Component
 *
 * Renders a modern app menu overlay when an app with menuItems is interacted with.
 * Shows clickable menu items that execute commands when clicked.
 */

import React, { useState } from 'react';
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

// Modern styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 24,
    minWidth: 320,
    maxWidth: 480,
    maxHeight: '80vh',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: 'contain' as const,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 20,
    transition: 'all 0.2s',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  menuItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 10,
    padding: 16,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative' as const,
  },
  menuItemHover: {
    background: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    transform: 'translateY(-2px)',
  },
  menuItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    objectFit: 'contain' as const,
    background: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
  },
  menuItemPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e5e7eb',
    textAlign: 'center' as const,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  deleteButton: {
    position: 'absolute' as const,
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#ef4444',
    border: '2px solid #1e1e2e',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s',
  },
  addButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    background: 'rgba(99, 102, 241, 0.1)',
    border: '2px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: 100,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366f1',
    fontSize: 24,
  },
  addText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: 500,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
                  background: editMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  border: editMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 8,
                  padding: '10px 20px',
                  color: editMode ? '#f87171' : '#818cf8',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={onToggleEditMode}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = editMode
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(99, 102, 241, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = editMode
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(99, 102, 241, 0.2)';
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
