/**
 * useOutsideSocket - Socket.IO hook for outside multiplayer world
 *
 * Wraps socket.io-client with React state management.
 * Consumers must install socket.io-client as a peer dependency.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  RemotePlayer,
  OutsideChatMessage,
  CharacterDirection,
  OutsideZoneConfig,
  SpriteSheets,
} from '../../../core/spatial';

export interface OutsideInitData {
  playerId: string;
  zone: string;
  zoneConfig: OutsideZoneConfig;
  players: RemotePlayer[];
  recentChat: OutsideChatMessage[];
}

export interface UseOutsideSocketOptions {
  serverUrl: string;
  onInit?: (data: OutsideInitData) => void;
  onPlayerJoined?: (player: RemotePlayer) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerMoved?: (data: {
    playerId: string;
    x: number;
    y: number;
    direction: CharacterDirection;
    frame: number;
    isMoving: boolean;
  }) => void;
  onChatMessage?: (message: OutsideChatMessage) => void;
  onZoneData?: (data: {
    zone: string;
    zoneConfig: OutsideZoneConfig;
    players: RemotePlayer[];
  }) => void;
}

export function useOutsideSocket(options: UseOutsideSocketOptions) {
  const { serverUrl } = options;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Throttle reference for movement
  const lastMoveTime = useRef(0);
  const MOVE_THROTTLE_MS = 66; // ~15 updates/sec

  const connect = useCallback(
    (joinData: {
      userId: string;
      zone: string;
      name: string;
      avatarSettings?: any;
      spriteSheets: SpriteSheets;
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }

      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        // Join the outside world
        socket.emit('outside_join', joinData);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('outside_init', (data: OutsideInitData) => {
        optionsRef.current.onInit?.(data);
      });

      socket.on('outside_player_joined', (data: { player: RemotePlayer }) => {
        optionsRef.current.onPlayerJoined?.(data.player);
      });

      socket.on('outside_player_left', (data: { playerId: string }) => {
        optionsRef.current.onPlayerLeft?.(data.playerId);
      });

      socket.on(
        'outside_player_moved',
        (data: {
          playerId: string;
          x: number;
          y: number;
          direction: CharacterDirection;
          frame: number;
          isMoving: boolean;
        }) => {
          optionsRef.current.onPlayerMoved?.(data);
        }
      );

      socket.on('outside_chat_message', (message: OutsideChatMessage) => {
        optionsRef.current.onChatMessage?.(message);
      });

      socket.on(
        'outside_zone_data',
        (data: {
          zone: string;
          zoneConfig: OutsideZoneConfig;
          players: RemotePlayer[];
        }) => {
          optionsRef.current.onZoneData?.(data);
        }
      );
    },
    [serverUrl]
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('outside_leave', {});
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const broadcastMovement = useCallback(
    (data: {
      x: number;
      y: number;
      direction: CharacterDirection;
      frame: number;
      isMoving: boolean;
    }) => {
      const now = Date.now();
      if (now - lastMoveTime.current < MOVE_THROTTLE_MS) return;
      lastMoveTime.current = now;

      socketRef.current?.emit('outside_move', data);
    },
    []
  );

  const sendChat = useCallback((content: string) => {
    socketRef.current?.emit('outside_chat', { content });
  }, []);

  const changeZone = useCallback((fromZone: string, toZone: string) => {
    socketRef.current?.emit('outside_zone_change', { fromZone, toZone });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    broadcastMovement,
    sendChat,
    changeZone,
  };
}
