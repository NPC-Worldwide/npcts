/**
 * Spatial UI System - Core TypeScript Interfaces
 *
 * Provides types for building spatial/room-based navigation UIs
 * with characters, walls, doors, and interactive applications.
 */

// =============================================================================
// Geometry Primitives
// =============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface BoundingBox extends Vector2D, Dimensions {}

// =============================================================================
// Orientation Types
// =============================================================================

export type WallOrientation = 'horizontal' | 'vertical';
export type DoorDirection = 'up' | 'down' | 'left' | 'right';
export type CharacterDirection = 'up' | 'down' | 'left' | 'right';
export type WallStyle = 'brick' | 'wood' | 'office';
export type WallPosition = 'topWall' | 'bottomWall' | 'leftWall' | 'rightWall';

// =============================================================================
// Wall Configuration
// =============================================================================

export interface WallConfig {
  orientation: WallOrientation;
  x: number;       // Percentage (0-100)
  y: number;       // Percentage (0-100)
  width: number;   // Percentage (0-100)
  height: number;  // Percentage (0-100)
  style?: WallStyle;
  image?: string;
}

export interface Wall extends BoundingBox {
  orientation: WallOrientation;
  style?: WallStyle;
  image?: string;
}

// =============================================================================
// Door Configuration
// =============================================================================

export interface DoorConfig {
  x: number;       // Percentage (0-100)
  y: number;       // Percentage (0-100)
  width?: number;  // Percentage (0-100)
  height?: number; // Percentage (0-100)
  leadsTo: string; // Room name
  orientation: DoorDirection;
  image?: string;
}

export interface Door extends BoundingBox {
  leadsTo: string;
  orientation: DoorDirection;
  image?: string;
}

// =============================================================================
// Application/Launcher Configuration
// =============================================================================

export interface MenuItemConfig {
  name: string;
  command: string;
  image?: string;
  rotation?: number;
  width?: number;
  height?: number;
  text?: string;
}

export interface ApplicationConfig {
  name: string;
  command: string;
  x: number;       // Percentage (0-100)
  y: number;       // Percentage (0-100)
  width: number;   // Percentage relative to wall width
  height: number;  // Percentage relative to wall height
  image?: string;
  rotation?: number;
  text?: string;
  menuItems?: Record<string, MenuItemConfig>;
}

export interface Application extends BoundingBox {
  name: string;
  command: string;
  room?: string;
  text?: string;
  image?: string;
  rotation: number;
  opened: boolean;
  menuItems: Record<string, Application>;
}

// =============================================================================
// Room Configuration
// =============================================================================

export interface RoomConfig {
  name?: string;
  walls: Record<WallPosition, WallConfig>;
  doors: Record<string, DoorConfig>;
  applications: Record<string, ApplicationConfig>;
  floor_image?: string;
}

export interface Room {
  walls: Record<string, Wall>;
  doors: Record<string, Door>;
  applications: Record<string, Application>;
  floorImage?: string;
}

// =============================================================================
// Character/Sprite Configuration
// =============================================================================

export interface SpriteSheets {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
}

export interface CharacterConfig {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteSheets: SpriteSheets;
}

export interface Character extends BoundingBox {
  name: string;
  spriteSheets: SpriteSheets;
  currentDirection: CharacterDirection;
  lastDirection: CharacterDirection;
  currentFrame: number;
  totalFrames: number;
}

// =============================================================================
// World Configuration (Top-level)
// =============================================================================

export interface SpatialWorldConfig {
  userCharacter: CharacterConfig;
  rooms: Record<string, RoomConfig>;
  appIcons?: Record<string, string>;
}

// =============================================================================
// Runtime State
// =============================================================================

export interface CharacterState {
  x: number;
  y: number;
  direction: CharacterDirection;
  frame: number;
  isMoving: boolean;
}

export interface SpatialWorldState {
  config: SpatialWorldConfig | null;
  currentRoom: string;
  character: CharacterState | null;
  editMode: boolean;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Command Execution
// =============================================================================

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number;
}

export interface RunningApp {
  name: string;
  pid?: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

// =============================================================================
// Image Upload
// =============================================================================

export interface ImageUploadResult {
  filePath: string;
  tempUrl?: string;
}

// =============================================================================
// Service Client Interfaces
// =============================================================================

/**
 * Client for loading and saving spatial world configuration
 */
export interface SpatialConfigClient {
  /**
   * Load the spatial world configuration
   */
  loadConfig(): Promise<SpatialWorldConfig | null>;

  /**
   * Save the spatial world configuration
   */
  saveConfig(config: SpatialWorldConfig): Promise<void>;
}

/**
 * Client for executing shell commands
 */
export interface CommandExecutionClient {
  /**
   * Execute a shell command and return the result
   */
  executeCommand(command: string): Promise<CommandResult>;

  /**
   * Get list of currently running applications (optional)
   */
  getRunningApps?(): Promise<RunningApp[]>;

  /**
   * Kill a running process by PID (optional)
   */
  killProcess?(pid: number): Promise<void>;
}

/**
 * Client for uploading images
 */
export interface ImageUploadClient {
  /**
   * Upload an image file or blob
   */
  uploadImage(file: File | Blob, filename?: string): Promise<ImageUploadResult>;

  /**
   * Upload from a blob URL
   */
  uploadFromBlobUrl?(blobUrl: string): Promise<ImageUploadResult>;
}

// =============================================================================
// Collision Detection Types
// =============================================================================

export interface CollisionCheckResult {
  collided: boolean;
  element?: Wall | Door | Application;
  elementName?: string;
}

export interface CollisionContext {
  walls: Record<string, Wall>;
  doors: Record<string, Door>;
  applications: Record<string, Application>;
  characterSize: Dimensions;
}

// =============================================================================
// Event Types
// =============================================================================

export type SpatialEventType =
  | 'room-change'
  | 'app-open'
  | 'app-close'
  | 'edit-mode-toggle'
  | 'character-move'
  | 'config-save'
  | 'config-load';

export interface SpatialEvent<T = unknown> {
  type: SpatialEventType;
  payload: T;
  timestamp: number;
}

export interface RoomChangeEvent {
  fromRoom: string;
  toRoom: string;
  throughDoor: string;
}

export interface AppOpenEvent {
  app: Application;
  result?: CommandResult;
}

export interface CharacterMoveEvent {
  from: Vector2D;
  to: Vector2D;
  direction: CharacterDirection;
}

// =============================================================================
// Editor Types
// =============================================================================

export interface EditorSelection {
  type: 'application' | 'door' | 'wall' | 'character';
  name: string;
  element: Application | Door | Wall | Character;
}

export interface DragState {
  isDragging: boolean;
  element: EditorSelection | null;
  startPosition: Vector2D;
  currentPosition: Vector2D;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Convert percentage-based config to pixel values
 */
export interface ViewportDimensions {
  width: number;
  height: number;
  wallWidthX: number;  // Wall width in pixels (for X dimension)
  wallWidthY: number;  // Wall width in pixels (for Y dimension)
}

/**
 * Image loader result
 */
export interface LoadedImage {
  image: HTMLImageElement;
  src: string;
  finalPath?: string;
}
