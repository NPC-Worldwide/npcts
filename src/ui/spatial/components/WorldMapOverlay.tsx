/**
 * WorldMapOverlay Component
 *
 * Shows an overview of all rooms in the spatial world and their connections.
 * Allows clicking on a room to navigate there.
 */

import React, { useMemo, useState } from 'react';
import type { SpatialWorldConfig } from '../../../core/spatial';

// =============================================================================
// Types
// =============================================================================

export interface WorldMapOverlayProps {
  visible: boolean;
  onClose: () => void;
  config: SpatialWorldConfig | null;
  currentRoom: string;
  onNavigate: (roomName: string) => void;
}

interface RoomNode {
  name: string;
  x: number;
  y: number;
  connections: string[];
  hasFloorImage: boolean;
  appCount: number;
  furnitureCount?: number;
}

interface Connection {
  from: string;
  to: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

// =============================================================================
// Layout Algorithm - Simple force-directed positioning
// =============================================================================

function calculateRoomLayout(config: SpatialWorldConfig): Map<string, { x: number; y: number }> {
  const rooms = Object.keys(config.rooms);
  const positions = new Map<string, { x: number; y: number }>();

  if (rooms.length === 0) return positions;

  // Build adjacency map
  const adjacency = new Map<string, Set<string>>();
  rooms.forEach(room => {
    adjacency.set(room, new Set());
    const roomConfig = config.rooms[room];
    if (roomConfig.doors) {
      Object.values(roomConfig.doors).forEach(door => {
        if (door.leadsTo && rooms.includes(door.leadsTo)) {
          adjacency.get(room)!.add(door.leadsTo);
        }
      });
    }
  });

  // Start with first room at center
  const visited = new Set<string>();
  const queue: { room: string; x: number; y: number; angle: number }[] = [];

  const startRoom = rooms[0];
  positions.set(startRoom, { x: 50, y: 50 });
  visited.add(startRoom);

  // BFS to position connected rooms
  const neighbors = adjacency.get(startRoom) || new Set();
  let angle = 0;
  const angleStep = (2 * Math.PI) / Math.max(neighbors.size, 1);

  neighbors.forEach(neighbor => {
    queue.push({ room: neighbor, x: 50 + Math.cos(angle) * 25, y: 50 + Math.sin(angle) * 25, angle });
    angle += angleStep;
  });

  while (queue.length > 0) {
    const { room, x, y, angle: baseAngle } = queue.shift()!;

    if (visited.has(room)) continue;
    visited.add(room);

    // Clamp position to bounds
    positions.set(room, {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y))
    });

    // Add unvisited neighbors
    const roomNeighbors = adjacency.get(room) || new Set();
    let neighborAngle = baseAngle - Math.PI / 2;
    const neighborStep = Math.PI / Math.max(roomNeighbors.size - 1, 1);

    roomNeighbors.forEach(neighbor => {
      if (!visited.has(neighbor) && !queue.some(q => q.room === neighbor)) {
        const pos = positions.get(room)!;
        queue.push({
          room: neighbor,
          x: pos.x + Math.cos(neighborAngle) * 20,
          y: pos.y + Math.sin(neighborAngle) * 20,
          angle: neighborAngle,
        });
        neighborAngle += neighborStep;
      }
    });
  }

  // Position any disconnected rooms
  let disconnectedY = 85;
  rooms.forEach(room => {
    if (!positions.has(room)) {
      positions.set(room, { x: 50, y: disconnectedY });
      disconnectedY -= 15;
    }
  });

  return positions;
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 24,
    padding: 0,
    width: '90%',
    maxWidth: 900,
    height: '80vh',
    maxHeight: 700,
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    animation: 'slideUp 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 28px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#9ca3af',
    fontSize: 13,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 10,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 22,
    transition: 'all 0.2s',
  },
  mapContainer: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
    backgroundColor: '#12121a',
  },
  mapSvg: {
    width: '100%',
    height: '100%',
  },
  legend: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: 12,
    padding: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  stats: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: 150,
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#e5e7eb',
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    color: '#3b82f6',
    fontWeight: 600,
  },
};

// =============================================================================
// WorldMapOverlay Component
// =============================================================================

