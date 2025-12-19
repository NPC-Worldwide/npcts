/**
 * FurnitureCatalogOverlay Component
 *
 * Browse and place furniture/decorative items in rooms.
 * Items can be customized with colors and styles.
 */

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FurnitureItemConfig {
  id: string;
  type: string;
  name: string;
  x: number;  // percent
  y: number;  // percent
  width: number;  // percent
  height: number;  // percent
  rotation?: number;  // degrees
  zIndex?: number;
  color?: string;
  style?: string;
  customImage?: string;
}

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: string;
  emoji: string;
  defaultWidth: number;
  defaultHeight: number;
  colorizable: boolean;
  styles?: string[];
}

export interface FurnitureCatalogOverlayProps {
  visible: boolean;
  onClose: () => void;
  onPlace: (item: FurnitureItemConfig) => void;
  existingFurniture?: FurnitureItemConfig[];
}

// =============================================================================
// Furniture Catalog Data
// =============================================================================

const FURNITURE_CATEGORIES = [
  { id: 'seating', name: 'Seating', emoji: '🪑' },
  { id: 'tables', name: 'Tables', emoji: '🪵' },
  { id: 'storage', name: 'Storage', emoji: '🗄️' },
  { id: 'decor', name: 'Decor', emoji: '🪴' },
  { id: 'lighting', name: 'Lighting', emoji: '💡' },
  { id: 'rugs', name: 'Rugs', emoji: '🟫' },
  { id: 'tech', name: 'Tech', emoji: '🖥️' },
];

