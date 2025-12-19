/**
 * SpatialContext Provider
 *
 * Manages the global state for spatial UI systems including:
 * - World configuration
 * - Current room
 * - Character state
 * - Edit mode
 * - Command execution
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  SpatialWorldConfig,
  RoomConfig,
  Room,
  ApplicationConfig,
  DoorConfig,
  CharacterState,
  CharacterDirection,
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
  CommandResult,
  ViewportDimensions,
  Application,
  Door,
} from '../../../core/spatial';
import {
  roomConfigToPixels,
  calculateViewportDimensions,
} from '../utils/transforms';
import {
  checkAllCollisions,
  findCorrespondingDoor,
  calculateDoorEntryPosition,
} from '../utils/collision';

// =============================================================================
// Context Types
// =============================================================================

interface SpatialContextValue {
  // Configuration
  config: SpatialWorldConfig | null;
  isLoading: boolean;
  error: string | null;

  // Current state
  currentRoom: string;
  currentRoomData: Room | null;
  character: CharacterState | null;
  editMode: boolean;
  viewport: ViewportDimensions;

  // Room navigation
  setCurrentRoom: (roomName: string) => void;
  navigateThroughDoor: (door: Door, doorName: string) => void;

  // Character management
  moveCharacter: (dx: number, dy: number) => boolean;
  setCharacterPosition: (x: number, y: number) => void;
  setCharacterDirection: (direction: CharacterDirection) => void;

  // Edit mode
  setEditMode: (enabled: boolean) => void;
  toggleEditMode: () => void;

  // Configuration management
  saveConfig: () => Promise<void>;
  reloadConfig: () => Promise<void>;

  // Room management
  addRoom: (name: string, config: RoomConfig) => void;
  deleteRoom: (name: string) => void;
  updateRoom: (name: string, config: Partial<RoomConfig>) => void;

  // Application management
  addApplication: (
    roomName: string,
    appName: string,
    config: ApplicationConfig
  ) => void;
  deleteApplication: (roomName: string, appName: string) => void;
  updateApplication: (
    roomName: string,
    appName: string,
    config: Partial<ApplicationConfig>
  ) => void;
  moveApplication: (
    roomName: string,
    appName: string,
    x: number,
    y: number
  ) => void;

  // Door management
  addDoor: (roomName: string, doorName: string, config: DoorConfig) => void;
  deleteDoor: (roomName: string, doorName: string) => void;
  updateDoor: (
    roomName: string,
    doorName: string,
    config: Partial<DoorConfig>
  ) => void;

  // Command execution
  executeCommand: (command: string) => Promise<CommandResult>;
  getRunningApps: () => Promise<string[]>;

  // Image upload
  uploadImage: (file: File | Blob, filename?: string) => Promise<string>;

  // UI State - forms and menus
  showMenu: boolean;
  menuItems: Record<string, any> | null;
  menuApp: Application | null;
  isEditingMenu: boolean;
  showAddAppForm: boolean;
  showAddRoomForm: boolean;
  showEditAppForm: boolean;
  editingApp: Application | null;
  nearbyApp: Application | null;
  showSettings: boolean;

  // User Settings
  userSettings: UserSettings;

  // UI Methods
  openAppMenu: (app: Application) => void;
  closeAppMenu: () => void;
  toggleMenuEditMode: () => void;
  deleteMenuItem: (itemName: string) => void;
  addMenuItem: () => void;
  openAddAppForm: () => void;
  openAddRoomForm: () => void;
  openEditAppForm: (app: Application) => void;
  closeAllForms: () => void;
  setNearbyApp: (app: Application | null) => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateUserSettings: (settings: UserSettings) => void;

  // Avatar Editor
  showAvatarEditor: boolean;
  openAvatarEditor: () => void;
  closeAvatarEditor: () => void;
  updateAvatarSettings: (settings: AvatarSettings) => void;
}

// Avatar Settings type
export interface AvatarSettings {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  size: number; // 0.5 to 2.0 scale
  showNameTag: boolean;
  nameTagColor: string;
  trailEffect: 'none' | 'sparkle' | 'glow' | 'shadow';
  accessory: 'none' | 'hat' | 'glasses' | 'crown' | 'halo';
}

export const DEFAULT_AVATAR_SETTINGS: AvatarSettings = {
  name: 'Player',
  primaryColor: '#4a90d9',
  secondaryColor: '#2d5a8a',
  outlineColor: '#1a3a5c',
  size: 1.0,
  showNameTag: true,
  nameTagColor: '#ffffff',
  trailEffect: 'none',
  accessory: 'none',
};

// User Settings type
export interface UserSettings {
  defaultBrowser: string;
  browserArgs?: string;
  defaultMediaPlayer: string;
  theme?: 'dark' | 'light' | 'system';
  showKeyLegend?: boolean;
  showMinimap?: boolean;
  moveSpeed?: number;
  avatar?: AvatarSettings;
}

const SpatialContext = createContext<SpatialContextValue | undefined>(
  undefined
);

// =============================================================================
// Provider Props
// =============================================================================

interface SpatialProviderProps {
  children: ReactNode;
  configClient: SpatialConfigClient;
  commandClient?: CommandExecutionClient;
  imageClient?: ImageUploadClient;
  initialRoom?: string;
  width?: number;
  height?: number;
}

// =============================================================================
// Provider Implementation
// =============================================================================

export const SpatialProvider: React.FC<SpatialProviderProps> = ({
  children,
  configClient,
  commandClient,
  imageClient,
  initialRoom = 'Room1',
  width = typeof window !== 'undefined' ? window.innerWidth : 1920,
  height = typeof window !== 'undefined' ? window.innerHeight : 1080,
}) => {
  // State
  const [config, setConfig] = useState<SpatialWorldConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRoom, setCurrentRoomState] = useState(initialRoom);
  const [editMode, setEditMode] = useState(false);
  const [character, setCharacter] = useState<CharacterState | null>(null);

  // Viewport dimensions
  const [viewport, setViewport] = useState<ViewportDimensions>(() =>
    calculateViewportDimensions(width, height)
  );

  // Current room data (converted to pixels)
  const [currentRoomData, setCurrentRoomData] = useState<Room | null>(null);

  // UI State - forms and menus
  const [showMenu, setShowMenu] = useState(false);
  const [menuItems, setMenuItems] = useState<Record<string, any> | null>(null);
  const [menuApp, setMenuApp] = useState<Application | null>(null);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [showAddAppForm, setShowAddAppForm] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [showEditAppForm, setShowEditAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [nearbyApp, setNearbyApp] = useState<Application | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);

  // User Settings - load from localStorage if available
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spatialUserSettings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parse errors
        }
      }
    }
    return {
      defaultBrowser: 'firefox',
      browserArgs: '--start-fullscreen --app=',
      defaultMediaPlayer: 'youtube-music',
      showKeyLegend: true,
      showMinimap: false,
      avatar: DEFAULT_AVATAR_SETTINGS,
    };
  });

  // Refs for stable callbacks
  const configRef = useRef(config);
  configRef.current = config;

  // =============================================================================
  // Configuration Loading
  // =============================================================================

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedConfig = await configClient.loadConfig();
      if (loadedConfig) {
        setConfig(loadedConfig);

        // Initialize character state
        if (loadedConfig.userCharacter) {
          setCharacter({
            x: loadedConfig.userCharacter.x,
            y: loadedConfig.userCharacter.y,
            direction: 'down',
            frame: 0,
            isMoving: false,
          });
        }
      } else {
        setError('No configuration found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  }, [configClient]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Update room data when config or current room changes
  useEffect(() => {
    if (config && config.rooms[currentRoom]) {
      const roomData = roomConfigToPixels(config.rooms[currentRoom], viewport);
      setCurrentRoomData(roomData);
    }
  }, [config, currentRoom, viewport]);

  // Update viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setViewport(
        calculateViewportDimensions(window.innerWidth, window.innerHeight)
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =============================================================================
  // Room Navigation
  // =============================================================================

  const setCurrentRoom = useCallback((roomName: string) => {
    setCurrentRoomState(roomName);
  }, []);

  const navigateThroughDoor = useCallback(
    (door: Door, doorName: string) => {
      if (!config || !character) return;

      const destinationRoom = door.leadsTo;
      const destinationRoomConfig = config.rooms[destinationRoom];

      if (!destinationRoomConfig) {
        console.error(`Destination room ${destinationRoom} not found`);
        return;
      }

      // Convert destination room to pixels
      const destRoomData = roomConfigToPixels(destinationRoomConfig, viewport);

      // Find the corresponding door in the destination room
      const correspondingDoor = findCorrespondingDoor(
        currentRoom,
        door,
        destRoomData.doors
      );

      // Calculate entry position
      let newPosition = { x: viewport.width / 2, y: viewport.height / 2 };
      if (correspondingDoor) {
        newPosition = calculateDoorEntryPosition(
          correspondingDoor.door,
          { width: config.userCharacter.width, height: config.userCharacter.height },
          20
        );
      }

      // Update character position
      setCharacter((prev) =>
        prev
          ? {
              ...prev,
              x: newPosition.x,
              y: newPosition.y,
            }
          : null
      );

      // Change room
      setCurrentRoomState(destinationRoom);
    },
    [config, character, currentRoom, viewport]
  );

  // =============================================================================
  // Character Movement
  // =============================================================================

  const moveCharacter = useCallback(
    (dx: number, dy: number): boolean => {
      if (!character || !currentRoomData || !config) return false;

      const newX = character.x + dx;
      const newY = character.y + dy;
      const charSize = {
        width: config.userCharacter.width,
        height: config.userCharacter.height,
      };

      // Check collisions
      const collision = checkAllCollisions(
        { x: newX, y: newY },
        charSize,
        currentRoomData.walls,
        currentRoomData.doors,
        currentRoomData.applications
      );

      // If hitting a door, navigate through it
      if (collision.collidingDoor) {
        navigateThroughDoor(
          collision.collidingDoor.door,
          collision.collidingDoor.name
        );
        return true;
      }

      // If wall collision, don't move
      if (!collision.canMove) {
        return false;
      }

      // Determine direction
      let direction: CharacterDirection = character.direction;
      if (dy < 0) direction = 'up';
      else if (dy > 0) direction = 'down';
      else if (dx < 0) direction = 'left';
      else if (dx > 0) direction = 'right';

      // Update character state
      setCharacter((prev) => {
        if (!prev) return null;
        const sameDirection = prev.direction === direction;
        return {
          x: newX,
          y: newY,
          direction,
          frame: sameDirection ? (prev.frame + 1) % 3 : 0,
          isMoving: true,
        };
      });

      return true;
    },
    [character, currentRoomData, config, navigateThroughDoor]
  );

  const setCharacterPosition = useCallback((x: number, y: number) => {
    setCharacter((prev) => (prev ? { ...prev, x, y } : null));
  }, []);

  const setCharacterDirection = useCallback((direction: CharacterDirection) => {
    setCharacter((prev) => (prev ? { ...prev, direction, frame: 0 } : null));
  }, []);

  // =============================================================================
  // Edit Mode
  // =============================================================================

  const toggleEditMode = useCallback(() => {
    setEditMode((prev) => !prev);
  }, []);

  // =============================================================================
  // UI State Management
  // =============================================================================

  const openAppMenu = useCallback((app: Application) => {
    console.log('openAppMenu called with app:', app);
    console.log('app.menuItems:', app.menuItems);
    if (app.menuItems && Object.keys(app.menuItems).length > 0) {
      console.log('Setting showMenu to true');
      setMenuApp(app);
      setMenuItems(app.menuItems);
      setShowMenu(true);
    } else {
      console.log('No menuItems found, not opening menu');
    }
  }, []);

  const closeAppMenu = useCallback(() => {
    setShowMenu(false);
    setMenuItems(null);
    setMenuApp(null);
  }, []);

  const openAddAppForm = useCallback(() => {
    closeAppMenu();
    setShowAddAppForm(true);
  }, [closeAppMenu]);

  const openAddRoomForm = useCallback(() => {
    closeAppMenu();
    setShowAddRoomForm(true);
  }, [closeAppMenu]);

  const openEditAppForm = useCallback((app: Application) => {
    closeAppMenu();
    setEditingApp(app);
    setShowEditAppForm(true);
  }, [closeAppMenu]);

  const closeAllForms = useCallback(() => {
    setShowMenu(false);
    setMenuItems(null);
    setMenuApp(null);
    setIsEditingMenu(false);
    setShowAddAppForm(false);
    setShowAddRoomForm(false);
    setShowEditAppForm(false);
    setEditingApp(null);
    setShowSettings(false);
    setShowAvatarEditor(false);
  }, []);

  const toggleMenuEditMode = useCallback(() => {
    setIsEditingMenu(prev => !prev);
  }, []);

  const deleteMenuItem = useCallback((itemName: string) => {
    if (!menuApp || !menuItems) return;

    // Remove from local state
    const newMenuItems = { ...menuItems };
    delete newMenuItems[itemName];
    setMenuItems(newMenuItems);

    // Update the config
    setConfig(prev => {
      if (!prev) return prev;
      const appName = Object.entries(prev.rooms[currentRoom]?.applications || {})
        .find(([_, app]) => app.name === menuApp.name)?.[0];
      if (!appName) return prev;

      const updatedApp = { ...prev.rooms[currentRoom].applications[appName] };
      if (updatedApp.menuItems) {
        delete updatedApp.menuItems[itemName];
      }

      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [currentRoom]: {
            ...prev.rooms[currentRoom],
            applications: {
              ...prev.rooms[currentRoom].applications,
              [appName]: updatedApp,
            },
          },
        },
      };
    });
  }, [menuApp, menuItems, currentRoom]);

  const addMenuItem = useCallback(() => {
    // Open add app form in menu item mode
    setShowAddAppForm(true);
  }, []);

  // Settings methods
  const openSettings = useCallback(() => {
    closeAppMenu();
    setShowSettings(true);
  }, [closeAppMenu]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const updateUserSettings = useCallback((newSettings: UserSettings) => {
    setUserSettings(newSettings);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('spatialUserSettings', JSON.stringify(newSettings));
    }
  }, []);

  // Avatar Editor methods
  const openAvatarEditor = useCallback(() => {
    closeAppMenu();
    setShowAvatarEditor(true);
  }, [closeAppMenu]);

  const closeAvatarEditor = useCallback(() => {
    setShowAvatarEditor(false);
  }, []);

  const updateAvatarSettings = useCallback((newAvatarSettings: AvatarSettings) => {
    setUserSettings(prev => {
      const updated = { ...prev, avatar: newAvatarSettings };
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('spatialUserSettings', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // =============================================================================
  // Config Management
  // =============================================================================

  const saveConfig = useCallback(async () => {
    if (!configRef.current) return;
    try {
      await configClient.saveConfig(configRef.current);
    } catch (err) {
      console.error('Failed to save config:', err);
      throw err;
    }
  }, [configClient]);

  const reloadConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  // =============================================================================
  // Room Management
  // =============================================================================

  const addRoom = useCallback((name: string, roomConfig: RoomConfig) => {
    setConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [name]: roomConfig,
        },
      };
    });
  }, []);

  const deleteRoom = useCallback((name: string) => {
    setConfig((prev) => {
      if (!prev) return null;
      const { [name]: deleted, ...remaining } = prev.rooms;
      return {
        ...prev,
        rooms: remaining,
      };
    });
  }, []);

  const updateRoom = useCallback(
    (name: string, updates: Partial<RoomConfig>) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[name]) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [name]: {
              ...prev.rooms[name],
              ...updates,
            },
          },
        };
      });
    },
    []
  );

  // =============================================================================
  // Application Management
  // =============================================================================

  const addApplication = useCallback(
    (roomName: string, appName: string, appConfig: ApplicationConfig) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[roomName]) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomName]: {
              ...prev.rooms[roomName],
              applications: {
                ...prev.rooms[roomName].applications,
                [appName]: appConfig,
              },
            },
          },
        };
      });
    },
    []
  );

  const deleteApplication = useCallback(
    (roomName: string, appName: string) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[roomName]) return prev;
        const { [appName]: deleted, ...remaining } =
          prev.rooms[roomName].applications;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomName]: {
              ...prev.rooms[roomName],
              applications: remaining,
            },
          },
        };
      });
    },
    []
  );

  const updateApplication = useCallback(
    (
      roomName: string,
      appName: string,
      updates: Partial<ApplicationConfig>
    ) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[roomName]) return prev;
        const app = prev.rooms[roomName].applications[appName];
        if (!app) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomName]: {
              ...prev.rooms[roomName],
              applications: {
                ...prev.rooms[roomName].applications,
                [appName]: {
                  ...app,
                  ...updates,
                },
              },
            },
          },
        };
      });
    },
    []
  );

  const moveApplication = useCallback(
    (roomName: string, appName: string, x: number, y: number) => {
      updateApplication(roomName, appName, { x, y });
    },
    [updateApplication]
  );

  // =============================================================================
  // Door Management
  // =============================================================================

  const addDoor = useCallback(
    (roomName: string, doorName: string, doorConfig: DoorConfig) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[roomName]) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomName]: {
              ...prev.rooms[roomName],
              doors: {
                ...prev.rooms[roomName].doors,
                [doorName]: doorConfig,
              },
            },
          },
        };
      });
    },
    []
  );

  const deleteDoor = useCallback((roomName: string, doorName: string) => {
    setConfig((prev) => {
      if (!prev || !prev.rooms[roomName]) return prev;
      const { [doorName]: deleted, ...remaining } = prev.rooms[roomName].doors;
      return {
        ...prev,
        rooms: {
          ...prev.rooms,
          [roomName]: {
            ...prev.rooms[roomName],
            doors: remaining,
          },
        },
      };
    });
  }, []);

  const updateDoor = useCallback(
    (roomName: string, doorName: string, updates: Partial<DoorConfig>) => {
      setConfig((prev) => {
        if (!prev || !prev.rooms[roomName]) return prev;
        const door = prev.rooms[roomName].doors[doorName];
        if (!door) return prev;
        return {
          ...prev,
          rooms: {
            ...prev.rooms,
            [roomName]: {
              ...prev.rooms[roomName],
              doors: {
                ...prev.rooms[roomName].doors,
                [doorName]: {
                  ...door,
                  ...updates,
                },
              },
            },
          },
        };
      });
    },
    []
  );

  // =============================================================================
  // Command Execution
  // =============================================================================

  // Common browser command names to substitute
  const BROWSER_COMMANDS = [
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable',
    'firefox',
    'brave-browser',
    'brave',
    'microsoft-edge',
    'edge',
    'safari',
  ];

  // Common media player command names to substitute
  const MEDIA_PLAYER_COMMANDS = [
    'spotify',
    'youtube-music',
    'apple-music',
    'open -a Music', // macOS Apple Music
    'vlc',
    'soundcloud',
    'tidal',
  ];

  const executeCommand = useCallback(
    async (command: string): Promise<CommandResult> => {
      if (!commandClient) {
        return { error: 'Command execution not available' };
      }

      // Substitute browser commands with user's default browser
      let processedCommand = command;
      const defaultBrowser = userSettings.defaultBrowser;
      const defaultMediaPlayer = userSettings.defaultMediaPlayer;

      if (defaultBrowser) {
        // Check if command starts with a known browser
        for (const browser of BROWSER_COMMANDS) {
          if (command.startsWith(browser + ' ') || command === browser) {
            processedCommand = command.replace(
              new RegExp(`^${browser}(\\s|$)`),
              defaultBrowser + '$1'
            );
            console.log(`Substituted browser: ${browser} -> ${defaultBrowser}`);
            break;
          }
        }
      }

      // Substitute media player commands with user's default media player
      if (defaultMediaPlayer) {
        for (const player of MEDIA_PLAYER_COMMANDS) {
          if (processedCommand.startsWith(player + ' ') || processedCommand === player) {
            processedCommand = processedCommand.replace(
              new RegExp(`^${player.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`),
              defaultMediaPlayer + '$1'
            );
            console.log(`Substituted media player: ${player} -> ${defaultMediaPlayer}`);
            break;
          }
        }
      }

      try {
        return await commandClient.executeCommand(processedCommand);
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'Command failed',
        };
      }
    },
    [commandClient, userSettings.defaultBrowser, userSettings.defaultMediaPlayer]
  );

  const getRunningApps = useCallback(async (): Promise<string[]> => {
    if (!commandClient?.getRunningApps) {
      return [];
    }
    try {
      const apps = await commandClient.getRunningApps();
      return apps.map((app) => app.name);
    } catch {
      return [];
    }
  }, [commandClient]);

  // =============================================================================
  // Image Upload
  // =============================================================================

  const uploadImage = useCallback(
    async (file: File | Blob, filename?: string): Promise<string> => {
      if (!imageClient) {
        throw new Error('Image upload not available');
      }
      const result = await imageClient.uploadImage(file, filename);
      return result.filePath;
    },
    [imageClient]
  );

  // =============================================================================
  // Context Value
  // =============================================================================

  const value: SpatialContextValue = {
    // Configuration
    config,
    isLoading,
    error,

    // Current state
    currentRoom,
    currentRoomData,
    character,
    editMode,
    viewport,

    // Room navigation
    setCurrentRoom,
    navigateThroughDoor,

    // Character management
    moveCharacter,
    setCharacterPosition,
    setCharacterDirection,

    // Edit mode
    setEditMode,
    toggleEditMode,

    // Configuration management
    saveConfig,
    reloadConfig,

    // Room management
    addRoom,
    deleteRoom,
    updateRoom,

    // Application management
    addApplication,
    deleteApplication,
    updateApplication,
    moveApplication,

    // Door management
    addDoor,
    deleteDoor,
    updateDoor,

    // Command execution
    executeCommand,
    getRunningApps,

    // Image upload
    uploadImage,

    // UI State - forms and menus
    showMenu,
    menuItems,
    menuApp,
    isEditingMenu,
    showAddAppForm,
    showAddRoomForm,
    showEditAppForm,
    editingApp,
    nearbyApp,
    showSettings,

    // User Settings
    userSettings,

    // UI Methods
    openAppMenu,
    closeAppMenu,
    toggleMenuEditMode,
    deleteMenuItem,
    addMenuItem,
    openAddAppForm,
    openAddRoomForm,
    openEditAppForm,
    closeAllForms,
    setNearbyApp,
    openSettings,
    closeSettings,
    updateUserSettings,

    // Avatar Editor
    showAvatarEditor,
    openAvatarEditor,
    closeAvatarEditor,
    updateAvatarSettings,
  };

  return (
    <SpatialContext.Provider value={value}>{children}</SpatialContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export function useSpatial(): SpatialContextValue {
  const context = useContext(SpatialContext);
  if (!context) {
    throw new Error('useSpatial must be used within a SpatialProvider');
  }
  return context;
}
