/**
 * Spatial UI Module
 *
 * A complete React component library for building spatial/room-based
 * navigation interfaces with characters, walls, doors, and applications.
 *
 * @example
 * ```tsx
 * import {
 *   SpatialProvider,
 *   SpatialWorld,
 *   createHttpSpatialServices,
 * } from 'npcts/ui/spatial';
 *
 * const services = createHttpSpatialServices('http://localhost:3001');
 *
 * function App() {
 *   return (
 *     <SpatialProvider
 *       configClient={services.config}
 *       commandClient={services.command}
 *       imageClient={services.image}
 *     >
 *       <SpatialWorld />
 *     </SpatialProvider>
 *   );
 * }
 * ```
 */

// Context & Provider
export { SpatialProvider, useSpatial } from './context';

// Hooks
export {
  useCharacter,
  getDirectionRotation,
  getCurrentSprite,
  useKeyboardInput,
  isKeyPressed,
  getMovementFromKeys,
  useCollisionDetection,
} from './hooks';

// Components
export {
  Wall,
  WALL_STYLES,
  Door,
  DoorArrow,
  FloorPattern,
  TessellatedFloor,
  FLOOR_PATTERNS,
  FLOOR_PATTERN_SIZES,
  Character,
  SimpleCharacter,
  Application,
  ApplicationMenu,
  ApplicationGrid,
  Room,
  EditModeOverlay,
  Minimap,
  SpatialWorld,
  HelpOverlay,
  KeyLegend,
  MenuOverlay,
  // Form components
  FormOverlay,
  FormField,
  FormInput,
  FormFileInput,
  FormButton,
  FormTabs,
  FormRow,
  FormFooter,
  FormCommandList,
  DoorOrientationSelector,
  PositionSlider,
  // Settings
  SettingsOverlay,
  // Avatar
  AvatarEditorOverlay,
  DEFAULT_AVATAR_SETTINGS,
  // Edit overlays
  EditRoomOverlay,
  EditAppOverlay,
  // Furniture
  FurnitureCatalogOverlay,
  FurnitureItem,
  FurnitureLayer,
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  // World Map
  WorldMapOverlay,
  // Media Player
  MediaPlayerDock,
  // Floor Tiles
  FloorTilePicker,
  BUILT_IN_TILES,
  PATTERN_TEMPLATES,
  // Usage Tracker
  UsageTracker,
} from './components';

// Editors
export { ConfigEditor } from './editors';

// Utilities
export {
  // Collision detection
  checkAABBCollision,
  checkWallCollision,
  checkDoorCollision,
  getCollidingDoor,
  getCollidingApp,
  checkAllCollisions,
  findCorrespondingDoor,
  calculateDoorEntryPosition,
  isPointInBounds,
  getElementAtPoint,
  // Coordinate transforms
  calculateViewportDimensions,
  percentToPixels,
  pixelsToPercent,
  wallConfigToPixels,
  doorConfigToPixels,
  applicationConfigToPixels,
  characterConfigToPixels,
  roomConfigToPixels,
  wallToConfig,
  doorToConfig,
  applicationToConfig,
  clamp,
  clampCharacterPosition,
} from './utils';

// Re-export types from core
export type {
  // Geometry
  Vector2D,
  Dimensions,
  BoundingBox,
  ViewportDimensions,
  // Orientations
  WallOrientation,
  DoorDirection,
  CharacterDirection,
  WallStyle,
  WallPosition,
  // Configs
  WallConfig,
  DoorConfig,
  MenuItemConfig,
  ApplicationConfig,
  RoomConfig,
  CharacterConfig,
  SpriteSheets,
  SpatialWorldConfig,
  // Runtime objects
  Wall as WallType,
  Door as DoorType,
  Application as ApplicationType,
  Room as RoomType,
  Character as CharacterType,
  CharacterState,
  SpatialWorldState,
  // Command execution
  CommandResult,
  RunningApp,
  // Image upload
  ImageUploadResult,
  // Collision
  CollisionCheckResult,
  CollisionContext,
  // Events
  SpatialEventType,
  SpatialEvent,
  RoomChangeEvent,
  AppOpenEvent,
  CharacterMoveEvent,
  // Editor
  EditorSelection,
  DragState,
  LoadedImage,
  // Service interfaces
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
} from '../../core/spatial';

// Re-export floor pattern type
export type { FloorPatternType } from './components';

// Re-export usage tracker types
export type { UsageData, UsageTrackerProps } from './components';

// Re-export floor tile picker types
export type { FloorTileOption, FloorTilePickerProps } from './components';
