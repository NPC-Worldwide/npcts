/**
 * Coordinate Transform Utilities
 *
 * Convert between percentage-based configuration values
 * and pixel-based runtime values.
 */

import type {
  ViewportDimensions,
  WallConfig,
  DoorConfig,
  ApplicationConfig,
  CharacterConfig,
  RoomConfig,
  Wall,
  Door,
  Application,
  Room,
  Character,
  SpriteSheets,
  WallPosition,
} from '../../../core/spatial';

/**
 * Calculate viewport dimensions including wall sizes
 */
export function calculateViewportDimensions(
  windowWidth: number,
  windowHeight: number,
  wallPercentage: number = 7
): ViewportDimensions {
  return {
    width: windowWidth,
    height: windowHeight,
    wallWidthX: (wallPercentage / 100) * windowWidth,
    wallWidthY: (wallPercentage / 100) * windowHeight,
  };
}

/**
 * Convert a percentage value to pixels
 */
export function percentToPixels(
  percent: number,
  dimension: number
): number {
  return (percent / 100) * dimension;
}

/**
 * Convert a pixel value to percentage
 */
export function pixelsToPercent(
  pixels: number,
  dimension: number
): number {
  return (pixels / dimension) * 100;
}

/**
 * Convert wall config (percentage) to wall object (pixels)
 */
export function wallConfigToPixels(
  wallName: WallPosition,
  config: WallConfig,
  viewport: ViewportDimensions
): Wall {
  let x: number, y: number, width: number, height: number;

  width = percentToPixels(config.width, viewport.width);
  height = percentToPixels(config.height, viewport.height);

  switch (wallName) {
    case 'topWall':
      x = 0;
      y = 0;
      break;
    case 'bottomWall':
      x = 0;
      y = viewport.height - height;
      break;
    case 'leftWall':
      x = 0;
      y = 0;
      break;
    case 'rightWall':
      x = viewport.width - width;
      y = 0;
      break;
    default:
      x = percentToPixels(config.x, viewport.width);
      y = percentToPixels(config.y, viewport.height);
  }

  return {
    x,
    y,
    width,
    height,
    orientation: config.orientation,
    style: config.style,
    image: config.image,
  };
}

/**
 * Convert door config (percentage) to door object (pixels)
 */
export function doorConfigToPixels(
  config: DoorConfig,
  viewport: ViewportDimensions,
  wallHeight: number
): Door {
  let x = percentToPixels(config.x, viewport.width);
  let y = percentToPixels(config.y, viewport.height);
  let width: number, height: number;

  if (config.orientation === 'up' || config.orientation === 'down') {
    // Horizontal doors on top/bottom walls
    width = config.width
      ? percentToPixels(config.width, viewport.width)
      : 60; // Default door width of 60px
    height = wallHeight;

    // Position door ON the wall based on orientation
    if (config.orientation === 'up') {
      y = 0; // Top wall
    } else {
      y = viewport.height - wallHeight; // Bottom wall
    }
  } else {
    // Vertical doors on left/right walls
    width = viewport.wallWidthX;
    height = config.height
      ? percentToPixels(config.height, viewport.height)
      : wallHeight;

    // Position door ON the wall based on orientation
    if (config.orientation === 'left') {
      x = 0; // Left wall
    } else if (config.orientation === 'right') {
      x = viewport.width - viewport.wallWidthX; // Right wall
    }
  }

  return {
    x,
    y,
    width,
    height,
    leadsTo: config.leadsTo,
    orientation: config.orientation,
    image: config.image,
  };
}

/**
 * Convert application config (percentage) to application object (pixels)
 */
export function applicationConfigToPixels(
  config: ApplicationConfig,
  viewport: ViewportDimensions
): Application {
  const x = percentToPixels(config.x, viewport.width);
  const y = percentToPixels(config.y, viewport.height);

  // Application dimensions are relative to wall width (7% of viewport)
  const width = percentToPixels(config.width, viewport.wallWidthX);
  const height = percentToPixels(config.height, viewport.wallWidthY);

  // Convert menuItems from MenuItemConfig to Application
  const menuItems: Record<string, Application> = {};
  if (config.menuItems) {
    for (const [itemName, itemConfig] of Object.entries(config.menuItems)) {
      menuItems[itemName] = {
        x: 0,
        y: 0,
        width: itemConfig.width ?? 50,
        height: itemConfig.height ?? 50,
        name: itemConfig.name,
        command: itemConfig.command,
        image: itemConfig.image,
        rotation: itemConfig.rotation ?? 0,
        opened: false,
        menuItems: {},
      };
    }
  }

  return {
    x,
    y,
    width,
    height,
    name: config.name,
    command: config.command,
    text: config.text,
    image: config.image,
    rotation: config.rotation ?? 0,
    opened: false,
    menuItems,
  };
}

