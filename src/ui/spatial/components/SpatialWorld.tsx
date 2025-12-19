/**
 * SpatialWorld Component
 *
 * The main container component for spatial UI systems.
 * Combines Room, Character, and keyboard input handling.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import type {
  Application as ApplicationType,
  Door as DoorType,
  CharacterDirection,
} from '../../../core/spatial';
import { useSpatial } from '../context/SpatialContext';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import { Room, EditModeOverlay, Minimap } from './Room';
import { Character } from './Character';
import { HelpOverlay } from './HelpOverlay';
import { KeyLegend } from './KeyLegend';
import { MenuOverlay } from './MenuOverlay';

// =============================================================================
// Component Props
// =============================================================================

interface SpatialWorldProps {
  /** Width of the world viewport (defaults to window width) */
  width?: number;
  /** Height of the world viewport (defaults to window height) */
  height?: number;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Whether to show the minimap */
  showMinimap?: boolean;
  /** Whether to show the key legend */
  showKeyLegend?: boolean;
  /** Whether to show help overlay on '?' press */
  enableHelpOverlay?: boolean;
  /** Callback when an application is opened */
  onAppOpen?: (app: ApplicationType, name: string) => void;
  /** Callback when room changes */
  onRoomChange?: (newRoom: string, oldRoom: string) => void;
  /** Callback when 'e' is pressed to add application */
  onAddApplication?: () => void;
  /** Callback when 'r' is pressed to add room */
  onAddRoom?: () => void;
  /** Callback when edit mode changes */
  onEditModeChange?: (editMode: boolean) => void;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** Custom error component */
  errorComponent?: (error: string) => React.ReactNode;
}

// =============================================================================
// SpatialWorld Component
// =============================================================================

