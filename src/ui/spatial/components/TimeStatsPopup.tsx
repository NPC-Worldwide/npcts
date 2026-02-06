/**
 * TimeStatsPopup - Click-to-show time tracking stats
 *
 * Shows session time, daily/weekly/monthly breakdown for current room
 */

import React from 'react';

export interface TimeStatsPopupProps {
  visible: boolean;
  onClose: () => void;
  roomName: string;
  sessionTime: number;
  dailyTime: number;
  weeklyTime: number;
  monthlyTime: number;
  // Position near the click
  anchorX?: number;
  anchorY?: number;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const formatTimeDetailed = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export const TimeStatsPopup: React.FC<TimeStatsPopupProps> = ({
  visible,
  onClose,
  roomName,
  sessionTime,
  dailyTime,
  weeklyTime,
  monthlyTime,
}) => {
  if (!visible) return null;

  const stats = [
    { label: 'This Session', value: sessionTime, color: '#60a5fa' },
    { label: 'Today', value: dailyTime, color: '#34d399' },
    { label: 'This Week', value: weeklyTime, color: '#a78bfa' },
    { label: 'This Month', value: monthlyTime, color: '#f472b6' },
  ];

  // Find the max for the bar visualization
  const maxTime = Math.max(...stats.map(s => s.value), 1);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 199,
        }}
        onClick={onClose}
      />

      {/* Popup */}
      <div style={{
        position: 'fixed',
        bottom: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        minWidth: 240,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div>
            <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>
              {roomName}
            </div>
            <div style={{ color: '#64748b', fontSize: 10 }}>
              Time Tracking
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 14,
              padding: 4,
            }}
          >
            x
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{stat.label}</span>
                <span style={{ color: stat.color, fontSize: 12, fontWeight: 500 }}>
                  {formatTimeDetailed(stat.value)}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(stat.value / maxTime) * 100}%`,
                  backgroundColor: stat.color,
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#475569',
          fontSize: 9,
          textAlign: 'center',
        }}>
          Click anywhere to close
        </div>
      </div>
    </>
  );
};

export default TimeStatsPopup;
