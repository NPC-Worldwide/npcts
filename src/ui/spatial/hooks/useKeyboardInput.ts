/**
 * useKeyboardInput Hook
 *
 * Handles keyboard input for character movement and UI controls.
 * Properly respects when forms/menus are open.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { CharacterDirection, Application } from '../../../core/spatial';

interface KeyboardCallbacks {
  /** Called when movement keys are pressed (WASD or arrows) */
  onMove?: (dx: number, dy: number, direction: CharacterDirection) => void;
  /** Called when movement keys are released */
  onMoveEnd?: () => void;
  /** Called when 'O' key is pressed (open/interact) */
  onInteract?: () => void;
  /** Called when 'E' key is pressed when NOT near an app (add app) */
  onAdd?: () => void;
  /** Called when 'E' key is pressed when NEAR an app (edit app) */
  onEditApp?: (app: Application) => void;
  /** Called when 'F' key is pressed (toggle edit mode) */
  onEditMode?: () => void;
  /** Called when 'R' key is pressed (add room) */
  onAddRoom?: () => void;
  /** Called when 'M' key is pressed (toggle menu/key legend) */
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
  /** Whether any form overlay is open (blocks most keys) */
  formsOpen?: boolean;
  /** Whether app menu is open (blocks most keys) */
  menuOpen?: boolean;
  /** The app the character is currently near (affects 'e' key behavior) */
  nearbyApp?: Application | null;
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
    onEditApp,
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
    formsOpen = false,
    menuOpen = false,
    nearbyApp = null,
  } = options;

  const pressedKeysRef = useRef<PressedKeys>({});
  const optionsRef = useRef({
    onMove,
    onMoveEnd,
    onInteract,
    onAdd,
    onEditApp,
    onEditMode,
    onAddRoom,
    onMenu,
    onHelp,
    onSpace,
    onEscape,
    onDelete,
    onCustomKey,
    editMode,
    formsOpen,
    menuOpen,
    nearbyApp,
  });

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = {
      onMove,
      onMoveEnd,
      onInteract,
      onAdd,
      onEditApp,
      onEditMode,
      onAddRoom,
      onMenu,
      onHelp,
      onSpace,
      onEscape,
      onDelete,
      onCustomKey,
      editMode,
      formsOpen,
      menuOpen,
      nearbyApp,
    };
  }, [
    onMove,
    onMoveEnd,
    onInteract,
    onAdd,
    onEditApp,
    onEditMode,
    onAddRoom,
    onMenu,
    onHelp,
    onSpace,
    onEscape,
    onDelete,
    onCustomKey,
    editMode,
    formsOpen,
    menuOpen,
    nearbyApp,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key.toLowerCase();
      const opts = optionsRef.current;

      // Ignore keys with Ctrl, Alt, or Meta modifiers (let browser/electron handle them)
      // Exception: Ctrl+D for delete, Ctrl+Backspace/Delete
      const hasModifier = event.ctrlKey || event.altKey || event.metaKey;
      const isDeleteCombo = hasModifier && (key === 'd' || key === 'delete' || key === 'backspace');

      if (hasModifier && !isDeleteCombo) {
        return; // Let browser handle Ctrl+R, Ctrl+Shift+R, etc.
      }

      // When forms are open, ONLY handle Escape
      if (opts.formsOpen) {
        if (key === 'escape') {
          event.preventDefault();
          opts.onEscape?.();
        }
        return; // Block ALL other keys when forms are open
      }

      // When menu is open, only handle Escape and 'o' to close
      if (opts.menuOpen) {
        if (key === 'escape' || key === 'o') {
          event.preventDefault();
          opts.onEscape?.();
        }
        return; // Block ALL other keys when menu is open
      }

      // Prevent default for game keys (only when no modifiers)
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

      // When in edit mode, only 'f' works to exit (plus movement is blocked)
      if (opts.editMode) {
        if (key === 'f') {
          opts.onEditMode?.();
        }
        return; // Block other keys in edit mode
      }

      // Handle movement keys
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

      if (direction && opts.onMove) {
        opts.onMove(dx, dy, direction);
        return;
      }

      // Handle other keys
      switch (key) {
        case 'o':
          console.log('o key pressed, calling onInteract');
          opts.onInteract?.();
          break;
        case 'e':
          // Differentiate: near app = edit, not near app = add
          if (opts.nearbyApp) {
            opts.onEditApp?.(opts.nearbyApp);
          } else {
            opts.onAdd?.();
          }
          break;
        case 'f':
          opts.onEditMode?.();
          break;
        case 'r':
          // Only allow adding room when NOT near an app
          if (!opts.nearbyApp) {
            opts.onAddRoom?.();
          }
          break;
        case 'm':
          opts.onMenu?.();
          break;
        case 'h':
        case '?':
          opts.onHelp?.();
          break;
        case ' ':
          opts.onSpace?.();
          break;
        case 'escape':
          opts.onEscape?.();
          break;
        default:
          // Handle Ctrl+Delete/Backspace (delete app)
          if ((key === 'delete' || key === 'backspace') && event.ctrlKey) {
            opts.onDelete?.();
          } else {
            opts.onCustomKey?.(key, event);
          }
      }
    },
    [enabled, moveSpeed]
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
        optionsRef.current.onMoveEnd?.();
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
