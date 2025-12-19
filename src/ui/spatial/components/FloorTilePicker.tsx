/**
 * FloorTilePicker Component
 *
 * Allows users to pick from built-in floor tiles, procedural patterns,
 * or upload their own images.
 */

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FloorTileOption {
  id: string;
  label: string;
  type: 'image' | 'pattern';
  /** For image tiles - the URL path */
  url?: string;
  /** For patterns - CSS background value */
  pattern?: string;
  /** For patterns - CSS background-size */
  patternSize?: string;
  /** Category for grouping */
  category: 'carpet' | 'stone' | 'wood' | 'tile' | 'pattern' | 'custom';
}

export interface FloorTilePickerProps {
  /** Currently selected tile/pattern */
  value?: string;
  /** Whether the current value is a pattern (vs image) */
  isPattern?: boolean;
  /** Called when a tile is selected */
  onSelect: (tile: FloorTileOption) => void;
  /** Called when user wants to upload custom image */
  onUploadCustom?: () => void;
  /** Base path for built-in tile images (default: /images/floor_tiles) */
  basePath?: string;
  /** Additional built-in tiles to include */
  additionalTiles?: FloorTileOption[];
}

// =============================================================================
// Built-in Tiles
// =============================================================================

const BUILT_IN_TILES: Omit<FloorTileOption, 'url'>[] = [
  // Carpets
  { id: 'carpet1', label: 'Carpet 1', type: 'image', category: 'carpet' },
  { id: 'carpet2', label: 'Carpet 2', type: 'image', category: 'carpet' },
  { id: 'carpet3', label: 'Carpet 3', type: 'image', category: 'carpet' },
  { id: 'carpet4', label: 'Carpet 4', type: 'image', category: 'carpet' },
  { id: 'carpet5', label: 'Carpet 5', type: 'image', category: 'carpet' },
  { id: 'carpet6', label: 'Carpet 6', type: 'image', category: 'carpet' },
  { id: 'carpet7', label: 'Carpet 7', type: 'image', category: 'carpet' },
  { id: 'carpet8', label: 'Carpet 8', type: 'image', category: 'carpet' },
  { id: 'carpet9', label: 'Carpet 9', type: 'image', category: 'carpet' },
  { id: 'carpet10', label: 'Carpet 10', type: 'image', category: 'carpet' },
  { id: 'carpet11', label: 'Carpet 11', type: 'image', category: 'carpet' },
  { id: 'carpet12', label: 'Carpet 12', type: 'image', category: 'carpet' },
  { id: 'carpet13', label: 'Carpet 13', type: 'image', category: 'carpet' },
  { id: 'carpet14', label: 'Carpet 14', type: 'image', category: 'carpet' },
  // Stone
  { id: 'stone1', label: 'Stone 1', type: 'image', category: 'stone' },
  { id: 'stone2', label: 'Stone 2', type: 'image', category: 'stone' },
  { id: 'stone3', label: 'Stone 3', type: 'image', category: 'stone' },
  { id: 'stone4', label: 'Stone 4', type: 'image', category: 'stone' },
  // Wood
  { id: 'wood1', label: 'Wood 1', type: 'image', category: 'wood' },
  { id: 'wood2', label: 'Wood 2', type: 'image', category: 'wood' },
  { id: 'wood3', label: 'Wood 3', type: 'image', category: 'wood' },
];

