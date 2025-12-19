/**
 * SettingsOverlay Component
 *
 * Settings for browser, media player, messages, email, calendar preferences.
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UserSettings {
  defaultBrowser: string;
  browserArgs?: string;
  defaultMediaPlayer: string;
  defaultMessages: string;
  defaultEmail: string;
  defaultCalendar: string;
  theme?: 'dark' | 'light' | 'system';
  showKeyLegend?: boolean;
  showMinimap?: boolean;
  moveSpeed?: number;
}

export interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

// =============================================================================
// Options
// =============================================================================

const BROWSER_OPTIONS = [
  { id: 'firefox', label: 'Firefox', command: 'firefox' },
  { id: 'chrome', label: 'Chrome', command: 'google-chrome' },
  { id: 'brave', label: 'Brave', command: 'brave-browser' },
  { id: 'edge', label: 'Edge', command: 'microsoft-edge' },
  { id: 'custom', label: 'Custom', command: '' },
];

const MEDIA_OPTIONS = [
  { id: 'youtube-music', label: 'YouTube Music', url: 'https://music.youtube.com', icon: '▶️' },
  { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
  { id: 'soundcloud', label: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁️' },
  { id: 'apple-music', label: 'Apple Music', url: 'https://music.apple.com', icon: '🍎' },
  { id: 'tidal', label: 'Tidal', url: 'https://listen.tidal.com', icon: '🌊' },
];

const MESSAGES_OPTIONS = [
  { id: 'google-messages', label: 'Google Messages', url: 'https://messages.google.com', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '📱' },
  { id: 'telegram', label: 'Telegram', url: 'https://web.telegram.org', icon: '✈️' },
  { id: 'discord', label: 'Discord', url: 'https://discord.com/app', icon: '🎮' },
  { id: 'slack', label: 'Slack', url: 'https://app.slack.com', icon: '💼' },
  { id: 'signal', label: 'Signal', url: 'https://signal.org', icon: '🔒' },
];

const EMAIL_OPTIONS = [
  { id: 'gmail', label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
  { id: 'outlook', label: 'Outlook', url: 'https://outlook.live.com', icon: '📬' },
  { id: 'protonmail', label: 'ProtonMail', url: 'https://mail.proton.me', icon: '🔐' },
  { id: 'yahoo', label: 'Yahoo Mail', url: 'https://mail.yahoo.com', icon: '📨' },
  { id: 'fastmail', label: 'Fastmail', url: 'https://app.fastmail.com', icon: '⚡' },
];

const CALENDAR_OPTIONS = [
  { id: 'google-calendar', label: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { id: 'outlook-calendar', label: 'Outlook', url: 'https://outlook.live.com/calendar', icon: '🗓️' },
  { id: 'notion', label: 'Notion', url: 'https://notion.so', icon: '📓' },
  { id: 'todoist', label: 'Todoist', url: 'https://todoist.com', icon: '✅' },
];

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    maxWidth: 560,
    width: '90%',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: 20,
    cursor: 'pointer',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 10,
  },
  optionGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: 13,
    color: '#ccc',
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.5)',
    color: '#fff',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btn: {
    padding: '10px 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
  btnPrimary: {
    background: '#6366f1',
    color: '#fff',
  },
  btnSecondary: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#ccc',
  },
};

// =============================================================================
// Component
// =============================================================================

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  visible,
  onClose,
  settings,
  onSave,
}) => {
  const [local, setLocal] = useState<UserSettings>(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings, visible]);

  if (!visible) return null;

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const renderOptions = (
    options: { id: string; label: string; icon?: string }[],
    selected: string,
    onChange: (id: string) => void,
    color = '#6366f1'
  ) => (
    <div style={styles.optionGrid}>
      {options.map((opt) => (
        <div
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            ...styles.option,
            ...(selected === opt.id ? {
              ...styles.optionSelected,
              borderColor: color,
              backgroundColor: `${color}20`,
            } : {}),
          }}
        >
          {opt.icon && <span>{opt.icon}</span>}
          <span>{opt.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Browser */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🌐 Browser</div>
            {renderOptions(
              BROWSER_OPTIONS,
              BROWSER_OPTIONS.find(b => b.command === local.defaultBrowser)?.id || 'firefox',
              (id) => {
                const opt = BROWSER_OPTIONS.find(b => b.id === id);
                if (opt) setLocal(prev => ({ ...prev, defaultBrowser: opt.command }));
              },
              '#3b82f6'
            )}
          </div>

          {/* Media Player */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🎵 Media Player</div>
            {renderOptions(
              MEDIA_OPTIONS,
              local.defaultMediaPlayer,
              (id) => setLocal(prev => ({ ...prev, defaultMediaPlayer: id })),
              '#ec4899'
            )}
          </div>

          {/* Messages */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>💬 Messages</div>
            {renderOptions(
              MESSAGES_OPTIONS,
              local.defaultMessages,
              (id) => setLocal(prev => ({ ...prev, defaultMessages: id })),
              '#22c55e'
            )}
          </div>

          {/* Email */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📧 Email</div>
            {renderOptions(
              EMAIL_OPTIONS,
              local.defaultEmail,
              (id) => setLocal(prev => ({ ...prev, defaultEmail: id })),
              '#f59e0b'
            )}
          </div>

          {/* Calendar */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📅 Calendar</div>
            {renderOptions(
              CALENDAR_OPTIONS,
              local.defaultCalendar,
              (id) => setLocal(prev => ({ ...prev, defaultCalendar: id })),
              '#8b5cf6'
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onClose}>
            Cancel
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