const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  // Seating
  { id: 'chair', name: 'Chair', category: 'seating', emoji: '🪑', defaultWidth: 5, defaultHeight: 5, colorizable: true, styles: ['modern', 'classic', 'gaming'] },
  { id: 'sofa', name: 'Sofa', category: 'seating', emoji: '🛋️', defaultWidth: 12, defaultHeight: 6, colorizable: true, styles: ['modern', 'sectional', 'loveseat'] },
  { id: 'beanbag', name: 'Bean Bag', category: 'seating', emoji: '🫘', defaultWidth: 6, defaultHeight: 6, colorizable: true },
  { id: 'stool', name: 'Stool', category: 'seating', emoji: '🪑', defaultWidth: 4, defaultHeight: 4, colorizable: true },

  // Tables
  { id: 'desk', name: 'Desk', category: 'tables', emoji: '🪵', defaultWidth: 10, defaultHeight: 5, colorizable: true, styles: ['modern', 'standing', 'corner'] },
  { id: 'coffee-table', name: 'Coffee Table', category: 'tables', emoji: '☕', defaultWidth: 8, defaultHeight: 4, colorizable: true },
  { id: 'dining-table', name: 'Dining Table', category: 'tables', emoji: '🍽️', defaultWidth: 12, defaultHeight: 8, colorizable: true },
  { id: 'nightstand', name: 'Nightstand', category: 'tables', emoji: '🛏️', defaultWidth: 4, defaultHeight: 4, colorizable: true },

  // Storage
  { id: 'bookshelf', name: 'Bookshelf', category: 'storage', emoji: '📚', defaultWidth: 8, defaultHeight: 12, colorizable: true, styles: ['tall', 'wide', 'corner'] },
  { id: 'cabinet', name: 'Cabinet', category: 'storage', emoji: '🗄️', defaultWidth: 6, defaultHeight: 8, colorizable: true },
  { id: 'dresser', name: 'Dresser', category: 'storage', emoji: '🪟', defaultWidth: 8, defaultHeight: 6, colorizable: true },
  { id: 'wardrobe', name: 'Wardrobe', category: 'storage', emoji: '🚪', defaultWidth: 8, defaultHeight: 14, colorizable: true },

  // Decor
  { id: 'plant', name: 'Plant', category: 'decor', emoji: '🪴', defaultWidth: 4, defaultHeight: 5, colorizable: false, styles: ['small', 'medium', 'large', 'hanging'] },
  { id: 'painting', name: 'Painting', category: 'decor', emoji: '🖼️', defaultWidth: 6, defaultHeight: 5, colorizable: false, styles: ['landscape', 'portrait', 'abstract'] },
  { id: 'mirror', name: 'Mirror', category: 'decor', emoji: '🪞', defaultWidth: 4, defaultHeight: 6, colorizable: false },
  { id: 'clock', name: 'Clock', category: 'decor', emoji: '🕐', defaultWidth: 3, defaultHeight: 3, colorizable: true },
  { id: 'vase', name: 'Vase', category: 'decor', emoji: '🏺', defaultWidth: 2, defaultHeight: 3, colorizable: true },

  // Lighting
  { id: 'floor-lamp', name: 'Floor Lamp', category: 'lighting', emoji: '🪔', defaultWidth: 3, defaultHeight: 8, colorizable: true },
  { id: 'desk-lamp', name: 'Desk Lamp', category: 'lighting', emoji: '💡', defaultWidth: 2, defaultHeight: 3, colorizable: true },
  { id: 'chandelier', name: 'Chandelier', category: 'lighting', emoji: '✨', defaultWidth: 6, defaultHeight: 4, colorizable: true },
  { id: 'string-lights', name: 'String Lights', category: 'lighting', emoji: '🎄', defaultWidth: 10, defaultHeight: 2, colorizable: true },

  // Rugs
  { id: 'rug-small', name: 'Small Rug', category: 'rugs', emoji: '🟫', defaultWidth: 8, defaultHeight: 6, colorizable: true, styles: ['solid', 'pattern', 'shag'] },
  { id: 'rug-large', name: 'Large Rug', category: 'rugs', emoji: '🟫', defaultWidth: 15, defaultHeight: 10, colorizable: true, styles: ['solid', 'pattern', 'oriental'] },
  { id: 'doormat', name: 'Doormat', category: 'rugs', emoji: '🚪', defaultWidth: 5, defaultHeight: 3, colorizable: true },

  // Tech
  { id: 'tv', name: 'TV', category: 'tech', emoji: '📺', defaultWidth: 10, defaultHeight: 6, colorizable: false, styles: ['mounted', 'stand'] },
  { id: 'computer', name: 'Computer', category: 'tech', emoji: '🖥️', defaultWidth: 4, defaultHeight: 4, colorizable: false },
  { id: 'speaker', name: 'Speaker', category: 'tech', emoji: '🔊', defaultWidth: 3, defaultHeight: 5, colorizable: true },
  { id: 'game-console', name: 'Game Console', category: 'tech', emoji: '🎮', defaultWidth: 4, defaultHeight: 2, colorizable: false },
];

const COLOR_PRESETS = [
  { name: 'Natural', color: '#8B7355' },
  { name: 'White', color: '#F5F5F5' },
  { name: 'Black', color: '#2D2D2D' },
  { name: 'Navy', color: '#1E3A5F' },
  { name: 'Forest', color: '#2D5A27' },
  { name: 'Burgundy', color: '#722F37' },
  { name: 'Teal', color: '#008080' },
  { name: 'Gold', color: '#D4AF37' },
];

// =============================================================================
// Styles
// =============================================================================

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
    borderRadius: 20,
    padding: 0,
    maxWidth: 700,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 28px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#9ca3af',
    fontSize: 13,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 10,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 22,
    transition: 'all 0.2s',
  },
  body: {
    padding: '20px 28px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  categories: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap' as const,
  },
  categoryButton: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    color: '#e5e7eb',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  itemCardSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  itemEmoji: {
    fontSize: 32,
  },
  itemName: {
    color: '#e5e7eb',
    fontSize: 12,
    textAlign: 'center' as const,
  },
  customization: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customizationTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 12,
  },
  colorGrid: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
  },
  colorSwatchSelected: {
    borderColor: '#fff',
    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.5)',
  },
  styleGrid: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap' as const,
  },
  styleButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    color: '#9ca3af',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'capitalize' as const,
  },
  styleButtonSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
  },
  footer: {
    padding: '20px 28px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    color: '#6b7280',
    fontSize: 13,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
  },
  button: {
    padding: '12px 24px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e5e7eb',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
};

