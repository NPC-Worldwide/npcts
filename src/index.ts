// Core modules
export * from "./core/chat";
export * from "./core/types";
export * from "./core/layout";
export * from "./core/files";
export * from "./core/utils";
export * from "./core/database";
export * from "./core/vm";

// Spatial core types (exclude conflicting names that are also in ui/spatial components)
export type {
  Vector2D,
  Dimensions,
  BoundingBox,
  WallOrientation,
  DoorDirection,
  CharacterDirection,
  WallStyle,
  WallPosition,
  WallConfig,
  DoorConfig,
  MenuItemConfig,
  ApplicationConfig,
  RoomConfig,
  CharacterConfig,
  SpriteSheets,
  SpatialWorldConfig,
  CharacterState,
  SpatialWorldState,
  CommandResult,
  RunningApp,
  ImageUploadResult,
  CollisionCheckResult,
  CollisionContext,
  SpatialEventType,
  SpatialEvent,
  RoomChangeEvent,
  AppOpenEvent,
  CharacterMoveEvent,
  EditorSelection,
  DragState,
  ViewportDimensions,
  LoadedImage,
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
  // Export the interface types with different names to avoid conflicts
  Wall as WallData,
  Door as DoorData,
  Application as ApplicationData,
  Room as RoomData,
  Character as CharacterData,
} from "./core/spatial";

// Adapters
export * from "./adapters/base";
export { createElectronAdapter } from "./adapters/electron/bridge";
export * from "./adapters/http";

// UI Hooks
export * from "./ui/hooks";

// UI Components
export * from "./ui/primitives";
export * from "./ui/chat";
export * from "./ui/files";
export { MessageItem } from "./ui/chat/components/MessageItem";
export * from "./ui/viewers";
export * from "./ui/dialogs";
export * from "./ui/specialized";
export { getFileIcon, convertFileToBase64 } from "./ui/utils";
export * from "./ui/layout/components/modals";
export * from "./ui/sql";
export * from "./ui/memory";
export * from "./ui/knowledge-graph";
export * from "./ui/execution";
export * from "./ui/models";
export * from "./ui/dashboard";
export * from "./ui/editors";
export * from "./ui/spatial";
