/**
 * HelpOverlay Component
 *
 * Displays a modern help overlay with keyboard shortcuts and controls.
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Component Props
// =============================================================================

interface HelpOverlayProps {
  onClose?: () => void;
  className?: string;
}

// =============================================================================
// Key Binding Data
// =============================================================================

interface KeyBinding {
  key: string;
  description: string;
  category: 'movement' | 'interaction' | 'editing' | 'ui';
}

const KEY_BINDINGS: KeyBinding[] = [
  // Movement
  { key: 'W', description: 'Move up', category: 'movement' },
  { key: 'A', description: 'Move left', category: 'movement' },
  { key: 'S', description: 'Move down', category: 'movement' },
  { key: 'D', description: 'Move right', category: 'movement' },

  // Interaction
  { key: 'O', description: 'Open/interact with nearby item', category: 'interaction' },
  { key: 'Space', description: 'Interact', category: 'interaction' },

  // Editing
  { key: 'F', description: 'Toggle edit mode', category: 'editing' },
  { key: 'E', description: 'Add/edit application', category: 'editing' },
  { key: 'R', description: 'Add new room', category: 'editing' },
  { key: 'Ctrl+D', description: 'Delete selected item', category: 'editing' },

  // UI
  { key: 'M', description: 'Toggle key legend', category: 'ui' },
  { key: '?', description: 'Show this help', category: 'ui' },
  { key: 'Esc', description: 'Close overlay/exit mode', category: 'ui' },
];

const CATEGORY_INFO: Record<KeyBinding['category'], { label: string; color: string; icon: string }> = {
  movement: { label: 'Movement', color: '#3b82f6', icon: '🎮' },
  interaction: { label: 'Interaction', color: '#10b981', icon: '👆' },
  editing: { label: 'Editing', color: '#f59e0b', icon: '✏️' },
  ui: { label: 'Interface', color: '#8b5cf6', icon: '🖥️' },
};

// =============================================================================
// Styles
// =============================================================================

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
    padding: 24,
    maxWidth: 680,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    animation: 'slideUp 0.25s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  title: {
    margin: 0,
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 600,
  },
  subtitle: {
    margin: '2px 0 0 0',
    color: '#64748b',
    fontSize: 12,
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 14,
  },
  categoryCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 16,
    transition: 'all 0.15s',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },
  categoryLabel: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  bindingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  bindingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kbd: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#fff',
    minWidth: 50,
    textAlign: 'center' as const,
    boxShadow: '0 2px 0 rgba(0, 0, 0, 0.2)',
  },
  description: {
    color: '#9ca3af',
    fontSize: 13,
    flex: 1,
    textAlign: 'right' as const,
  },
  footer: {
    marginTop: 28,
    paddingTop: 20,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    color: '#6b7280',
    fontSize: 13,
  },
  footerKbd: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#fff',
  },
};

// =============================================================================
// HelpOverlay Component
// =============================================================================

export const HelpOverlay: React.FC<HelpOverlayProps> = ({
  onClose,
  className = '',
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Group bindings by category
  const bindingsByCategory = KEY_BINDINGS.reduce(
    (acc, binding) => {
      if (!acc[binding.category]) {
        acc[binding.category] = [];
      }
      acc[binding.category].push(binding);
      return acc;
    },
    {} as Record<KeyBinding['category'], KeyBinding[]>
  );

  return (
    <>
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

      <div
        className={`spatial-help-overlay ${className}`}
        style={styles.overlay}
        onClick={onClose}
      >
        <div
          style={styles.container}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleContainer}>
              <div style={styles.titleIcon}>⌨️</div>
              <div>
                <h2 style={styles.title}>Keyboard Controls</h2>
                <p style={styles.subtitle}>Master your spatial navigation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={styles.closeButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#9ca3af';
              }}
              aria-label="Close help"
            >
              ×
            </button>
          </div>

          {/* Categories Grid */}
          <div style={styles.grid}>
            {(Object.keys(bindingsByCategory) as KeyBinding['category'][]).map(
              (category) => {
                const info = CATEGORY_INFO[category];
                const isHovered = hoveredCategory === category;
                return (
                  <div
                    key={category}
                    style={{
                      ...styles.categoryCard,
                      ...(isHovered ? {
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderColor: `${info.color}40`,
                      } : {}),
                    }}
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div style={styles.categoryHeader}>
                      <div
                        style={{
                          ...styles.categoryIcon,
                          backgroundColor: `${info.color}20`,
                        }}
                      >
                        {info.icon}
                      </div>
                      <h3 style={{ ...styles.categoryLabel, color: info.color }}>
                        {info.label}
                      </h3>
                    </div>
                    <div style={styles.bindingsList}>
                      {bindingsByCategory[category].map((binding) => (
                        <div key={binding.key} style={styles.bindingRow}>
                          <kbd style={styles.kbd}>{binding.key}</kbd>
                          <span style={styles.description}>
                            {binding.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            Press <kbd style={styles.footerKbd}>Esc</kbd> or click anywhere to close
          </div>
        </div>
      </div>
    </>
  );
};
