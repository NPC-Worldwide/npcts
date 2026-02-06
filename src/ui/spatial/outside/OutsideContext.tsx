/**
 * OutsideContext - Multiplayer outside world state management
 *
 * Provides React context for the shared multiplayer world.
 * Manages socket connection, remote players, chat, and zone navigation.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  RemotePlayer,
  OutsideChatMessage,
  CharacterDirection,
  CharacterState,
  OutsideZoneConfig,
  SpriteSheets,
  RoomConfig,
} from '../../../core/spatial';
import { useOutsideSocket, type OutsideInitData } from './useOutsideSocket';

// =============================================================================
// Context Types
// =============================================================================

export interface OutsideContextValue {
  // Connection state
  isInOutside: boolean;
  isConnected: boolean;

  // Zone state
  currentZone: string;
  zoneConfig: OutsideZoneConfig | null;
  /** zoneConfig converted to RoomConfig for use with Room component */
  zoneAsRoomConfig: RoomConfig | null;

  // Players
  remotePlayers: RemotePlayer[];
  localPlayerId: string | null;

  // Chat
  chatMessages: OutsideChatMessage[];

  // Actions
  enterOutside: (zone: string) => void;
  leaveOutside: () => void;
  broadcastMovement: (
    x: number,
    y: number,
    direction: CharacterDirection,
    frame: number,
    isMoving: boolean
  ) => void;
  sendChat: (content: string) => void;
  changeZone: (fromZone: string, toZone: string) => void;
}

const OutsideContext = createContext<OutsideContextValue | undefined>(undefined);

// =============================================================================
// Provider Props
// =============================================================================

export interface OutsideProviderProps {
  children: ReactNode;
  serverUrl: string;
  userId: string;
  playerName: string;
  avatarSettings?: any;
  spriteSheets: SpriteSheets;
  onLeave?: () => void;
}

// =============================================================================
// Provider
// =============================================================================

export const OutsideProvider: React.FC<OutsideProviderProps> = ({
  children,
  serverUrl,
  userId,
  playerName,
  avatarSettings,
  spriteSheets,
  onLeave,
}) => {
  const [isInOutside, setIsInOutside] = useState(false);
  const [currentZone, setCurrentZone] = useState('plaza');
  const [zoneConfig, setZoneConfig] = useState<OutsideZoneConfig | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<OutsideChatMessage[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const socket = useOutsideSocket({
    serverUrl,
    onInit: (data: OutsideInitData) => {
      setLocalPlayerId(data.playerId);
      setCurrentZone(data.zone);
      setZoneConfig(data.zoneConfig);
      setRemotePlayers(data.players);
      setChatMessages(data.recentChat || []);
    },
    onPlayerJoined: (player: RemotePlayer) => {
      setRemotePlayers((prev) => {
        // Don't add duplicates
        if (prev.find((p) => p.id === player.id)) return prev;
        return [...prev, player];
      });
    },
    onPlayerLeft: (playerId: string) => {
      setRemotePlayers((prev) => prev.filter((p) => p.id !== playerId));
    },
    onPlayerMoved: (data) => {
      setRemotePlayers((prev) =>
        prev.map((p) =>
          p.id === data.playerId
            ? {
                ...p,
                x: data.x,
                y: data.y,
                direction: data.direction,
                frame: data.frame,
                isMoving: data.isMoving,
              }
            : p
        )
      );
    },
    onChatMessage: (message: OutsideChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-99), message]);
    },
    onZoneData: (data) => {
      setCurrentZone(data.zone);
      setZoneConfig(data.zoneConfig);
      setRemotePlayers(data.players);
    },
  });

  const enterOutside = useCallback(
    (zone: string) => {
      setIsInOutside(true);
      setCurrentZone(zone);
      socket.connect({
        userId,
        zone,
        name: playerName,
        avatarSettings,
        spriteSheets,
      });
    },
    [socket, userId, playerName, avatarSettings, spriteSheets]
  );

  const leaveOutside = useCallback(() => {
    socket.disconnect();
    setIsInOutside(false);
    setZoneConfig(null);
    setRemotePlayers([]);
    setChatMessages([]);
    setLocalPlayerId(null);
    onLeave?.();
  }, [socket, onLeave]);

  const broadcastMovement = useCallback(
    (
      x: number,
      y: number,
      direction: CharacterDirection,
      frame: number,
      isMoving: boolean
    ) => {
      socket.broadcastMovement({ x, y, direction, frame, isMoving });
    },
    [socket]
  );

  const sendChat = useCallback(
    (content: string) => {
      socket.sendChat(content);
    },
    [socket]
  );

  const changeZone = useCallback(
    (fromZone: string, toZone: string) => {
      socket.changeZone(fromZone, toZone);
    },
    [socket]
  );

  // Convert OutsideZoneConfig to RoomConfig for use with the Room component
  const zoneAsRoomConfig: RoomConfig | null = zoneConfig
    ? {
        name: zoneConfig.name,
        walls: zoneConfig.walls,
        doors: zoneConfig.doors,
        applications: zoneConfig.applications,
        floor_image: zoneConfig.floor_image,
        floor_tile: zoneConfig.floor_tile,
        floor_tile_size: zoneConfig.floor_tile_size,
        floor_pattern: zoneConfig.floor_pattern,
        floor_pattern_size: zoneConfig.floor_pattern_size,
      }
    : null;

  const value: OutsideContextValue = {
    isInOutside,
    isConnected: socket.isConnected,
    currentZone,
    zoneConfig,
    zoneAsRoomConfig,
    remotePlayers,
    localPlayerId,
    chatMessages,
    enterOutside,
    leaveOutside,
    broadcastMovement,
    sendChat,
    changeZone,
  };

  return (
    <OutsideContext.Provider value={value}>{children}</OutsideContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export function useOutside(): OutsideContextValue {
  const context = useContext(OutsideContext);
  if (!context) {
    throw new Error('useOutside must be used within an OutsideProvider');
  }
  return context;
}