export const WorldMapOverlay: React.FC<WorldMapOverlayProps> = ({
  visible,
  onClose,
  config,
  currentRoom,
  onNavigate,
}) => {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Calculate room positions and connections
  const { nodes, connections, stats } = useMemo(() => {
    if (!config) {
      return { nodes: [], connections: [], stats: { rooms: 0, doors: 0, apps: 0 } };
    }

    const positions = calculateRoomLayout(config);
    const roomNodes: RoomNode[] = [];
    const roomConnections: Connection[] = [];
    const processedConnections = new Set<string>();

    let totalDoors = 0;
    let totalApps = 0;

    Object.entries(config.rooms).forEach(([name, roomConfig]) => {
      const pos = positions.get(name) || { x: 50, y: 50 };
      const connections: string[] = [];

      if (roomConfig.doors) {
        Object.values(roomConfig.doors).forEach(door => {
          if (door.leadsTo) {
            connections.push(door.leadsTo);
            totalDoors++;

            // Create connection line (avoid duplicates)
            const connKey = [name, door.leadsTo].sort().join('-');
            if (!processedConnections.has(connKey)) {
              processedConnections.add(connKey);
              const toPos = positions.get(door.leadsTo);
              if (toPos) {
                roomConnections.push({
                  from: name,
                  to: door.leadsTo,
                  fromX: pos.x,
                  fromY: pos.y,
                  toX: toPos.x,
                  toY: toPos.y,
                });
              }
            }
          }
        });
      }

      const appCount = roomConfig.applications ? Object.keys(roomConfig.applications).length : 0;
      totalApps += appCount;

      roomNodes.push({
        name,
        x: pos.x,
        y: pos.y,
        connections,
        hasFloorImage: !!roomConfig.floor_image,
        appCount,
      });
    });

    return {
      nodes: roomNodes,
      connections: roomConnections,
      stats: {
        rooms: roomNodes.length,
        doors: totalDoors / 2, // Each door counted twice
        apps: totalApps,
      },
    };
  }, [config]);

  if (!visible) return null;

  const handleRoomClick = (roomName: string) => {
    onNavigate(roomName);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .room-node {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .room-node:hover {
          filter: brightness(1.2);
        }
        .connection-line {
          stroke-dasharray: 8 4;
          animation: dash 20s linear infinite;
        }
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
      `}</style>

      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleContainer}>
              <div style={styles.titleIcon}>🗺️</div>
              <div>
                <h2 style={styles.title}>World Map</h2>
                <p style={styles.subtitle}>Click a room to navigate</p>
              </div>
            </div>
            <button
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              ×
            </button>
          </div>

          {/* Map */}
          <div style={styles.mapContainer}>
            <svg style={styles.mapSvg} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Connection lines */}
              {connections.map((conn, i) => (
                <g key={`conn-${i}`}>
                  {/* Glow effect */}
                  <line
                    x1={conn.fromX}
                    y1={conn.fromY}
                    x2={conn.toX}
                    y2={conn.toY}
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="1"
                    filter="url(#glow)"
                  />
                  {/* Main line */}
                  <line
                    className="connection-line"
                    x1={conn.fromX}
                    y1={conn.fromY}
                    x2={conn.toX}
                    y2={conn.toY}
                    stroke="rgba(59, 130, 246, 0.6)"
                    strokeWidth="0.5"
                  />
                </g>
              ))}

              {/* Room nodes */}
              {nodes.map((node) => {
                const isCurrent = node.name === currentRoom;
                const isHovered = node.name === hoveredRoom;
                const size = isCurrent ? 6 : 5;

                return (
                  <g
                    key={node.name}
                    className="room-node"
                    onClick={() => handleRoomClick(node.name)}
                    onMouseEnter={() => setHoveredRoom(node.name)}
                    onMouseLeave={() => setHoveredRoom(null)}
                  >
                    {/* Outer glow for current room */}
                    {isCurrent && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size + 2}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.3"
                        opacity="0.5"
                        style={{ animation: 'pulse 2s ease-in-out infinite' }}
                      />
                    )}

                    {/* Room circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size}
                      fill={isCurrent ? '#3b82f6' : node.hasFloorImage ? '#4ade80' : '#6b7280'}
                      stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.3)'}
                      strokeWidth={isHovered ? '0.5' : '0.2'}
                      filter={isCurrent || isHovered ? 'url(#glow)' : undefined}
                    />

                    {/* App count indicator */}
                    {node.appCount > 0 && (
                      <g>
                        <circle
                          cx={node.x + 3}
                          cy={node.y - 3}
                          r="2"
                          fill="#f59e0b"
                        />
                        <text
                          x={node.x + 3}
                          y={node.y - 2.2}
                          textAnchor="middle"
                          fontSize="2"
                          fill="#000"
                          fontWeight="bold"
                        >
                          {node.appCount}
                        </text>
                      </g>
                    )}

                    {/* Room name label */}
                    <text
                      x={node.x}
                      y={node.y + size + 3}
                      textAnchor="middle"
                      fontSize="3"
                      fill={isCurrent ? '#3b82f6' : '#9ca3af'}
                      fontWeight={isCurrent ? 'bold' : 'normal'}
                    >
                      {node.name}
                    </text>

                    {/* "You are here" indicator */}
                    {isCurrent && (
                      <text
                        x={node.x}
                        y={node.y - size - 2}
                        textAnchor="middle"
                        fontSize="2"
                        fill="#3b82f6"
                      >
                        You are here
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#3b82f6' }} />
                <span>Current Room</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#4ade80' }} />
                <span>Has Background</span>
              </div>
              <div style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: '#6b7280' }} />
                <span>Default Room</span>
              </div>
              <div style={{ ...styles.legendItem, marginBottom: 0 }}>
                <div style={{ ...styles.legendDot, backgroundColor: '#f59e0b' }} />
                <span>Apps</span>
              </div>
            </div>

            {/* Stats */}
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span>Rooms</span>
                <span style={styles.statValue}>{stats.rooms}</span>
              </div>
              <div style={styles.statItem}>
                <span>Connections</span>
                <span style={styles.statValue}>{Math.round(stats.doors)}</span>
              </div>
              <div style={{ ...styles.statItem, marginBottom: 0 }}>
                <span>Applications</span>
                <span style={styles.statValue}>{stats.apps}</span>
              </div>
            </div>

            {/* Hovered room info */}
            {hoveredRoom && hoveredRoom !== currentRoom && (
              <div style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                backgroundColor: 'rgba(30, 30, 46, 0.95)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                minWidth: 180,
              }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  {hoveredRoom}
                </div>
                <div style={{ color: '#3b82f6', fontSize: 12 }}>
                  Click to teleport
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WorldMapOverlay;
