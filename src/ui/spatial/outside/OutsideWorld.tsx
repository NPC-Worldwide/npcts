/**
 * OutsideWorld - Multiplayer world renderer
 *
 * Renders the shared outside zone using existing Room/Character components.
 * Handles local player movement, broadcasts position, and renders remote players.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import type {
  CharacterState,
  CharacterDirection,
  ViewportDimensions,
  Door as DoorType,
  SpriteSheets,
} from '../../../core/spatial';
import { Room } from '../components/Room';
import { Character } from '../components/Character';
import type { AvatarSettings } from '../components/Character';
import {
  roomConfigToPixels,
  calculateViewportDimensions,
} from '../utils/transforms';
import {
  checkAllCollisions,
} from '../utils/collision';
import { TASKBAR_HEIGHT } from '../components/MediaPlayerDock';
import { useOutside } from './OutsideContext';
import { OutsideChatOverlay } from './OutsideChatOverlay';

// =============================================================================
// Props
// =============================================================================

export interface OutsideWorldProps {
  width: number;
  height: number;
  spriteSheets: SpriteSheets;
  characterWidth?: number;
  characterHeight?: number;
  avatarSettings?: AvatarSettings;
  moveSpeed?: number;
  onReturnHome?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const OutsideWorld: React.FC<OutsideWorldProps> = ({
  width,
  height,
  spriteSheets,
  characterWidth = 48,
  characterHeight = 48,
  avatarSettings,
  moveSpeed = 5,
  onReturnHome,
}) => {
  const {
    isConnected,
    currentZone,
    zoneAsRoomConfig,
    remotePlayers,
    localPlayerId,
    chatMessages,
    broadcastMovement,
    sendChat,
    leaveOutside,
    changeZone,
  } = useOutside();

  // Local character state
  const [character, setCharacter] = useState<CharacterState>({
    x: width / 2,
    y: height / 2,
    direction: 'down',
    frame: 0,
    isMoving: false,
  });

  // Keys currently pressed
  const keysPressed = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>(0);

  // Viewport
  const viewport = useMemo(
    () => calculateViewportDimensions(width, height - TASKBAR_HEIGHT),
    [width, height]
  );

  // Convert zone config to pixel Room data
  const roomData = useMemo(() => {
    if (!zoneAsRoomConfig) return null;
    return roomConfigToPixels(zoneAsRoomConfig, viewport);
  }, [zoneAsRoomConfig, viewport]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if typing in chat
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      keysPressed.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Movement loop
  useEffect(() => {
    if (!roomData) return;

    let lastTime = 0;
    const FRAME_INTERVAL = 1000 / 60; // 60fps

    const gameLoop = (timestamp: number) => {
      if (timestamp - lastTime < FRAME_INTERVAL) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastTime = timestamp;

      const keys = keysPressed.current;
      let dx = 0;
      let dy = 0;

      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= moveSpeed;
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += moveSpeed;
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= moveSpeed;
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += moveSpeed;

      if (dx === 0 && dy === 0) {
        setCharacter((prev) => (prev.isMoving ? { ...prev, isMoving: false } : prev));
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      setCharacter((prev) => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;

        // Determine direction
        let direction: CharacterDirection = prev.direction;
        if (dy < 0) direction = 'up';
        else if (dy > 0) direction = 'down';
        else if (dx < 0) direction = 'left';
        else if (dx > 0) direction = 'right';

        // Check collisions
        const collision = checkAllCollisions(
          { x: newX, y: newY },
          { width: characterWidth, height: characterHeight },
          roomData.walls,
          roomData.doors,
          roomData.applications
        );

        // Door collision -> zone change or return home
        if (collision.collidingDoor) {
          const door = collision.collidingDoor.door;
          if (door.leadsTo === '__HOME__') {
            onReturnHome?.();
            leaveOutside();
            return prev;
          }
          // Zone change
          changeZone(currentZone, door.leadsTo);
          return prev;
        }

        if (!collision.canMove) {
          return { ...prev, direction, isMoving: false };
        }

        const sameDirection = prev.direction === direction;
        const newState = {
          x: newX,
          y: newY,
          direction,
          frame: sameDirection ? (prev.frame + 1) % 3 : 0,
          isMoving: true,
        };

        // Broadcast to server
        broadcastMovement(newX, newY, direction, newState.frame, true);

        return newState;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [roomData, moveSpeed, characterWidth, characterHeight, broadcastMovement, currentZone, changeZone, leaveOutside, onReturnHome]);

  // Return home handler
  const handleReturnHome = useCallback(() => {
    onReturnHome?.();
    leaveOutside();
  }, [onReturnHome, leaveOutside]);

  if (!roomData || !zoneAsRoomConfig) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#95d5b2',
          fontSize: 20,
        }}
      >
        Connecting to outside world...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      {/* The zone rendered as a Room */}
      <Room room={roomData} viewport={viewport}>
        {/* Local player character */}
        <Character
          state={character}
          spriteSheets={spriteSheets}
          width={characterWidth}
          height={characterHeight}
          name={avatarSettings?.name || 'You'}
          avatarSettings={avatarSettings}
          useRotation={true}
        />

        {/* Remote players */}
        {remotePlayers
          .filter((p) => p.id !== localPlayerId)
          .map((player) => (
            <Character
              key={player.id}
              state={{
                x: player.x,
                y: player.y,
                direction: player.direction,
                frame: player.frame,
                isMoving: player.isMoving,
              }}
              spriteSheets={player.spriteSheets}
              width={characterWidth}
              height={characterHeight}
              name={player.name}
              avatarSettings={player.avatarSettings as AvatarSettings | undefined}
              useRotation={true}
            />
          ))}
      </Room>

      {/* Online Status Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(45, 106, 79, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 200,
        }}
      >
        {/* Left: Return Home */}
        <button
          onClick={handleReturnHome}
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#e5e7eb',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>&#8592;</span> Home
        </button>

        {/* Center: Zone Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Online indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(45, 106, 79, 0.3)',
            padding: '4px 12px',
            borderRadius: 12,
            border: '1px solid rgba(45, 106, 79, 0.5)',
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isConnected ? '#40916c' : '#ef4444',
              boxShadow: isConnected ? '0 0 8px #40916c' : 'none',
            }} />
            <span style={{ color: '#95d5b2', fontSize: 11, fontWeight: 500 }}>
              ONLINE
            </span>
          </div>

          {/* Room name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
              {currentZone}
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>
              Online Room
            </div>
          </div>

          {/* Player count */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '4px 12px',
            borderRadius: 12,
          }}>
            <span style={{ fontSize: 12 }}>👥</span>
            <span style={{ color: '#94a3b8', fontSize: 11 }}>
              {remotePlayers.length + 1} online
            </span>
          </div>
        </div>

        {/* Right: Connection status & info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            color: isConnected ? '#95d5b2' : '#fca5a5',
            fontSize: 10,
          }}>
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Chat overlay */}
      <OutsideChatOverlay
        messages={chatMessages}
        onSend={sendChat}
        playerName={avatarSettings?.name || 'Player'}
      />
    </div>
  );
};
