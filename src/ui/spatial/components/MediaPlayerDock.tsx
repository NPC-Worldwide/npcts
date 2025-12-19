/**
 * BottomDock Component
 *
 * Embedded dock in bottom wall with media player, messages, email, calendar.
 * Uses webview for Electron to bypass X-Frame-Options.
 */

import React, { useState, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface MediaPlayerDockProps {
  visible?: boolean;
}

interface DockItem {
  id: string;
  icon: string;
  label: string;
  url: string;
}

// =============================================================================
// Services
// =============================================================================

const MEDIA_SERVICES: DockItem[] = [
  { id: 'youtube-music', icon: '▶️', label: 'YouTube', url: 'https://music.youtube.com' },
  { id: 'spotify', icon: '🎵', label: 'Spotify', url: 'https://open.spotify.com' },
  { id: 'soundcloud', icon: '☁️', label: 'SoundCloud', url: 'https://soundcloud.com' },
  { id: 'apple-music', icon: '🍎', label: 'Apple', url: 'https://music.apple.com' },
  { id: 'vlc', icon: '🎬', label: 'VLC', url: 'https://www.videolan.org/vlc/' },
];

const COMM_SERVICES: DockItem[] = [
  { id: 'messages', icon: '💬', label: 'Messages', url: 'https://messages.google.com' },
  { id: 'email', icon: '📧', label: 'Email', url: 'https://mail.google.com' },
  { id: 'calendar', icon: '📅', label: 'Calendar', url: 'https://calendar.google.com' },
];

// Check if running in Electron
const isElectron = typeof window !== 'undefined' &&
  (window as any).process?.type === 'renderer' ||
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

// =============================================================================
// Component
// =============================================================================

export const MediaPlayerDock: React.FC<MediaPlayerDockProps> = ({
  visible = true,
}) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState<'normal' | 'large'>('normal');
  const webviewRef = useRef<HTMLWebViewElement | null>(null);

  if (!visible) return null;

  const allItems: DockItem[] = [
    ...MEDIA_SERVICES,
    ...COMM_SERVICES,
  ];

  const activeItem = allItems.find(item => item.id === activePanel);

  const togglePanel = (id: string) => {
    if (activePanel === id) {
      setActivePanel(null);
    } else {
      setActivePanel(id);
    }
  };

  const panelWidth = panelSize === 'large' ? 900 : 450;
  const panelHeight = panelSize === 'large' ? 650 : 400;

  return (
    <>
      {/* Embedded Panel */}
      {activePanel && activeItem && (
        <div style={{
          position: 'fixed',
          bottom: 56,
          right: 8,
          width: panelWidth,
          height: panelHeight,
          backgroundColor: '#1a1a1a',
          border: '2px solid #5a4030',
          borderRadius: 8,
          overflow: 'hidden',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Panel Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            backgroundColor: '#2a2a2a',
            borderBottom: '1px solid #444',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
              {activeItem.icon} {activeItem.label}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {/* Size toggle */}
              <button
                onClick={() => setPanelSize(panelSize === 'normal' ? 'large' : 'normal')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 6px',
                }}
                title={panelSize === 'normal' ? 'Expand' : 'Shrink'}
              >
                {panelSize === 'normal' ? '⤢' : '⤡'}
              </button>
              {/* Close */}
              <button
                onClick={() => setActivePanel(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Embedded content - use webview in Electron, iframe otherwise */}
          {isElectron ? (
            <webview
              ref={webviewRef as any}
              src={activeItem.url}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
              }}
              // @ts-ignore - webview attributes
              allowpopups="true"
              // @ts-ignore
              useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
          ) : (
            <iframe
              src={activeItem.url}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
                backgroundColor: '#000',
              }}
              allow="autoplay; encrypted-media; fullscreen"
              title={activeItem.label}
            />
          )}
        </div>
      )}

      {/* Dock Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        padding: '6px 12px 4px 12px',
        background: 'linear-gradient(to top, rgba(50,35,25,0.98) 0%, rgba(70,50,35,0.95) 100%)',
        borderTop: '2px solid #6a5040',
        borderLeft: '2px solid #6a5040',
        borderTopLeftRadius: 8,
        zIndex: 100,
      }}>
        {/* Media Services */}
        {MEDIA_SERVICES.map((item) => (
          <button
            key={item.id}
            onClick={() => togglePanel(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            title={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4px 6px',
              background: activePanel === item.id
                ? 'rgba(255,255,255,0.2)'
                : hoveredItem === item.id
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
              border: activePanel === item.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{
              fontSize: 8,
              color: activePanel === item.id ? '#fff' : '#aaa',
              marginTop: 1,
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </button>
        ))}

        {/* Separator */}
        <div style={{
          width: 1,
          height: 32,
          backgroundColor: '#6a5040',
          margin: '0 4px',
        }} />

        {/* Communication Services */}
        {COMM_SERVICES.map((item) => (
          <button
            key={item.id}
            onClick={() => togglePanel(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            title={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4px 6px',
              background: activePanel === item.id
                ? 'rgba(255,255,255,0.2)'
                : hoveredItem === item.id
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
              border: activePanel === item.id ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{
              fontSize: 8,
              color: activePanel === item.id ? '#fff' : '#aaa',
              marginTop: 1,
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};

export default MediaPlayerDock;