// =============================================================================
// FurnitureCatalogOverlay Component
// =============================================================================

export const FurnitureCatalogOverlay: React.FC<FurnitureCatalogOverlayProps> = ({
  visible,
  onClose,
  onPlace,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('seating');
  const [selectedItem, setSelectedItem] = useState<FurnitureCatalogItem | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].color);
  const [selectedStyle, setSelectedStyle] = useState<string | undefined>();

  if (!visible) return null;

  const filteredItems = FURNITURE_CATALOG.filter(
    item => item.category === selectedCategory
  );

  const handlePlace = () => {
    if (!selectedItem) return;

    const newItem: FurnitureItemConfig = {
      id: `${selectedItem.id}-${Date.now()}`,
      type: selectedItem.id,
      name: selectedItem.name,
      x: 50, // Center of room
      y: 50,
      width: selectedItem.defaultWidth,
      height: selectedItem.defaultHeight,
      color: selectedItem.colorizable ? selectedColor : undefined,
      style: selectedStyle,
      zIndex: selectedItem.category === 'rugs' ? 0 : 50,
    };

    onPlace(newItem);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleContainer}>
              <div style={styles.titleIcon}>🪑</div>
              <div>
                <h2 style={styles.title}>Furniture Catalog</h2>
                <p style={styles.subtitle}>Decorate your room</p>
              </div>
            </div>
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

          {/* Body */}
          <div style={styles.body}>
            {/* Categories */}
            <div style={styles.categories}>
              {FURNITURE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  style={{
                    ...styles.categoryButton,
                    ...(selectedCategory === cat.id ? styles.categoryButtonActive : {}),
                  }}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedItem(null);
                    setSelectedStyle(undefined);
                  }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div style={styles.itemsGrid}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    ...styles.itemCard,
                    ...(selectedItem?.id === item.id ? styles.itemCardSelected : {}),
                  }}
                  onClick={() => {
                    setSelectedItem(item);
                    setSelectedStyle(item.styles?.[0]);
                  }}
                  onMouseEnter={(e) => {
                    if (selectedItem?.id !== item.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedItem?.id !== item.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  <span style={styles.itemEmoji}>{item.emoji}</span>
                  <span style={styles.itemName}>{item.name}</span>
                </div>
              ))}
            </div>

            {/* Customization */}
            {selectedItem && (
              <div style={styles.customization}>
                <div style={styles.customizationTitle}>
                  Customize {selectedItem.name}
                </div>

                {selectedItem.colorizable && (
                  <>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>Color</div>
                    <div style={styles.colorGrid}>
                      {COLOR_PRESETS.map((preset) => (
                        <div
                          key={preset.name}
                          title={preset.name}
                          style={{
                            ...styles.colorSwatch,
                            backgroundColor: preset.color,
                            ...(selectedColor === preset.color ? styles.colorSwatchSelected : {}),
                          }}
                          onClick={() => setSelectedColor(preset.color)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {selectedItem.styles && selectedItem.styles.length > 0 && (
                  <>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 16, marginBottom: 8 }}>Style</div>
                    <div style={styles.styleGrid}>
                      {selectedItem.styles.map((style) => (
                        <button
                          key={style}
                          style={{
                            ...styles.styleButton,
                            ...(selectedStyle === style ? styles.styleButtonSelected : {}),
                          }}
                          onClick={() => setSelectedStyle(style)}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.previewText}>
              {selectedItem
                ? `Selected: ${selectedItem.name}${selectedStyle ? ` (${selectedStyle})` : ''}`
                : 'Select an item to place'
              }
            </span>
            <div style={styles.buttonGroup}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  opacity: selectedItem ? 1 : 0.5,
                  cursor: selectedItem ? 'pointer' : 'not-allowed',
                }}
                onClick={handlePlace}
                disabled={!selectedItem}
              >
                Place Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Export catalog data for use elsewhere
export { FURNITURE_CATALOG, FURNITURE_CATEGORIES, COLOR_PRESETS };

export default FurnitureCatalogOverlay;
