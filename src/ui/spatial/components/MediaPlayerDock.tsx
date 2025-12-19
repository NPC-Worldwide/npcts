/**
 * BottomDock Component
 *
 * Shows selected media player, messages, email, calendar from user settings.
 */

import React, { useState, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface MediaPlayerDockProps {
  mediaPlayer: string;
  messages: string;
  email: string;
  calendar: string;
  visible?: boolean;
}

interface DockItem {
  id: string;
  icon: string;
  label: string;
  url: string;
}

// =============================================================================
// Service lookups
// =============================================================================

const MEDIA_MAP: Record<string, DockItem> = {
  'youtube-music': { id: 'youtube-music', icon: '▶️', label: 'YouTube', url: 'https://music.youtube.com' },
  'spotify': { id: 'spotify', icon: '🎵', label: 'Spotify', url: 'https://open.spotify.com' },
  'soundcloud': { id: 'soundcloud', icon: '☁️', label: 'SoundCloud', url: 'https://soundcloud.com' },
  'apple-music': { id: 'apple-music', icon: '🍎', label: 'Apple', url: 'https://music.apple.com' },
  'tidal': { id: 'tidal', icon: '🌊', label: 'Tidal', url: 'https://listen.tidal.com' },
};

const MESSAGES_MAP: Record<string, DockItem> = {
  'google-messages': { id: 'google-messages', icon: '💬', label: 'Messages', url: 'https://messages.google.com' },
  'whatsapp': { id: 'whatsapp', icon: '📱', label: 'WhatsApp', url: 'https://web.whatsapp.com' },
  'telegram': { id: 'telegram', icon: '✈️', label: 'Telegram', url: 'https://web.telegram.org' },
  'discord': { id: 'discord', icon: '🎮', label: 'Discord', url: 'https://discord.com/app' },
  'slack': { id: 'slack', icon: '💼', label: 'Slack', url: 'https://app.slack.com' },
  'signal': { id: 'signal', icon: '🔒', label: 'Signal', url: 'https://signal.org' },
};

const EMAIL_MAP: Record<string, DockItem> = {
  'gmail': { id: 'gmail', icon: '📧', label: 'Gmail', url: 'https://mail.google.com' },
  'outlook': { id: 'outlook', icon: '📬', label: 'Outlook', url: 'https://outlook.live.com' },
  'protonmail': { id: 'protonmail', icon: '🔐', label: 'Proton', url: 'https://mail.proton.me' },
  'yahoo': { id: 'yahoo', icon: '📨', label: 'Yahoo', url: 'https://mail.yahoo.com' },
  'fastmail': { id: 'fastmail', icon: '⚡', label: 'Fastmail', url: 'https://app.fastmail.com' },
};

const CALENDAR_MAP: Record<string, DockItem> = {
  'google-calendar': { id: 'google-calendar', icon: '📅', label: 'Calendar', url: 'https://calendar.google.com' },
  'outlook-calendar': { id: 'outlook-calendar', icon: '🗓️', label: 'Outlook', url: 'https://outlook.live.com/calendar' },
  'notion': { id: 'notion', icon: '📓', label: 'Notion', url: 'https://notion.so' },
  'todoist': { id: 'todoist', icon: '✅', label: 'Todoist', url: 'https://todoist.com' },
};

// Check if running in Electron
const isElectron = typeof window !== 'undefined' &&
  ((window as any).process?.type === 'renderer' ||
  (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')));

// =============================================================================
// Component
// =============================================================================

export const MediaPlayerDock: React.FC<MediaPlayerDockProps> = ({
  mediaPlayer = 'youtube-music',
  messages = 'google-messages',
  email = 'gmail',
  calendar = 'google-calendar',
  visible = true,
}) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState<'normal' | 'large'>('normal');
  const webviewRef = useRef<HTMLWebViewElement | null>(null);

  if (!visible) return null;

  const items: DockItem[] = [
    MEDIA_MAP[mediaPlayer] || MEDIA_MAP['youtube-music'],
    MESSAGES_MAP[messages] || MESSAGES_MAP['google-messages'],
    EMAIL_MAP[email] || EMAIL_MAP['gmail'],
    CALENDAR_MAP[calendar] || CALENDAR_MAP['google-calendar'],
  ];

  const activeItem = items.find(item => item.id === activePanel);

  const togglePanel = (id: string) => {
    setActivePanel(activePanel === id ? null : id);
  };

  const panelWidth = panelSize === 'large' ? 900 : 450;
  const panelHeight = panelSize === 'large' ? 650 : 400;

  return (
    <>
      {/* Embedded Panel */}
      {activePanel && activeItem && (
        <div style={{
          position: 'fixed',
          bottom: 52,
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
          {/* Header */}
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
              <button
                onClick={() => setPanelSize(panelSize === 'normal' ? 'large' : 'normal')}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
                title={panelSize === 'normal' ? 'Expand' : 'Shrink'}
              >
                {panelSize === 'normal' ? '⤢' : '⤡'}
              </button>
              <button
                onClick={() => setActivePanel(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Webview or iframe */}
          {isElectron ? (
            <webview
              ref={webviewRef as any}
              src={activeItem.url}
              style={{ flex: 1, width: '100%', border: 'none' }}
              // @ts-ignore
              allowpopups="true"
              // @ts-ignore
              useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
          ) : (
            <iframe
              src={activeItem.url}
              style={{ flex: 1, width: '100%', border: 'none', backgroundColor: '#000' }}
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
        gap: 4,
        padding: '6px 12px 4px 12px',
        background: 'linear-gradient(to top, rgba(50,35,25,0.98) 0%, rgba(70,50,35,0.95) 100%)',
        borderTop: '2px solid #6a5040',
        borderLeft: '2px solid #6a5040',
        borderTopLeftRadius: 8,
        zIndex: 100,
      }}>
        {items.map((item) => (
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
              padding: '4px 8px',
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
            <span style={{ fontSize: 8, color: activePanel === item.id ? '#fff' : '#aaa', marginTop: 1 }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
};

export default MediaPlayerDock;
