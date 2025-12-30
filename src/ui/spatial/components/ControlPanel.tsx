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

export interface UsageLimits {
  maxTimeSeconds?: number;      // Max time allowed (in seconds)
  maxOpens?: number;            // Max number of opens/entries
  blockedAfter?: string;        // Time of day after which blocked (e.g., "22:00")
  blockedBefore?: string;       // Time of day before which blocked (e.g., "06:00")
}

export interface UsageData {
  name: string;
  timeSpent: number;
  openCount: number;
  type: 'app' | 'room';
  icon?: string;
  limits?: UsageLimits;
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
  onEditApp?: (app: AppInfo) => void;
  onSetLimits?: (name: string, type: 'app' | 'room', limits: UsageLimits | null) => void;
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

// Check if currently blocked by time-of-day
const isTimeBlocked = (limits?: UsageLimits): boolean => {
  if (!limits?.blockedAfter && !limits?.blockedBefore) return false;
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  if (limits.blockedAfter && currentTime >= limits.blockedAfter) return true;
  if (limits.blockedBefore && currentTime < limits.blockedBefore) return true;
  return false;
};

// Check if blocked by limits
const isBlocked = (data: UsageData): { blocked: boolean; reason?: string } => {
  if (!data.limits) return { blocked: false };
  if (data.limits.maxTimeSeconds && data.timeSpent >= data.limits.maxTimeSeconds) {
    return { blocked: true, reason: 'Time limit reached' };
  }
  if (data.limits.maxOpens && data.openCount >= data.limits.maxOpens) {
    return { blocked: true, reason: 'Open limit reached' };
  }
  if (isTimeBlocked(data.limits)) {
    return { blocked: true, reason: 'Blocked at this time' };
  }
  return { blocked: false };
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentRoom,
  apps = [],
  usage = [],
  onOpenApp,
  onEditApp,
  onSetLimits,
  onOpenSettings,
  onOpenWorldMap,
  onOpenAvatarEditor,
  onOpenFurniture,
  onEditRoom,
  visible = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('apps');
  const [editingLimits, setEditingLimits] = useState<{ name: string; type: 'app' | 'room' } | null>(null);
  const [limitForm, setLimitForm] = useState<UsageLimits>({});

  if (!visible) return null;

  const totalToday = usage.reduce((sum, u) => sum + u.timeSpent, 0);
  const roomUsage = usage.find(u => u.name === currentRoom && u.type === 'room');

  const startEditingLimits = (name: string, type: 'app' | 'room') => {
    const existing = usage.find(u => u.name === name && u.type === type);
    setLimitForm(existing?.limits || {});
    setEditingLimits({ name, type });
  };

  const saveLimits = () => {
    if (!editingLimits) return;
    const hasLimits = limitForm.maxTimeSeconds || limitForm.maxOpens || limitForm.blockedAfter || limitForm.blockedBefore;
    onSetLimits?.(editingLimits.name, editingLimits.type, hasLimits ? limitForm : null);
    setEditingLimits(null);
    setLimitForm({});
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
          <div style={{ padding: '12px', maxHeight: 320, overflowY: 'auto' }}>
            {/* Limit Editor Modal */}
            {editingLimits && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                borderRadius: 12,
                padding: 16,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>
                    Set Limits: {editingLimits.name}
                  </span>
                  <button onClick={() => setEditingLimits(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Max Time */}
                <div>
                  <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 4 }}>Max Time (minutes)</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={limitForm.maxTimeSeconds ? Math.floor(limitForm.maxTimeSeconds / 60) : ''}
                    onChange={(e) => setLimitForm(f => ({ ...f, maxTimeSeconds: e.target.value ? parseInt(e.target.value) * 60 : undefined }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', fontSize: 12 }}
                  />
                </div>

                {/* Max Opens */}
                <div>
                  <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 4 }}>Max Opens/Entries</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={limitForm.maxOpens || ''}
                    onChange={(e) => setLimitForm(f => ({ ...f, maxOpens: e.target.value ? parseInt(e.target.value) : undefined }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', fontSize: 12 }}
                  />
                </div>

                {/* Blocked After */}
                <div>
                  <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 4 }}>Blocked After (time of day)</label>
                  <input
                    type="time"
                    value={limitForm.blockedAfter || ''}
                    onChange={(e) => setLimitForm(f => ({ ...f, blockedAfter: e.target.value || undefined }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', fontSize: 12 }}
                  />
                </div>

                {/* Blocked Before */}
                <div>
                  <label style={{ color: '#aaa', fontSize: 11, display: 'block', marginBottom: 4 }}>Blocked Before (time of day)</label>
                  <input
                    type="time"
                    value={limitForm.blockedBefore || ''}
                    onChange={(e) => setLimitForm(f => ({ ...f, blockedBefore: e.target.value || undefined }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', fontSize: 12 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => { setLimitForm({}); saveLimits(); }}
                    style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={saveLimits}
                    style={{ flex: 1, padding: '8px', background: '#6366f1', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Apps Tab */}
            {activeTab === 'apps' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {apps.length === 0 ? (
                  <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>
                    No apps in this room
                  </div>
                ) : (
                  apps.map((app, i) => {
                    const appUsage = usage.find(u => u.name === app.name && u.type === 'app');
                    const blockStatus = appUsage ? isBlocked(appUsage) : { blocked: false };

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          background: blockStatus.blocked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                          border: blockStatus.blocked ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          opacity: blockStatus.blocked ? 0.6 : 1,
                        }}
                      >
                        {app.image ? (
                          <img src={app.image} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 18 }}>{app.icon || '📱'}</span>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#ddd', fontSize: 12 }}>{app.name}</div>
                          {blockStatus.blocked && (
                            <div style={{ color: '#ef4444', fontSize: 9 }}>{blockStatus.reason}</div>
                          )}
                          {appUsage && !blockStatus.blocked && (
                            <div style={{ color: '#666', fontSize: 9 }}>
                              {formatTime(appUsage.timeSpent)} • {appUsage.openCount} opens
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onEditApp?.(app)}
                          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', fontSize: 12 }}
                          title="Edit app"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => startEditingLimits(app.name, 'app')}
                          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', fontSize: 12 }}
                          title="Set limits"
                        >
                          ⏱️
                        </button>
                        <button
                          onClick={() => !blockStatus.blocked && onOpenApp?.(app)}
                          disabled={blockStatus.blocked}
                          style={{ background: 'none', border: 'none', color: blockStatus.blocked ? '#666' : '#888', cursor: blockStatus.blocked ? 'not-allowed' : 'pointer', padding: '4px', fontSize: 12 }}
                          title="Open"
                        >
                          ▶
                        </button>
                      </div>
                    );
                  })
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
                  [...usage].sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 10).map((item) => {
                    const maxTime = item.limits?.maxTimeSeconds;
                    const percent = getUsagePercent(item.timeSpent, maxTime);
                    const blockStatus = isBlocked(item);
                    const hasLimits = item.limits && (item.limits.maxTimeSeconds || item.limits.maxOpens || item.limits.blockedAfter || item.limits.blockedBefore);

                    return (
                      <div
                        key={`${item.type}-${item.name}`}
                        style={{
                          padding: '8px 10px',
                          background: blockStatus.blocked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                          border: blockStatus.blocked ? '1px solid rgba(239,68,68,0.2)' : '1px solid transparent',
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#aaa', fontSize: 11 }}>
                              {formatTime(item.timeSpent)}
                              {maxTime && ` / ${formatTime(maxTime)}`}
                            </span>
                            <button
                              onClick={() => startEditingLimits(item.name, item.type)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: hasLimits ? '#6366f1' : '#666',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontSize: 11,
                              }}
                              title="Set limits"
                            >
                              ⏱️
                            </button>
                          </div>
                        </div>

                        {/* Usage stats line */}
                        <div style={{ color: '#666', fontSize: 10, marginBottom: 4 }}>
                          {item.openCount} opens
                          {item.limits?.maxOpens && ` / ${item.limits.maxOpens} max`}
                          {item.limits?.blockedAfter && ` • blocked after ${item.limits.blockedAfter}`}
                          {item.limits?.blockedBefore && ` • blocked before ${item.limits.blockedBefore}`}
                        </div>

                        {/* Progress bar for time limit */}
                        {maxTime && (
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

                        {/* Block status */}
                        {blockStatus.blocked && (
                          <div style={{ color: '#ef4444', fontSize: 10 }}>
                            🚫 {blockStatus.reason}
                          </div>
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
