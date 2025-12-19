/**
 * ControlPanel Component
 *
 * Comprehensive bottom-left control panel with:
 * - Usage stats and time limits
 * - Apps in current room
 * - Quick access to settings, map, avatar, furniture, room edit
 */

import React, { useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UsageData {
  name: string;
  timeSpent: number;
  limit?: number;
  type: 'app' | 'room';
  icon?: string;
}

export interface AppInfo {
  name: string;
  command: string;
  icon?: string;
  image?: string;
}

export interface ControlPanelProps {
  /** Current room name */
  currentRoom: string;
  /** Apps in current room */
  apps: AppInfo[];
  /** Usage data */
  usage: UsageData[];
  /** Callbacks */
  onOpenApp?: (app: AppInfo) => void;
  onSetLimit?: (name: string, limitSeconds: number | null) => void;
  onOpenSettings?: () => void;
  onOpenWorldMap?: () => void;
  onOpenAvatarEditor?: () => void;
  onOpenFurniture?: () => void;
  onEditRoom?: () => void;
  /** Visibility */
  visible?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getUsagePercent = (spent: number, limit?: number): number => {
  if (!limit) return 0;
  return Math.min(100, (spent / limit) * 100);
};

const getBarColor = (percent: number): string => {
  if (percent >= 100) return '#ef4444';
  if (percent >= 80) return '#f59e0b';
  if (percent >= 50) return '#eab308';
  return '#22c55e';
};

// =============================================================================
// Component
// =============================================================================

type TabKey = 'apps' | 'stats' | 'tools';

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentRoom,
  apps = [],
  usage = [],
  onOpenApp,
  onSetLimit,
  onOpenSettings,
  onOpenWorldMap,
  onOpenAvatarEditor,
  onOpenFurniture,
  onEditRoom,
  visible = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('apps');
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  if (!visible) return null;

  const totalToday = usage.reduce((sum, u) => sum + u.timeSpent, 0);
  const roomUsage = usage.find(u => u.name === currentRoom && u.type === 'room');

  const handleSetLimit = (name: string) => {
    const mins = parseInt(limitInput, 10);
    if (!isNaN(mins) && mins > 0) {
      onSetLimit?.(name, mins * 60);
    } else if (limitInput === '' || limitInput === '0') {
      onSetLimit?.(name, null);
    }
    setEditingLimit(null);
    setLimitInput('');
  };

  const toolButtons = [
    { icon: '🗺️', label: 'World Map', action: onOpenWorldMap, color: '#3b82f6' },
    { icon: '🎭', label: 'Avatar', action: onOpenAvatarEditor, color: '#ec4899' },
    { icon: '🪑', label: 'Furniture', action: onOpenFurniture, color: '#f59e0b' },
    { icon: '🏠', label: 'Edit Room', action: onEditRoom, color: '#10b981' },
    { icon: '⚙️', label: 'Settings', action: onOpenSettings, color: '#6366f1' },
  ];

  return (
    <>
      {/* Collapsed button */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            position: 'fixed',
            bottom: 4,
            left: 8,
            padding: '8px 14px',
            background: 'linear-gradient(to top, rgba(50,35,25,0.95) 0%, rgba(70,50,35,0.9) 100%)',
            border: '1px solid #6a5040',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 90,
          }}
          title="Open control panel"
        >
          <span>{currentRoom}</span>
          <span style={{ color: '#888', fontSize: 11 }}>|</span>
          <span style={{ color: '#aaa', fontSize: 11 }}>{formatTime(totalToday)}</span>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: 'fixed',
            bottom: 4,
            left: 8,
            width: 320,
            background: 'linear-gradient(to top, rgba(25,20,18,0.98) 0%, rgba(45,35,28,0.95) 100%)',
            border: '1px solid #6a5040',
            borderRadius: 12,
            zIndex: 91,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                {currentRoom}
              </div>
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                {formatTime(roomUsage?.timeSpent || 0)} in room | {formatTime(totalToday)} total
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#888',
                cursor: 'pointer',
                fontSize: 12,
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            {(['apps', 'stats', 'tools'] as TabKey[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                  color: activeTab === tab ? '#fff' : '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'apps' && '📱 Apps'}
                {tab === 'stats' && '📊 Stats'}
                {tab === 'tools' && '🔧 Tools'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '12px', maxHeight: 280, overflowY: 'auto' }}>
            {/* Apps Tab */}
            {activeTab === 'apps' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {apps.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    No apps in this room
                  </div>
                ) : (
                  apps.map((app, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenApp?.(app)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#ddd',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }}
                    >
                      {app.image ? (
                        <img src={app.image} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>{app.icon || '📱'}</span>
                      )}
                      <span style={{ flex: 1 }}>{app.name}</span>
                      <span style={{ color: '#666', fontSize: 10 }}>▶</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {usage.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    No usage data yet
                  </div>
                ) : (
                  [...usage].sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 8).map((item) => {
                    const percent = getUsagePercent(item.timeSpent, item.limit);
                    const isEditing = editingLimit === item.name;

                    return (
                      <div
                        key={`${item.type}-${item.name}`}
                        style={{
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 6,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}>
                          <span style={{ color: '#ddd', fontSize: 12 }}>
                            {item.type === 'room' ? '🏠' : '📱'} {item.name}
                          </span>
                          <span style={{ color: '#aaa', fontSize: 11 }}>
                            {formatTime(item.timeSpent)}
                            {item.limit && ` / ${formatTime(item.limit)}`}
                          </span>
                        </div>

                        {item.limit && (
                          <div style={{
                            height: 3,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            marginBottom: 4,
                          }}>
                            <div style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: getBarColor(percent),
                            }} />
                          </div>
                        )}

                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input
                              type="number"
                              placeholder="mins"
                              value={limitInput}
                              onChange={(e) => setLimitInput(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSetLimit(item.name);
                                if (e.key === 'Escape') setEditingLimit(null);
                              }}
                              style={{
                                width: 50,
                                padding: '2px 6px',
                                fontSize: 10,
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 4,
                                color: '#fff',
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSetLimit(item.name)}
                              style={{
                                padding: '2px 6px',
                                fontSize: 9,
                                background: '#22c55e',
                                border: 'none',
                                borderRadius: 3,
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              Set
                            </button>
                            <button
                              onClick={() => setEditingLimit(null)}
                              style={{
                                padding: '2px 6px',
                                fontSize: 9,
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: 3,
                                color: '#aaa',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLimit(item.name);
                              setLimitInput(item.limit ? String(item.limit / 60) : '');
                            }}
                            style={{
                              padding: '2px 4px',
                              fontSize: 9,
                              background: 'transparent',
                              border: 'none',
                              color: '#666',
                              cursor: 'pointer',
                            }}
                          >
                            {item.limit ? 'Edit limit' : 'Set limit'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tools Tab */}
            {activeTab === 'tools' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                {toolButtons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      btn.action?.();
                      setExpanded(false);
                    }}
                    disabled={!btn.action}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '14px 8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#ddd',
                      fontSize: 11,
                      cursor: btn.action ? 'pointer' : 'not-allowed',
                      opacity: btn.action ? 1 : 0.5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (btn.action) {
                        e.currentTarget.style.background = `${btn.color}30`;
                        e.currentTarget.style.borderColor = btn.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ControlPanel;
