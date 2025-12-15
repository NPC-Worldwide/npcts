/**
 * useCharacter Hook
 *
 * Manages character state including position, direction, and animation frames.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  CharacterDirection,
  CharacterState,
  Vector2D,
  SpriteSheets,
} from '../../../core/spatial';

interface UseCharacterOptions {
  initialX: number;
  initialY: number;
  initialDirection?: CharacterDirection;
  totalFrames?: number;
}

interface UseCharacterReturn extends CharacterState {
  move: (dx: number, dy: number) => void;
  setPosition: (x: number, y: number) => void;
  setDirection: (direction: CharacterDirection) => void;
  stopMoving: () => void;
  nextFrame: () => void;
  resetFrame: () => void;
}

export function useCharacter(options: UseCharacterOptions): UseCharacterReturn {
  const {
    initialX,
    initialY,
    initialDirection = 'down',
    totalFrames = 3,
  } = options;

  const [state, setState] = useState<CharacterState>({
    x: initialX,
    y: initialY,
    direction: initialDirection,
    frame: 0,
    isMoving: false,
  });

  const totalFramesRef = useRef(totalFrames);

  /**
   * Move the character by delta x and y
   * Automatically determines direction based on movement
   */
  const move = useCallback((dx: number, dy: number) => {
    let direction: CharacterDirection = 'down';

    // Determine direction based on movement
    if (dy < 0) direction = 'up';
    else if (dy > 0) direction = 'down';
    else if (dx < 0) direction = 'left';
    else if (dx > 0) direction = 'right';

    setState((prev) => {
      // Cycle frame if same direction
      const sameDirection = prev.direction === direction;
      const newFrame = sameDirection
        ? (prev.frame + 1) % totalFramesRef.current
        : 0;

      return {
        x: prev.x + dx,
        y: prev.y + dy,
        direction,
        frame: newFrame,
        isMoving: true,
      };
    });
  }, []);

  /**
   * Set the character's position directly
   */
  const setPosition = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      x,
      y,
    }));
  }, []);

  /**
   * Set the character's direction without moving
   */
  const setDirection = useCallback((direction: CharacterDirection) => {
    setState((prev) => ({
      ...prev,
      direction,
      frame: 0,
    }));
  }, []);

  /**
   * Stop the character's movement animation
   */
  const stopMoving = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMoving: false,
    }));
  }, []);

  /**
   * Advance to the next animation frame
   */
  const nextFrame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      frame: (prev.frame + 1) % totalFramesRef.current,
    }));
  }, []);

  /**
   * Reset the animation frame to 0
   */
  const resetFrame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      frame: 0,
    }));
  }, []);

  return {
    ...state,
    move,
    setPosition,
    setDirection,
    stopMoving,
    nextFrame,
    resetFrame,
  };
}

/**
 * Get the rotation transform for a character direction
 */
export function getDirectionRotation(direction: CharacterDirection): number {
  switch (direction) {
    case 'up':
      return 180;
    case 'down':
      return 0;
    case 'left':
      return 90;
    case 'right':
      return -90;
    default:
      return 0;
  }
}

/**
 * Get the sprite image for the current character state
 */
export function getCurrentSprite(
  spriteSheets: SpriteSheets,
  direction: CharacterDirection,
  frame: number
): string | undefined {
  const sprites = spriteSheets[direction];
  if (!sprites || sprites.length === 0) return undefined;
  return sprites[frame % sprites.length];
}
