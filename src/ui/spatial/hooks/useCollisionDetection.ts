/**
 * useCollisionDetection Hook
 *
 * React hook wrapper for collision detection utilities.
 */

import { useCallback } from 'react';
import type {
  Wall,
  Door,
  Application,
  Dimensions,
  Vector2D,
} from '../../../core/spatial';
import {
  checkWallCollision,
  checkDoorCollision,
  getCollidingDoor,
  getCollidingApp,
  checkAllCollisions,
  findCorrespondingDoor,
  calculateDoorEntryPosition,
  getElementAtPoint,
} from '../utils/collision';

interface UseCollisionDetectionReturn {
  /**
   * Check if character can move to a new position (no wall collision)
   */
  canMoveTo: (position: Vector2D) => boolean;

  /**
   * Check if character is touching a door
   */
  isTouchingDoor: (position: Vector2D) => boolean;

  /**
   * Get the door the character is touching
   */
  getTouchedDoor: (position: Vector2D) => { door: Door; name: string } | null;

  /**
   * Get the application the character is near
   */
  getNearbyApp: (
    position: Vector2D
  ) => { app: Application; name: string } | null;

  /**
   * Check all collisions at once
   */
  checkCollisions: (position: Vector2D) => {
    canMove: boolean;
    collidingWall: Wall | null;
    collidingDoor: { door: Door; name: string } | null;
    collidingApp: { app: Application; name: string } | null;
  };

  /**
   * Find the corresponding door in the destination room
   */
  findDestinationDoor: (
    sourceRoom: string,
    currentDoor: Door,
    destinationDoors: Record<string, Door>
  ) => { door: Door; name: string } | null;

  /**
   * Calculate where to place character when entering through a door
   */
  getDoorEntryPosition: (
    door: Door,
    offset?: number
  ) => Vector2D;

  /**
   * Get element at a specific point (for click detection)
   */
  getElementAt: (point: Vector2D) => {
    collided: boolean;
    element?: Wall | Door | Application;
    elementName?: string;
  };
}

interface UseCollisionDetectionOptions {
  walls: Record<string, Wall>;
  doors: Record<string, Door>;
  applications: Record<string, Application>;
  characterSize: Dimensions;
}

export function useCollisionDetection(
  options: UseCollisionDetectionOptions
): UseCollisionDetectionReturn {
  const { walls, doors, applications, characterSize } = options;

  const canMoveTo = useCallback(
    (position: Vector2D): boolean => {
      return checkWallCollision(position, characterSize, walls);
    },
    [walls, characterSize]
  );

  const isTouchingDoor = useCallback(
    (position: Vector2D): boolean => {
      return checkDoorCollision(position, characterSize, doors);
    },
    [doors, characterSize]
  );

  const getTouchedDoor = useCallback(
    (position: Vector2D) => {
      return getCollidingDoor(position, characterSize, doors);
    },
    [doors, characterSize]
  );

  const getNearbyApp = useCallback(
    (position: Vector2D) => {
      return getCollidingApp(position, characterSize, applications);
    },
    [applications, characterSize]
  );

  const checkCollisions = useCallback(
    (position: Vector2D) => {
      return checkAllCollisions(
        position,
        characterSize,
        walls,
        doors,
        applications
      );
    },
    [walls, doors, applications, characterSize]
  );

  const findDestinationDoor = useCallback(
    (
      sourceRoom: string,
      currentDoor: Door,
      destinationDoors: Record<string, Door>
    ) => {
      return findCorrespondingDoor(sourceRoom, currentDoor, destinationDoors);
    },
    []
  );

  const getDoorEntryPosition = useCallback(
    (door: Door, offset?: number) => {
      return calculateDoorEntryPosition(door, characterSize, offset);
    },
    [characterSize]
  );

  const getElementAt = useCallback(
    (point: Vector2D) => {
      return getElementAtPoint(point, walls, doors, applications);
    },
    [walls, doors, applications]
  );

  return {
    canMoveTo,
    isTouchingDoor,
    getTouchedDoor,
    getNearbyApp,
    checkCollisions,
    findDestinationDoor,
    getDoorEntryPosition,
    getElementAt,
  };
}
