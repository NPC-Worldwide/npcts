/**
 * FloorPattern Component
 *
 * Renders a tessellated floor pattern using either
 * an image or a procedural pattern.
 */

import React, { useMemo, useState, useEffect } from 'react';

// =============================================================================
// Built-in Floor Patterns
// =============================================================================

type FloorPatternType =
  | 'wood'
  | 'tile'
  | 'carpet'
  | 'concrete'
  | 'marble'
  | 'checkerboard';

const FLOOR_PATTERNS: Record<FloorPatternType, string> = {
  wood: `
    repeating-linear-gradient(
      90deg,
      #deb887 0px,
      #d2b48c 20px,
      #c19a6b 22px,
      #deb887 24px
    )
  `,
  tile: `
    repeating-linear-gradient(
      0deg,
      #e8e8e8 0px,
      #e8e8e8 48px,
      #d0d0d0 48px,
      #d0d0d0 50px
    ),
    repeating-linear-gradient(
      90deg,
      #e8e8e8 0px,
      #e8e8e8 48px,
      #d0d0d0 48px,
      #d0d0d0 50px
    )
  `,
  carpet: `
    radial-gradient(
      circle at 50% 50%,
      #6b5b4f 1px,
      transparent 1px
    ),
    linear-gradient(#8b7355 0%, #8b7355 100%)
  `,
  concrete: `
    linear-gradient(
      135deg,
      #b0b0b0 25%,
      #a0a0a0 25%,
      #a0a0a0 50%,
      #b0b0b0 50%,
      #b0b0b0 75%,
      #a0a0a0 75%
    )
  `,
  marble: `
    linear-gradient(
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
    linear-gradient(#e8e8e8 0%, #e8e8e8 100%)
  `,
  checkerboard: `
    repeating-conic-gradient(
      #404040 0% 25%,
      #606060 0% 50%
    )
  `,
};

const FLOOR_PATTERN_SIZES: Record<FloorPatternType, string> = {
  wood: '100px 100px',
  tile: '50px 50px',
  carpet: '4px 4px, 100% 100%',
  concrete: '20px 20px',
  marble: '20px 20px, 20px 20px, 20px 20px, 20px 20px, 100% 100%',
  checkerboard: '40px 40px',
};

// =============================================================================
// Component Props
// =============================================================================

interface FloorPatternProps {
  /** Image URL for custom floor texture */
  imageUrl?: string;
  /** Built-in pattern type (used if no imageUrl) */
  pattern?: FloorPatternType;
  /** Width of the floor area */
  width: number;
  /** Height of the floor area */
  height: number;
  /** X offset (for walls) */
  offsetX?: number;
  /** Y offset (for walls) */
  offsetY?: number;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

// =============================================================================
// FloorPattern Component
// =============================================================================

export const FloorPattern: React.FC<FloorPatternProps> = ({
  imageUrl,
  pattern = 'wood',
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  className = '',
  style: customStyle,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Preload image if provided
  useEffect(() => {
    if (!imageUrl) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  const floorStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: offsetX,
      top: offsetY,
      width: width - offsetX * 2,
      height: height - offsetY * 2,
      zIndex: 1,
      ...customStyle,
    };

    // Use image if provided and loaded
    if (imageUrl && imageLoaded && !imageError) {
      return {
        ...baseStyle,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
      };
    }

    // Use procedural pattern
    const patternCss = FLOOR_PATTERNS[pattern];
    const patternSize = FLOOR_PATTERN_SIZES[pattern];

    return {
      ...baseStyle,
      background: patternCss,
      backgroundSize: patternSize,
    };
  }, [
    imageUrl,
    imageLoaded,
    imageError,
    pattern,
    width,
    height,
    offsetX,
    offsetY,
    customStyle,
  ]);

  return <div className={`spatial-floor ${className}`} style={floorStyle} />;
};

// =============================================================================
// Tessellated Image Floor
// =============================================================================

interface TessellatedFloorProps {
  imageUrl: string;
  tileWidth: number;
  tileHeight: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
}

export const TessellatedFloor: React.FC<TessellatedFloorProps> = ({
  imageUrl,
  tileWidth,
  tileHeight,
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = imageUrl;
  }, [imageUrl]);

  if (!imageLoaded) {
    return (
      <FloorPattern
        width={width}
        height={height}
        offsetX={offsetX}
        offsetY={offsetY}
        pattern="wood"
        className={className}
      />
    );
  }

  // Calculate number of tiles needed
  const cols = Math.ceil((width - offsetX * 2) / tileWidth);
  const rows = Math.ceil((height - offsetY * 2) / tileHeight);

  return (
    <div
      className={`spatial-tessellated-floor ${className}`}
      style={{
        position: 'absolute',
        left: offsetX,
        top: offsetY,
        width: width - offsetX * 2,
        height: height - offsetY * 2,
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => (
          <img
            key={`${row}-${col}`}
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              left: col * tileWidth,
              top: row * tileHeight,
              width: tileWidth,
              height: tileHeight,
              objectFit: 'cover',
            }}
          />
        ))
      )}
    </div>
  );
};

// =============================================================================
// Exports
// =============================================================================

export { FLOOR_PATTERNS, FLOOR_PATTERN_SIZES };
export type { FloorPatternType };