export const SpatialWorld: React.FC<SpatialWorldProps> = ({
  width,
  height,
  className = '',
  style: customStyle,
  showMinimap = false,
  showKeyLegend = true,
  enableHelpOverlay = true,
  onAppOpen,
  onRoomChange,
  onAddApplication,
  onAddRoom,
  onEditModeChange,
  loadingComponent,
  errorComponent,
}) => {
  const {
    config,
    isLoading,
    error,
    currentRoom,
    currentRoomData,
    character,
    editMode,
    viewport,
    moveCharacter,
    toggleEditMode,
    setEditMode,
    executeCommand,
    saveConfig,
    updateApplication,
    // UI state
    showMenu,
    menuItems,
    menuApp,
    isEditingMenu,
    showAddAppForm,
    showAddRoomForm,
    showEditAppForm,
    editingApp,
    nearbyApp: contextNearbyApp,
    // UI methods
    openAppMenu,
    closeAppMenu,
    toggleMenuEditMode,
    deleteMenuItem,
    addMenuItem,
    openAddAppForm,
    openAddRoomForm,
    openEditAppForm,
    closeAllForms,
    setNearbyApp: setContextNearbyApp,
  } = useSpatial();

  // Local state
  const [showHelp, setShowHelp] = useState(false);
  const [highlightedApp, setHighlightedApp] = useState<string | undefined>();
  const [highlightedDoor, setHighlightedDoor] = useState<string | undefined>();
  const [selectedElement, setSelectedElement] = useState<string | undefined>();

  // Drag state for edit mode
  const [draggingApp, setDraggingApp] = useState<{ name: string; app: ApplicationType } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Use context nearbyApp
  const nearbyApp = contextNearbyApp;
  const setNearbyApp = setContextNearbyApp;

  // Previous room for change detection
  const [prevRoom, setPrevRoom] = useState(currentRoom);

  // Detect room changes
  useEffect(() => {
    if (currentRoom !== prevRoom) {
      onRoomChange?.(currentRoom, prevRoom);
      setPrevRoom(currentRoom);
    }
  }, [currentRoom, prevRoom, onRoomChange]);

  // Check for nearby applications when character moves
  useEffect(() => {
    if (!character || !currentRoomData) return;

    // Find app near character
    let foundApp: ApplicationType | null = null;
    let foundAppName: string | undefined;

    for (const [name, app] of Object.entries(currentRoomData.applications)) {
      const charCenterX = character.x + (config?.userCharacter.width || 50) / 2;
      const charCenterY = character.y + (config?.userCharacter.height || 50) / 2;
      const appCenterX = app.x + app.width / 2;
      const appCenterY = app.y + app.height / 2;

      const distance = Math.sqrt(
        Math.pow(charCenterX - appCenterX, 2) +
          Math.pow(charCenterY - appCenterY, 2)
      );

      if (distance < 80) {
        foundApp = app;
        foundAppName = name;
        break;
      }
    }

    setNearbyApp(foundApp);
    setHighlightedApp(foundAppName);
  }, [character, currentRoomData, config]);

  // Handle movement
  const handleMove = useCallback(
    (dx: number, dy: number, direction: CharacterDirection) => {
      moveCharacter(dx, dy);
    },
    [moveCharacter]
  );

  // Handle interact (o key)
  const handleInteract = useCallback(async () => {
    console.log('handleInteract called, nearbyApp:', nearbyApp);
    console.log('nearbyApp.menuItems:', nearbyApp?.menuItems);
    if (!nearbyApp) return;

    const appName = highlightedApp || 'Unknown';

    // If app has menu items, open the menu
    console.log('Checking menuItems:', nearbyApp.menuItems, 'keys:', nearbyApp.menuItems ? Object.keys(nearbyApp.menuItems) : 'none');
    if (nearbyApp.menuItems && Object.keys(nearbyApp.menuItems).length > 0) {
      console.log(`Opening menu for: ${nearbyApp.name}, calling openAppMenu`);
      openAppMenu(nearbyApp);
      onAppOpen?.(nearbyApp, appName);
    }
    // If app has a command but no menu items, execute it
    else if (nearbyApp.command) {
      console.log(`Opening application: ${nearbyApp.name}`);
      onAppOpen?.(nearbyApp, appName);
      const result = await executeCommand(nearbyApp.command);
      console.log('Command result:', result);
    }
  }, [nearbyApp, highlightedApp, onAppOpen, executeCommand, openAppMenu]);

  // Handle edit mode toggle (f key)
  const handleEditModeToggle = useCallback(() => {
    toggleEditMode();
    onEditModeChange?.(!editMode);
  }, [toggleEditMode, editMode, onEditModeChange]);

  // Handle add application (e key when NOT near an app)
  const handleAddApplication = useCallback(() => {
    console.log('e key pressed - add application');
    openAddAppForm();
    onAddApplication?.();
  }, [onAddApplication, openAddAppForm]);

  // Handle edit app (e key when NEAR an app)
  const handleEditApp = useCallback((app: ApplicationType) => {
    console.log('e key pressed near app - edit application');
    openEditAppForm(app);
  }, [openEditAppForm]);

  // Handle add room (r key)
  const handleAddRoom = useCallback(() => {
    console.log('r key pressed - add room');
    openAddRoomForm();
    onAddRoom?.();
  }, [onAddRoom, openAddRoomForm]);

  // Handle help toggle
  const handleHelpToggle = useCallback(() => {
    if (enableHelpOverlay) {
      setShowHelp((prev) => !prev);
    }
  }, [enableHelpOverlay]);

  // Handle escape
  const handleEscape = useCallback(() => {
    // Close menu first
    if (showMenu) {
      closeAppMenu();
      return;
    }
    // Close any forms
    if (showAddAppForm || showAddRoomForm || showEditAppForm) {
      closeAllForms();
      return;
    }
    // Close help
    if (showHelp) {
      setShowHelp(false);
      return;
    }
    // Exit edit mode
    if (editMode) {
      setEditMode(false);
    }
    setSelectedElement(undefined);
  }, [showHelp, editMode, setEditMode, showMenu, closeAppMenu, showAddAppForm, showAddRoomForm, showEditAppForm, closeAllForms]);

  // Compute whether forms are open
  const formsOpen = showAddAppForm || showAddRoomForm || showEditAppForm;

  // Keyboard input
  useKeyboardInput({
    onMove: handleMove,
    onInteract: handleInteract,
    onEditMode: handleEditModeToggle,
    onAdd: handleAddApplication,
    onEditApp: handleEditApp,
    onAddRoom: handleAddRoom,
    onHelp: handleHelpToggle,
    onEscape: handleEscape,
    moveSpeed: 10,
    enabled: !showHelp,
    editMode,
    formsOpen,
    menuOpen: showMenu,
    nearbyApp,
  });

  // Handle menu item click
  const handleMenuItemClick = useCallback(async (item: any) => {
    closeAppMenu();
    // Execute item's command if it has one
    if (item.command) {
      const result = await executeCommand(item.command);
      console.log('Menu item command result:', result);
    } else if (item.open && typeof item.open === 'function') {
      // Fallback to item.open() if it exists (like original App.tsx)
      item.open();
    }
  }, [closeAppMenu, executeCommand]);

  // Handle app click
  const handleAppClick = useCallback(
    (app: ApplicationType, name: string) => {
      if (editMode) {
        setSelectedElement(name);
      }
    },
    [editMode]
  );

  // Handle app drag start (in edit mode)
  const handleAppDragStart = useCallback(
    (app: ApplicationType, name: string, e: React.MouseEvent) => {
      if (!editMode || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - app.x;
      const offsetY = e.clientY - rect.top - app.y;

      setDraggingApp({ name, app });
      setDragOffset({ x: offsetX, y: offsetY });
      setSelectedElement(name);
    },
    [editMode]
  );

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingApp || !containerRef.current || !editMode) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      // Update the app position in config (as percentage)
      const xPercent = (newX / viewport.width) * 100;
      const yPercent = (newY / viewport.height) * 100;

      updateApplication(currentRoom, draggingApp.name, {
        x: Math.max(0, Math.min(100, xPercent)),
        y: Math.max(0, Math.min(100, yPercent))
      });
    },
    [draggingApp, dragOffset, editMode, viewport, currentRoom, updateApplication]
  );

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback(() => {
    if (draggingApp) {
      setDraggingApp(null);
      saveConfig?.();
    }
  }, [draggingApp, saveConfig]);

  // Handle app double click (open)
  const handleAppDoubleClick = useCallback(
    async (app: ApplicationType, name: string) => {
      if (!editMode && app.command) {
        onAppOpen?.(app, name);
        await executeCommand(app.command);
      }
    },
    [editMode, onAppOpen, executeCommand]
  );

  // Handle door click
  const handleDoorClick = useCallback(
    (door: DoorType, name: string) => {
      if (editMode) {
        setSelectedElement(name);
      }
    },
    [editMode]
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`spatial-world spatial-world-loading ${className}`}
        style={{
          width: width || viewport.width,
          height: height || viewport.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          ...customStyle,
        }}
      >
        {loadingComponent || <div>Loading world...</div>}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`spatial-world spatial-world-error ${className}`}
        style={{
          width: width || viewport.width,
          height: height || viewport.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#ef4444',
          ...customStyle,
        }}
      >
        {errorComponent ? errorComponent(error) : <div>Error: {error}</div>}
      </div>
    );
  }

  // No room data
  if (!currentRoomData || !config || !character) {
    return (
      <div
        className={`spatial-world spatial-world-empty ${className}`}
        style={{
          width: width || viewport.width,
          height: height || viewport.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#fff',
          ...customStyle,
        }}
      >
        No room data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`spatial-world ${className}`}
      style={{
        position: 'relative',
        width: width || viewport.width,
        height: height || viewport.height,
        overflow: 'hidden',
        cursor: draggingApp ? 'grabbing' : 'default',
        ...customStyle,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Room with all elements */}
      <Room
        room={currentRoomData}
        viewport={viewport}
        editMode={editMode}
        selectedElement={selectedElement}
        highlightedApp={highlightedApp}
        highlightedDoor={highlightedDoor}
        onAppClick={handleAppClick}
        onAppDoubleClick={handleAppDoubleClick}
        onAppMouseDown={handleAppDragStart}
        onDoorClick={handleDoorClick}
        onDoorHover={(door, name) => setHighlightedDoor(door ? name : undefined)}
        onAppHover={(app, name) => {
          // Don't override character-based highlighting
          if (!nearbyApp) {
            setHighlightedApp(app ? name : undefined);
          }
        }}
      >
        {/* Character */}
        <Character
          state={character}
          spriteSheets={config.userCharacter.spriteSheets}
          width={config.userCharacter.width}
          height={config.userCharacter.height}
          name={config.userCharacter.name}
          useRotation={true}
        />
      </Room>

      {/* Edit mode overlay */}
      <EditModeOverlay visible={editMode} onClose={() => setEditMode(false)} />

      {/* Hover text for nearby app */}
      {nearbyApp && !editMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 200,
          }}
        >
          Press <strong>o</strong> to open {nearbyApp.name}
        </div>
      )}

      {/* Minimap */}
      {showMinimap && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 100,
          }}
        >
          <Minimap
            room={currentRoomData}
            characterPosition={{ x: character.x, y: character.y }}
          />
        </div>
      )}

      {/* Key legend */}
      {showKeyLegend && !editMode && <KeyLegend />}

      {/* Help overlay */}
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}

      {/* Menu overlay for apps with menuItems */}
      {showMenu && menuApp && menuItems && (
        <MenuOverlay
          app={menuApp}
          menuItems={menuItems}
          onItemClick={handleMenuItemClick}
          onClose={closeAppMenu}
          editMode={isEditingMenu}
          onDeleteItem={(item) => deleteMenuItem(item.name)}
          onAddItem={addMenuItem}
          onToggleEditMode={toggleMenuEditMode}
        />
      )}

      {/* Room name indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 100,
        }}
      >
        {currentRoom}
      </div>
    </div>
  );
};