/**
 * Convert character config to character object with pixel positions
 */
export function characterConfigToPixels(
  config: CharacterConfig,
  viewport: ViewportDimensions
): Character {
  return {
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
    name: config.name,
    spriteSheets: config.spriteSheets,
    currentDirection: 'down',
    lastDirection: 'down',
    currentFrame: 0,
    totalFrames: config.spriteSheets.down?.length ?? 3,
  };
}

/**
 * Convert entire room config to room object with pixel values
 */
export function roomConfigToPixels(
  config: RoomConfig,
  viewport: ViewportDimensions
): Room {
  const walls: Record<string, Wall> = {};
  const doors: Record<string, Door> = {};
  const applications: Record<string, Application> = {};

  // Calculate wall height for door sizing
  const wallHeight = viewport.wallWidthY;

  // Convert walls
  for (const wallName in config.walls) {
    walls[wallName] = wallConfigToPixels(
      wallName as WallPosition,
      config.walls[wallName as WallPosition],
      viewport
    );
  }

  // Convert doors
  for (const doorName in config.doors) {
    doors[doorName] = doorConfigToPixels(
      config.doors[doorName],
      viewport,
      wallHeight
    );
  }

  // Convert applications
  for (const appName in config.applications) {
    applications[appName] = applicationConfigToPixels(
      config.applications[appName],
      viewport
    );
  }

  return {
    walls,
    doors,
    applications,
    floorImage: config.floor_image,
    floorTile: config.floor_tile,
    floorTileSize: config.floor_tile_size,
    floorPattern: config.floor_pattern,
    floorPatternSize: config.floor_pattern_size,
  };
}

/**
 * Convert wall (pixels) back to config (percentage) for saving
 */
export function wallToConfig(
  wall: Wall,
  viewport: ViewportDimensions
): WallConfig {
  return {
    orientation: wall.orientation,
    x: pixelsToPercent(wall.x, viewport.width),
    y: pixelsToPercent(wall.y, viewport.height),
    width: pixelsToPercent(wall.width, viewport.width),
    height: pixelsToPercent(wall.height, viewport.height),
    style: wall.style,
    image: wall.image,
  };
}

/**
 * Convert door (pixels) back to config (percentage) for saving
 */
export function doorToConfig(
  door: Door,
  viewport: ViewportDimensions
): DoorConfig {
  return {
    x: pixelsToPercent(door.x, viewport.width),
    y: pixelsToPercent(door.y, viewport.height),
    width: pixelsToPercent(door.width, viewport.width),
    height: pixelsToPercent(door.height, viewport.height),
    leadsTo: door.leadsTo,
    orientation: door.orientation,
    image: door.image,
  };
}

/**
 * Convert application (pixels) back to config (percentage) for saving
 */
export function applicationToConfig(
  app: Application,
  viewport: ViewportDimensions
): ApplicationConfig {
  return {
    name: app.name,
    command: app.command,
    x: pixelsToPercent(app.x, viewport.width),
    y: pixelsToPercent(app.y, viewport.height),
    // Width/height relative to wall dimensions
    width: pixelsToPercent(app.width, viewport.wallWidthX),
    height: pixelsToPercent(app.height, viewport.wallWidthY),
    image: app.image,
    rotation: app.rotation,
    text: app.text,
    menuItems: {}, // Convert menu items separately
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Ensure character stays within room boundaries (inside walls)
 */
export function clampCharacterPosition(
  x: number,
  y: number,
  characterWidth: number,
  characterHeight: number,
  viewport: ViewportDimensions
): { x: number; y: number } {
  const minX = viewport.wallWidthX;
  const maxX = viewport.width - viewport.wallWidthX - characterWidth;
  const minY = viewport.wallWidthY;
  const maxY = viewport.height - viewport.wallWidthY - characterHeight;

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}
