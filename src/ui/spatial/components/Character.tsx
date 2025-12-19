/**
 * Character Component
 *
 * Renders an animated character sprite with direction-based animation.
 * Supports avatar customization including color tints, accessories, and effects.
 */

import React, { useMemo, useState, useEffect } from 'react';
import type {
  CharacterState,
  CharacterDirection,
  SpriteSheets,
} from '../../../core/spatial';
import { getCurrentSprite, getDirectionRotation } from '../hooks/useCharacter';

// =============================================================================
// Avatar Settings Type
// =============================================================================

export interface AvatarSettings {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  size: number; // 0.5 to 2.0 scale
  showNameTag: boolean;
  nameTagColor: string;
  trailEffect: 'none' | 'sparkle' | 'glow' | 'shadow';
  accessory: 'none' | 'hat' | 'glasses' | 'crown' | 'halo';
}

// Accessory emojis
const ACCESSORY_EMOJIS: Record<string, string> = {
  hat: '🎩',
  glasses: '👓',
  crown: '👑',
  halo: '😇',
};

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
  /** Avatar customization settings */
  avatarSettings?: AvatarSettings;
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
  avatarSettings,
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

  // Calculate scaled dimensions based on avatar settings
  const scale = avatarSettings?.size ?? 1.0;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

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

  // Generate color filter for tinting sprite
  const colorFilter = useMemo(() => {
    if (!avatarSettings?.primaryColor) return 'none';

    // Convert hex to hue rotation
    // This creates a tint effect on the sprite
    const hex = avatarSettings.primaryColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Calculate hue from RGB
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;

    if (max !== min) {
      const d = max - min;
      if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) hue = ((b - r) / d + 2) * 60;
      else hue = ((r - g) / d + 4) * 60;
    }

    // Aurelianos is roughly blue (hue ~200), so calculate offset
    const baseHue = 200;
    const hueRotate = hue - baseHue;

    // Also adjust saturation based on color intensity
    const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
    const saturationAdjust = saturation / 50; // normalize around 100%

    return `hue-rotate(${hueRotate}deg) saturate(${saturationAdjust})`;
  }, [avatarSettings?.primaryColor]);

  // Shadow/glow effect based on trail setting
  const effectShadow = useMemo(() => {
    if (!avatarSettings) return 'none';

    switch (avatarSettings.trailEffect) {
      case 'glow':
        return `0 0 20px ${avatarSettings.primaryColor}80, 0 0 40px ${avatarSettings.primaryColor}40`;
      case 'shadow':
        return '4px 4px 12px rgba(0,0,0,0.6)';
      case 'sparkle':
        return `0 0 10px ${avatarSettings.primaryColor}60`;
      default:
        return 'none';
    }
  }, [avatarSettings]);

  const characterStyle = useMemo((): React.CSSProperties => {
    // Adjust position to center scaled character
    const offsetX = (scaledWidth - width) / 2;
    const offsetY = (scaledHeight - height) / 2;

    return {
      position: 'absolute',
      left: state.x - offsetX,
      top: state.y - offsetY,
      width: scaledWidth,
      height: scaledHeight,
      zIndex: 100,
      transition: state.isMoving ? 'none' : 'left 0.1s, top 0.1s',
      cursor: onClick ? 'pointer' : 'default',
      ...customStyle,
    };
  }, [state.x, state.y, state.isMoving, scaledWidth, scaledHeight, width, height, customStyle, onClick]);

  const spriteStyle = useMemo((): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      transform: useRotation ? `rotate(${rotation}deg)` : 'none',
      transition: 'transform 0.1s',
      imageRendering: 'pixelated', // For pixel art style
      filter: colorFilter,
      boxShadow: effectShadow,
    };
  }, [useRotation, rotation, colorFilter, effectShadow]);

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

  // Determine display name
  const displayName = avatarSettings?.name || name;
  const showName = avatarSettings ? avatarSettings.showNameTag : !!name;
  const nameColor = avatarSettings?.nameTagColor || '#fff';

  return (
    <>
      {/* Sparkle effect keyframes */}
      {avatarSettings?.trailEffect === 'sparkle' && (
        <style>{`
          @keyframes character-sparkle {
            0%, 100% { opacity: 0.3; transform: scale(0.8) translateY(0); }
            50% { opacity: 1; transform: scale(1.2) translateY(-3px); }
          }
        `}</style>
      )}

      <div
        className={`spatial-character ${className}`}
        style={characterStyle}
        onClick={onClick}
        role="img"
        aria-label={displayName}
      >
        {/* Accessory above character */}
        {avatarSettings?.accessory && avatarSettings.accessory !== 'none' && (
          <div
            style={{
              position: 'absolute',
              top: avatarSettings.accessory === 'halo' ? -8 : -20,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: avatarSettings.accessory === 'halo' ? 28 : 24,
              zIndex: 101,
              pointerEvents: 'none',
              filter: avatarSettings.accessory === 'crown'
                ? 'drop-shadow(0 2px 4px rgba(255,215,0,0.5))'
                : avatarSettings.accessory === 'halo'
                ? 'drop-shadow(0 0 8px rgba(255,255,200,0.8))'
                : 'none',
            }}
          >
            {ACCESSORY_EMOJIS[avatarSettings.accessory]}
          </div>
        )}

        {/* Sparkle particles */}
        {avatarSettings?.trailEffect === 'sparkle' && (
          <>
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                fontSize: 14,
                animation: 'character-sparkle 1s infinite',
                pointerEvents: 'none',
              }}
            >
              ✨
            </span>
            <span
              style={{
                position: 'absolute',
                bottom: 5,
                left: -8,
                fontSize: 12,
                animation: 'character-sparkle 1s infinite 0.3s',
                pointerEvents: 'none',
              }}
            >
              ✨
            </span>
            <span
              style={{
                position: 'absolute',
                top: '40%',
                right: -10,
                fontSize: 10,
                animation: 'character-sparkle 1s infinite 0.6s',
                pointerEvents: 'none',
              }}
            >
              ✨
            </span>
          </>
        )}

        <img
          src={currentSpriteUrl}
          alt={displayName}
          style={spriteStyle}
          draggable={false}
        />

        {/* Name tag */}
        {showName && displayName && (
          <div
            style={{
              position: 'absolute',
              bottom: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 11,
              color: nameColor,
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '1px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {displayName}
          </div>
        )}
      </div>
    </>
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
