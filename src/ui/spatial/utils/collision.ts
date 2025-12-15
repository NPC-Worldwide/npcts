/**
 * Collision Detection Utilities
 *
 * Provides AABB (Axis-Aligned Bounding Box) collision detection
 * for walls, doors, and applications in spatial UI systems.
 */

import type {
  BoundingBox,
  Wall,
  Door,
  Application,
  CollisionCheckResult,
  Dimensions,
  Vector2D,
} from '../../../core/spatial';

/**
 * Check if two axis-aligned bounding boxes overlap
 */
export function checkAABBCollision(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check if a position collides with any wall
 * Returns true if NO collision (can move), false if collision detected
 */
export function checkWallCollision(
  position: Vector2D,
  characterSize: Dimensions,
  walls: Record<string, Wall>
): boolean {
  const characterBox: BoundingBox = {
    x: position.x,
    y: position.y,
    width: characterSize.width,
    height: characterSize.height,
  };

  for (const wallName in walls) {
    const wall = walls[wallName];
    if (checkAABBCollision(characterBox, wall)) {
      return false; // Collision detected, cannot move
    }
  }
  return true; // No collision, can move
}

/**
 * Check if a position collides with any door
 * Returns true if collision detected
 */
export function checkDoorCollision(
  position: Vector2D,
  characterSize: Dimensions,
  doors: Record<string, Door>
): boolean {
  const characterBox: BoundingBox = {
    x: position.x,
    y: position.y,
    width: characterSize.width,
    height: characterSize.height,
  };

  for (const doorName in doors) {
    const door = doors[doorName];
    if (checkAABBCollision(characterBox, door)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the door that the character is colliding with
 * Returns the door object if collision, null otherwise
 */
export function getCollidingDoor(
  position: Vector2D,
  characterSize: Dimensions,
  doors: Record<string, Door>
): { door: Door; name: string } | null {
  const characterBox: BoundingBox = {
    x: position.x,
    y: position.y,
    width: characterSize.width,
    height: characterSize.height,
  };

  for (const doorName in doors) {
    const door = doors[doorName];
    if (checkAABBCollision(characterBox, door)) {
      return { door, name: doorName };
    }
  }
  return null;
}

/**
 * Get the application that the character is colliding with
 * Uses center-distance based collision (more forgiving than AABB)
 */
export function getCollidingApp(
  position: Vector2D,
  characterSize: Dimensions,
  applications: Record<string, Application>
): { app: Application; name: string } | null {
  if (!applications) return null;

  // Character center
  const characterCenterX = position.x + characterSize.width / 2;
  const characterCenterY = position.y + characterSize.height / 2;

  for (const appName in applications) {
    const app = applications[appName];

    // App center
    const appCenterX = app.x + app.width / 2;
    const appCenterY = app.y + app.height / 2;

    // Check if the distance between centers is less than sum of half-sizes
    const collisionX =
      Math.abs(characterCenterX - appCenterX) <
      (characterSize.width + app.width) / 2;
    const collisionY =
      Math.abs(characterCenterY - appCenterY) <
      (characterSize.height + app.height) / 2;

    if (collisionX && collisionY) {
      return { app, name: appName };
    }
  }

  return null;
}

/**
 * Check all collisions at a position
 */
export function checkAllCollisions(
  position: Vector2D,
  characterSize: Dimensions,
  walls: Record<string, Wall>,
  doors: Record<string, Door>,
  applications: Record<string, Application>
): {
  canMove: boolean;
  collidingWall: Wall | null;
  collidingDoor: { door: Door; name: string } | null;
  collidingApp: { app: Application; name: string } | null;
} {
  const characterBox: BoundingBox = {
    x: position.x,
    y: position.y,
    width: characterSize.width,
    height: characterSize.height,
  };

  let collidingWall: Wall | null = null;
  let canMove = true;

  // Check walls
  for (const wallName in walls) {
    const wall = walls[wallName];
    if (checkAABBCollision(characterBox, wall)) {
      collidingWall = wall;
      canMove = false;
      break;
    }
  }

  // Check doors
  const collidingDoor = getCollidingDoor(position, characterSize, doors);

  // Check applications
  const collidingApp = getCollidingApp(position, characterSize, applications);

  return {
    canMove,
    collidingWall,
    collidingDoor,
    collidingApp,
  };
}

/**
 * Find the corresponding door in the destination room
 * Used for room transitions to place the character at the correct door
 */
export function findCorrespondingDoor(
  sourceRoom: string,
  currentDoor: Door,
  destinationDoors: Record<string, Door>
): { door: Door; name: string } | null {
  if (!destinationDoors) return null;

  // Map opposite orientations
  const oppositeOrientation: Record<string, string> = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  };

  for (const doorName in destinationDoors) {
    const door = destinationDoors[doorName];
    if (
      door.leadsTo === sourceRoom &&
      door.orientation === oppositeOrientation[currentDoor.orientation]
    ) {
      return { door, name: doorName };
    }
  }

  return null;
}

/**
 * Calculate the character's new position when entering through a door
 */
export function calculateDoorEntryPosition(
  door: Door,
  characterSize: Dimensions,
  offset: number = 10
): Vector2D {
  switch (door.orientation) {
    case 'up':
      // Entering from top, place below the door
      return {
        x: door.x + door.width / 2 - characterSize.width / 2,
        y: door.y + door.height + offset,
      };
    case 'down':
      // Entering from bottom, place above the door
      return {
        x: door.x + door.width / 2 - characterSize.width / 2,
        y: door.y - characterSize.height - offset,
      };
    case 'left':
      // Entering from left, place to the right of the door
      return {
        x: door.x + door.width + offset,
        y: door.y + door.height / 2 - characterSize.height / 2,
      };
    case 'right':
      // Entering from right, place to the left of the door
      return {
        x: door.x - characterSize.width - offset,
        y: door.y + door.height / 2 - characterSize.height / 2,
      };
    default:
      return { x: door.x, y: door.y };
  }
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBounds(point: Vector2D, bounds: BoundingBox): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Get the element at a specific point (for click/tap detection)
 */
export function getElementAtPoint(
  point: Vector2D,
  walls: Record<string, Wall>,
  doors: Record<string, Door>,
  applications: Record<string, Application>
): CollisionCheckResult {
  // Check applications first (they're on top)
  for (const appName in applications) {
    const app = applications[appName];
    if (isPointInBounds(point, app)) {
      return { collided: true, element: app, elementName: appName };
    }
  }

  // Check doors
  for (const doorName in doors) {
    const door = doors[doorName];
    if (isPointInBounds(point, door)) {
      return { collided: true, element: door, elementName: doorName };
    }
  }

  // Check walls
  for (const wallName in walls) {
    const wall = walls[wallName];
    if (isPointInBounds(point, wall)) {
      return { collided: true, element: wall, elementName: wallName };
    }
  }

  return { collided: false };
}
