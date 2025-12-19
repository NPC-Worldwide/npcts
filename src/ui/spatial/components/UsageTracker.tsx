/**
 * UsageTracker Component
 *
 * Bottom-left menu showing time spent in apps/rooms with usage limits.
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UsageData {
  /** App or room name */
  name: string;
  /** Time spent in seconds */
  timeSpent: number;
  /** Optional daily limit in seconds */
  limit?: number;
  /** Category: app or room */
  type: 'app' | 'room';
  /** Icon or emoji */
  icon?: string;
}

export interface UsageTrackerProps {
  /** Current usage data */
  usage: UsageData[];
  /** Called when user sets a limit */
  onSetLimit?: (name: string, limitSeconds: number | null) => void;
  /** Whether the tracker is visible */
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

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  usage = [],
  onSetLimit,
  visible = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  if (!visible) return null;

  const totalToday = usage.reduce((sum, u) => sum + u.timeSpent, 0);
  const topItems = [...usage].sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 5);

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
            padding: '6px 12px',
            background: 'linear-gradient(to top, rgba(50,35,25,0.95) 0%, rgba(70,50,35,0.9) 100%)',
            border: '1px solid #6a5040',
            borderRadius: 6,
            color: '#ccc',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 90,
          }}
          title="View usage stats"
        >
          <span>📊</span>
          <span>{formatTime(totalToday)}</span>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: 'fixed',
            bottom: 4,
            left: 8,
            width: 280,
            background: 'linear-gradient(to top, rgba(30,25,20,0.98) 0%, rgba(50,40,30,0.95) 100%)',
            border: '1px solid #6a5040',
            borderRadius: 10,
            zIndex: 91,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              📊 Today's Usage
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#aaa', fontSize: 12 }}>{formatTime(totalToday)}</span>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Usage list */}
          <div style={{ padding: '8px 12px', maxHeight: 250, overflowY: 'auto' }}>
            {topItems.length === 0 ? (
              <div style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 16 }}>
                No usage data yet
              </div>
            ) : (
              topItems.map((item) => {
                const percent = getUsagePercent(item.timeSpent, item.limit);
                const isEditing = editingLimit === item.name;

                return (
                  <div
                    key={item.name}
                    style={{
                      marginBottom: 10,
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: '#ddd', fontSize: 12 }}>
                        {item.icon || (item.type === 'room' ? '🏠' : '📱')} {item.name}
                      </span>
                      <span style={{ color: '#aaa', fontSize: 11 }}>
                        {formatTime(item.timeSpent)}
                        {item.limit && ` / ${formatTime(item.limit)}`}
                      </span>
                    </div>

                    {/* Progress bar (only if limit set) */}
                    {item.limit && (
                      <div
                        style={{
                          height: 4,
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          overflow: 'hidden',
                          marginBottom: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: getBarColor(percent),
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    )}

                    {/* Limit controls */}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
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
                            width: 60,
                            padding: '2px 6px',
                            fontSize: 11,
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
                            padding: '2px 8px',
                            fontSize: 10,
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: 4,
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          Set
                        </button>
                        <button
                          onClick={() => setEditingLimit(null)}
                          style={{
                            padding: '2px 8px',
                            fontSize: 10,
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: 4,
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
                          padding: '2px 6px',
                          fontSize: 10,
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                        }}
                      >
                        {item.limit ? '⏱ Edit limit' : '⏱ Set limit'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UsageTracker;