// Procedural patterns with customizable colors
const PATTERN_TEMPLATES: FloorTileOption[] = [
  {
    id: 'pattern-wood-planks',
    label: 'Wood Planks',
    type: 'pattern',
    category: 'pattern',
    pattern: `repeating-linear-gradient(
      90deg,
      #8b6914 0px,
      #a67c00 8px,
      #8b6914 10px,
      #6b4f0f 12px,
      #8b6914 14px
    )`,
    patternSize: '60px 100%',
  },
  {
    id: 'pattern-herringbone',
    label: 'Herringbone',
    type: 'pattern',
    category: 'pattern',
    pattern: `repeating-linear-gradient(
      45deg,
      #c4a35a 0px,
      #c4a35a 10px,
      #a68b4b 10px,
      #a68b4b 20px
    ),
    repeating-linear-gradient(
      -45deg,
      #c4a35a 0px,
      #c4a35a 10px,
      #a68b4b 10px,
      #a68b4b 20px
    )`,
    patternSize: '40px 40px',
  },
  {
    id: 'pattern-checkerboard',
    label: 'Checkerboard',
    type: 'pattern',
    category: 'pattern',
    pattern: `repeating-conic-gradient(
      #404040 0% 25%,
      #606060 0% 50%
    )`,
    patternSize: '40px 40px',
  },
  {
    id: 'pattern-marble',
    label: 'Marble',
    type: 'pattern',
    category: 'pattern',
    pattern: `linear-gradient(
      45deg,
      #f5f5f5 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      #f5f5f5 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      #f5f5f5 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      #f5f5f5 75%
    ),
    linear-gradient(#e0e0e0 0%, #d0d0d0 100%)`,
    patternSize: '30px 30px',
  },
  {
    id: 'pattern-concrete',
    label: 'Concrete',
    type: 'pattern',
    category: 'pattern',
    pattern: `linear-gradient(
      135deg,
      #9a9a9a 25%,
      #888888 25%,
      #888888 50%,
      #9a9a9a 50%,
      #9a9a9a 75%,
      #888888 75%
    )`,
    patternSize: '20px 20px',
  },
  {
    id: 'pattern-tiles-white',
    label: 'White Tiles',
    type: 'pattern',
    category: 'tile',
    pattern: `repeating-linear-gradient(
      0deg,
      #f8f8f8 0px,
      #f8f8f8 48px,
      #d0d0d0 48px,
      #d0d0d0 50px
    ),
    repeating-linear-gradient(
      90deg,
      #f8f8f8 0px,
      #f8f8f8 48px,
      #d0d0d0 48px,
      #d0d0d0 50px
    )`,
    patternSize: '50px 50px',
  },
  {
    id: 'pattern-tiles-terracotta',
    label: 'Terracotta',
    type: 'pattern',
    category: 'tile',
    pattern: `repeating-linear-gradient(
      0deg,
      #c45a3b 0px,
      #c45a3b 48px,
      #8b3d29 48px,
      #8b3d29 50px
    ),
    repeating-linear-gradient(
      90deg,
      #c45a3b 0px,
      #c45a3b 48px,
      #8b3d29 48px,
      #8b3d29 50px
    )`,
    patternSize: '50px 50px',
  },
  {
    id: 'pattern-hex',
    label: 'Hexagonal',
    type: 'pattern',
    category: 'tile',
    pattern: `radial-gradient(circle farthest-side at 0% 50%, #4a6670 23.5%, transparent 0) 21px 30px,
    radial-gradient(circle farthest-side at 0% 50%, #3d555d 24%, transparent 0) 19px 30px,
    linear-gradient(#4a6670 14%, transparent 0, transparent 85%, #4a6670 0) 0 0,
    linear-gradient(150deg, #4a6670 24%, #3d555d 0, #3d555d 26%, transparent 0, transparent 74%, #3d555d 0, #3d555d 76%, #4a6670 0) 0 0,
    linear-gradient(30deg, #4a6670 24%, #3d555d 0, #3d555d 26%, transparent 0, transparent 74%, #3d555d 0, #3d555d 76%, #4a6670 0) 0 0,
    linear-gradient(90deg, #3d555d 2%, #4a6670 0, #4a6670 98%, #3d555d 0%) 0 0,
    #4a6670`,
    patternSize: '40px 60px',
  },
  {
    id: 'pattern-carpet-texture',
    label: 'Carpet Texture',
    type: 'pattern',
    category: 'carpet',
    pattern: `radial-gradient(
      circle at 50% 50%,
      #5a4a3a 1px,
      transparent 1px
    ),
    linear-gradient(#6b5b4b 0%, #6b5b4b 100%)`,
    patternSize: '4px 4px',
  },
  {
    id: 'pattern-grass',
    label: 'Grass',
    type: 'pattern',
    category: 'pattern',
    pattern: `radial-gradient(
      circle at 50% 50%,
      #2d5016 1px,
      transparent 1px
    ),
    linear-gradient(#3a6b1e 0%, #3a6b1e 100%)`,
    patternSize: '3px 3px',
  },
];

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  tab: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    color: '#888',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto',
    padding: 4,
  },
  tile: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 8,
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    overflow: 'hidden',
    position: 'relative',
  },
  tileSelected: {
    borderColor: '#6366f1',
    boxShadow: '0 0 0 2px rgba(99,102,241,0.3)',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  uploadTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'rgba(255,255,255,0.05)',
    border: '2px dashed rgba(255,255,255,0.2)',
    color: '#888',
    fontSize: 11,
  },
  uploadIcon: {
    fontSize: 20,
  },
};

// =============================================================================
// Component
// =============================================================================

type TabKey = 'carpet' | 'stone' | 'wood' | 'tile' | 'pattern';

export const FloorTilePicker: React.FC<FloorTilePickerProps> = ({
  value,
  isPattern = false,
  onSelect,
  onUploadCustom,
  basePath = '/images/floor_tiles',
  additionalTiles = [],
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('carpet');

  // Build full tile list with URLs
  const allTiles: FloorTileOption[] = [
    ...BUILT_IN_TILES.map(tile => ({
      ...tile,
      url: `${basePath}/${tile.id}.png`,
    })),
    ...PATTERN_TEMPLATES,
    ...additionalTiles,
  ];

  // Filter tiles by category
  const filteredTiles = allTiles.filter(tile => {
    if (activeTab === 'pattern') {
      return tile.type === 'pattern' && tile.category === 'pattern';
    }
    if (activeTab === 'tile') {
      return tile.category === 'tile';
    }
    return tile.category === activeTab && tile.type === 'image';
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'carpet', label: 'Carpet' },
    { key: 'wood', label: 'Wood' },
    { key: 'stone', label: 'Stone' },
    { key: 'tile', label: 'Tiles' },
    { key: 'pattern', label: 'Patterns' },
  ];

  const isSelected = (tile: FloorTileOption) => {
    if (tile.type === 'pattern' && isPattern) {
      return tile.pattern === value;
    }
    return tile.url === value;
  };

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tile Grid */}
      <div style={styles.grid}>
        {/* Upload custom option */}
        {onUploadCustom && (
          <div
            style={{ ...styles.tile, ...styles.uploadTile }}
            onClick={onUploadCustom}
            title="Upload custom image"
          >
            <span style={styles.uploadIcon}>+</span>
            <span>Upload</span>
          </div>
        )}

        {/* Tile options */}
        {filteredTiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => onSelect(tile)}
            style={{
              ...styles.tile,
              ...(isSelected(tile) ? styles.tileSelected : {}),
            }}
            title={tile.label}
          >
            {tile.type === 'image' ? (
              <img
                src={tile.url}
                alt={tile.label}
                style={styles.tileImage}
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: tile.pattern,
                  backgroundSize: tile.patternSize,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloorTilePicker;
export { BUILT_IN_TILES, PATTERN_TEMPLATES };
