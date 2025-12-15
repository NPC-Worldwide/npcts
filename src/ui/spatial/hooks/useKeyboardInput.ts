/**
 * useKeyboardInput Hook
 *
 * Handles keyboard input for character movement and UI controls.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { CharacterDirection } from '../../../core/spatial';

interface KeyboardCallbacks {
  /** Called when movement keys are pressed (WASD or arrows) */
  onMove?: (dx: number, dy: number, direction: CharacterDirection) => void;
  /** Called when movement keys are released */
  onMoveEnd?: () => void;
  /** Called when 'O' key is pressed (open/interact) */
  onInteract?: () => void;
  /** Called when 'E' key is pressed (add/edit) */
  onAdd?: () => void;
  /** Called when 'F' key is pressed (toggle edit mode) */
  onEditMode?: () => void;
  /** Called when 'R' key is pressed (add room) */
  onAddRoom?: () => void;
  /** Called when 'M' key is pressed (toggle menu/settings) */
  onMenu?: () => void;
  /** Called when 'H' or '?' key is pressed (show help) */
  onHelp?: () => void;
  /** Called when 'Space' key is pressed */
  onSpace?: () => void;
  /** Called when 'Escape' key is pressed */
  onEscape?: () => void;
  /** Called when 'Delete' or 'Backspace' is pressed (with Ctrl) */
  onDelete?: () => void;
  /** Custom key handler for any other keys */
  onCustomKey?: (key: string, event: KeyboardEvent) => void;
}

interface UseKeyboardInputOptions extends KeyboardCallbacks {
  /** Movement speed in pixels per key press */
  moveSpeed?: number;
  /** Whether keyboard input is enabled */
  enabled?: boolean;
  /** Whether edit mode is active (changes some key behaviors) */
  editMode?: boolean;
}

interface PressedKeys {
  [key: string]: boolean;
}

export function useKeyboardInput(options: UseKeyboardInputOptions): void {
  const {
    onMove,
    onMoveEnd,
    onInteract,
    onAdd,
    onEditMode,
    onAddRoom,
    onMenu,
    onHelp,
    onSpace,
    onEscape,
    onDelete,
    onCustomKey,
    moveSpeed = 10,
    enabled = true,
    editMode = false,
  } = options;

  const pressedKeysRef = useRef<PressedKeys>({});
  const callbacksRef = useRef({
    onMove,
    onMoveEnd,
    onInteract,
    onAdd,
    onEditMode,
    onAddRoom,
    onMenu,
    onHelp,
    onSpace,
    onEscape,
    onDelete,
    onCustomKey,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onMove,
      onMoveEnd,
      onInteract,
      onAdd,
      onEditMode,
      onAddRoom,
      onMenu,
      onHelp,
      onSpace,
      onEscape,
      onDelete,
      onCustomKey,
    };
  }, [
    onMove,
    onMoveEnd,
    onInteract,
    onAdd,
    onEditMode,
    onAddRoom,
    onMenu,
    onHelp,
    onSpace,
    onEscape,
    onDelete,
    onCustomKey,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key.toLowerCase();
      const callbacks = callbacksRef.current;

      // Prevent default for game keys
      const gameKeys = [
        'w', 'a', 's', 'd',
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'o', 'e', 'f', 'r', 'm', 'h', '?', ' ', 'escape',
      ];
      if (gameKeys.includes(key)) {
        event.preventDefault();
      }

      // Track pressed keys
      pressedKeysRef.current[key] = true;

      // Handle movement keys (only if not in edit mode or allowed)
      if (!editMode) {
        let dx = 0;
        let dy = 0;
        let direction: CharacterDirection | null = null;

        switch (key) {
          case 'w':
          case 'arrowup':
            dy = -moveSpeed;
            direction = 'up';
            break;
          case 's':
          case 'arrowdown':
            dy = moveSpeed;
            direction = 'down';
            break;
          case 'a':
          case 'arrowleft':
            dx = -moveSpeed;
            direction = 'left';
            break;
          case 'd':
          case 'arrowright':
            dx = moveSpeed;
            direction = 'right';
            break;
        }

        if (direction && callbacks.onMove) {
          callbacks.onMove(dx, dy, direction);
          return;
        }
      }

      // Handle other keys
      switch (key) {
        case 'o':
          callbacks.onInteract?.();
          break;
        case 'e':
          callbacks.onAdd?.();
          break;
        case 'f':
          callbacks.onEditMode?.();
          break;
        case 'r':
          callbacks.onAddRoom?.();
          break;
        case 'm':
          callbacks.onMenu?.();
          break;
        case 'h':
        case '?':
          callbacks.onHelp?.();
          break;
        case ' ':
          callbacks.onSpace?.();
          break;
        case 'escape':
          callbacks.onEscape?.();
          break;
        default:
          // Handle Ctrl+Delete/Backspace
          if ((key === 'delete' || key === 'backspace') && event.ctrlKey) {
            callbacks.onDelete?.();
          } else {
            callbacks.onCustomKey?.(key, event);
          }
      }
    },
    [enabled, editMode, moveSpeed]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      pressedKeysRef.current[key] = false;

      // Check if all movement keys are released
      const movementKeys = [
        'w', 's', 'a', 'd',
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      ];
      const anyMovementPressed = movementKeys.some(
        (k) => pressedKeysRef.current[k]
      );

      if (!anyMovementPressed) {
        callbacksRef.current.onMoveEnd?.();
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);
}

/**
 * Check if a specific key is currently pressed
 */
export function isKeyPressed(
  pressedKeys: PressedKeys,
  key: string
): boolean {
  return !!pressedKeys[key.toLowerCase()];
}

/**
 * Get the movement direction from pressed keys
 */
export function getMovementFromKeys(
  pressedKeys: PressedKeys,
  speed: number
): { dx: number; dy: number; direction: CharacterDirection | null } {
  let dx = 0;
  let dy = 0;
  let direction: CharacterDirection | null = null;

  if (pressedKeys['w'] || pressedKeys['arrowup']) {
    dy = -speed;
    direction = 'up';
  }
  if (pressedKeys['s'] || pressedKeys['arrowdown']) {
    dy = speed;
    direction = 'down';
  }
  if (pressedKeys['a'] || pressedKeys['arrowleft']) {
    dx = -speed;
    direction = 'left';
  }
  if (pressedKeys['d'] || pressedKeys['arrowright']) {
    dx = speed;
    direction = 'right';
  }

  return { dx, dy, direction };
}
