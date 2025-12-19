/**
 * Spatial UI Components
 */

export { Wall, WALL_STYLES } from './Wall';
export { Door, DoorArrow } from './Door';
export {
  FloorPattern,
  TessellatedFloor,
  FLOOR_PATTERNS,
  FLOOR_PATTERN_SIZES,
  type FloorPatternType,
} from './FloorPattern';
export { Character, SimpleCharacter } from './Character';
export { Application, ApplicationMenu, ApplicationGrid } from './Application';
export { Room, EditModeOverlay, Minimap } from './Room';
export { SpatialWorld } from './SpatialWorld';
export { HelpOverlay } from './HelpOverlay';
export { KeyLegend } from './KeyLegend';
export { MenuOverlay } from './MenuOverlay';
export {
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
  type FormOverlayProps,
  type FormFieldProps,
  type FormInputProps,
  type FormButtonProps,
  type FormTabsProps,
  type FormFileInputProps,
  type DoorOrientationSelectorProps,
  type PositionSliderProps,
} from './FormOverlay';
export {
  SettingsOverlay,
  type SettingsOverlayProps,
  type UserSettings,
} from './SettingsOverlay';
export {
  AvatarEditorOverlay,
  DEFAULT_AVATAR_SETTINGS,
  type AvatarEditorOverlayProps,
  type AvatarSettings,
} from './AvatarEditorOverlay';
export {
  EditRoomOverlay,
  type EditRoomOverlayProps,
  type RoomData,
} from './EditRoomOverlay';
export {
  EditAppOverlay,
  type EditAppOverlayProps,
  type AppData,
} from './EditAppOverlay';
export {
  FurnitureCatalogOverlay,
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  COLOR_PRESETS as FURNITURE_COLOR_PRESETS,
  type FurnitureCatalogOverlayProps,
  type FurnitureItemConfig,
  type FurnitureCatalogItem,
} from './FurnitureCatalogOverlay';
export {
  FurnitureItem,
  FurnitureLayer,
  type FurnitureItemProps,
  type FurnitureLayerProps,
} from './FurnitureItem';
export {
  WorldMapOverlay,
  type WorldMapOverlayProps,
} from './WorldMapOverlay';
export {
  MediaPlayerDock,
  type MediaPlayerDockProps,
} from './MediaPlayerDock';
export {
  FloorTilePicker,
  BUILT_IN_TILES,
  PATTERN_TEMPLATES,
  type FloorTileOption,
  type FloorTilePickerProps,
} from './FloorTilePicker';
export {
  UsageTracker,
  type UsageTrackerProps,
  type UsageData,
} from './UsageTracker';
