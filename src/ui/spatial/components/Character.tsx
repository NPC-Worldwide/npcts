/**
 * Character Component
 *
 * Renders an animated character sprite with direction-based animation.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type {
  CharacterState,
  CharacterDirection,
  SpriteSheets,
} from '../../../core/spatial';
import { getCurrentSprite, getDirectionRotation } from '../hooks/useCharacter';

// =============================================================================
// Component Props
// =============================================================================

interface CharacterProps {
  /** Current character state (position, direction, frame) */
  state: CharacterState;
  /** Sprite sheets for each direction */
  spriteSheets: SpriteSheets;
  /** Character width */
  width: number;
  /** Character height */
  height: number;
  /** Character name (for accessibility) */
  name?: string;
  /** Whether to use rotation or separate sprites per direction */
  useRotation?: boolean;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: () => void;
}

// =============================================================================
// Character Component
// =============================================================================

export const Character: React.FC<CharacterProps> = ({
  state,
  spriteSheets,
  width,
  height,
  name = 'Character',
  useRotation = false,
  className = '',
  style: customStyle,
  onClick,
}) => {
  const [loadedSprites, setLoadedSprites] = useState<
    Record<CharacterDirection, HTMLImageElement[]>
  >({
    up: [],
    down: [],
    left: [],
    right: [],
  });
  const [spritesLoaded, setSpritesLoaded] = useState(false);

  // Preload all sprite images
  useEffect(() => {
    const loaded: Record<CharacterDirection, HTMLImageElement[]> = {
      up: [],
      down: [],
      left: [],
      right: [],
    };
    let totalCount = 0;
    let loadedCount = 0;

    const directions: CharacterDirection[] = ['up', 'down', 'left', 'right'];

    directions.forEach((dir) => {
      const sprites = spriteSheets[dir] || [];
      totalCount += sprites.length;

      sprites.forEach((src, index) => {
        const img = new Image();
        img.onload = () => {
          loaded[dir][index] = img;
          loadedCount++;
          if (loadedCount === totalCount) {
            setLoadedSprites(loaded);
            setSpritesLoaded(true);
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalCount) {
            setLoadedSprites(loaded);
            setSpritesLoaded(true);
          }
        };
        img.src = src;
      });
    });

    // Handle case where there are no sprites
    if (totalCount === 0) {
      setSpritesLoaded(true);
    }
  }, [spriteSheets]);

  // Get current sprite URL
  const currentSpriteUrl = useMemo(() => {
    if (useRotation) {
      // Use 'down' sprites and rotate
      return getCurrentSprite(spriteSheets, 'down', state.frame);
    }
    return getCurrentSprite(spriteSheets, state.direction, state.frame);
  }, [spriteSheets, state.direction, state.frame, useRotation]);

  // Calculate rotation if using rotation mode
  const rotation = useMemo(() => {
    if (!useRotation) return 0;
    return getDirectionRotation(state.direction);
  }, [useRotation, state.direction]);

  const characterStyle = useMemo((): React.CSSProperties => {
    return {
      position: 'absolute',
      left: state.x,
      top: state.y,
      width,
      height,
      zIndex: 100,
      transition: state.isMoving ? 'none' : 'left 0.1s, top 0.1s',
      cursor: onClick ? 'pointer' : 'default',
      ...customStyle,
    };
  }, [state.x, state.y, state.isMoving, width, height, customStyle, onClick]);

  const spriteStyle = useMemo((): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      transform: useRotation ? `rotate(${rotation}deg)` : 'none',
      transition: 'transform 0.1s',
      imageRendering: 'pixelated', // For pixel art style
    };
  }, [useRotation, rotation]);

  // Render placeholder if sprites not loaded
  if (!spritesLoaded || !currentSpriteUrl) {
    return (
      <div
        className={`spatial-character spatial-character-placeholder ${className}`}
        style={characterStyle}
        role="img"
        aria-label={name}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#4a90d9',
            borderRadius: '50%',
            border: '2px solid #2d5a8a',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`spatial-character ${className}`}
      style={characterStyle}
      onClick={onClick}
      role="img"
      aria-label={name}
    >
      <img
        src={currentSpriteUrl}
        alt={name}
        style={spriteStyle}
        draggable={false}
      />

      {/* Optional name label */}
      {name && (
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '1px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Simple Character (Single Image)
// =============================================================================

interface SimpleCharacterProps {
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
  direction?: CharacterDirection;
  name?: string;
  className?: string;
  onClick?: () => void;
}

export const SimpleCharacter: React.FC<SimpleCharacterProps> = ({
  x,
  y,
  width,
  height,
  imageUrl,
  direction = 'down',
  name,
  className = '',
  onClick,
}) => {
  const rotation = getDirectionRotation(direction);

  return (
    <div
      className={`spatial-character-simple ${className}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex: 100,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
      role="img"
      aria-label={name}
    >
      <img
        src={imageUrl}
        alt={name || 'Character'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: `rotate(${rotation}deg)`,
          imageRendering: 'pixelated',
        }}
        draggable={false}
      />
    </div>
  );
};
