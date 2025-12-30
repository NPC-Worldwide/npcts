/**
 * SettingsOverlay Component
 *
 * Settings for browser, media player, messages, email, calendar preferences.
 * Users can select MULTIPLE services per category.
 */

import React, { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UserSettings {
  defaultBrowser: string;
  browserArgs?: string;
  mediaPlayers: string[];  // Multiple selections
  messagesApps: string[];
  emailApps: string[];
  calendarApps: string[];
  theme?: 'dark' | 'light' | 'system';
  showKeyLegend?: boolean;
  showMinimap?: boolean;
  moveSpeed?: number;
  hasCompletedSetup?: boolean;  // Track if user has done initial setup
}

export interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  isFirstRun?: boolean;
}

// =============================================================================
// Options
// =============================================================================

const BROWSER_OPTIONS = [
  { id: 'firefox', label: 'Firefox', command: 'firefox' },
  { id: 'chrome', label: 'Chrome', command: 'google-chrome' },
  { id: 'brave', label: 'Brave', command: 'brave-browser' },
  { id: 'edge', label: 'Edge', command: 'microsoft-edge' },
  { id: 'vivaldi', label: 'Vivaldi', command: 'vivaldi' },
  { id: 'opera', label: 'Opera', command: 'opera' },
  { id: 'librewolf', label: 'LibreWolf', command: 'librewolf' },
  { id: 'waterfox', label: 'Waterfox', command: 'waterfox' },
  { id: 'floorp', label: 'Floorp', command: 'floorp' },
  { id: 'zen', label: 'Zen Browser', command: 'zen-browser' },
];

export const MEDIA_OPTIONS = [
  { id: 'youtube-music', label: 'YouTube Music', url: 'https://music.youtube.com', icon: '▶️' },
  { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
  { id: 'soundcloud', label: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁️' },
  { id: 'apple-music', label: 'Apple Music', url: 'https://music.apple.com', icon: '🍎' },
  { id: 'tidal', label: 'Tidal', url: 'https://listen.tidal.com', icon: '🌊' },
  { id: 'pandora', label: 'Pandora', url: 'https://www.pandora.com', icon: '🎧' },
];

export const MESSAGES_OPTIONS = [
  { id: 'google-messages', label: 'Google Messages', url: 'https://messages.google.com', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '📱' },
  { id: 'telegram', label: 'Telegram', url: 'https://web.telegram.org', icon: '✈️' },
  { id: 'discord', label: 'Discord', url: 'https://discord.com/app', icon: '🎮' },
  { id: 'slack', label: 'Slack', url: 'https://app.slack.com', icon: '💼' },
  { id: 'signal', label: 'Signal', url: 'https://signal.org', icon: '🔒' },
  { id: 'messenger', label: 'Messenger', url: 'https://www.messenger.com', icon: '💙' },
];

export const EMAIL_OPTIONS = [
  { id: 'gmail', label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
  { id: 'outlook', label: 'Outlook', url: 'https://outlook.live.com', icon: '📬' },
  { id: 'protonmail', label: 'ProtonMail', url: 'https://mail.proton.me', icon: '🔐' },
  { id: 'yahoo', label: 'Yahoo Mail', url: 'https://mail.yahoo.com', icon: '📨' },
  { id: 'fastmail', label: 'Fastmail', url: 'https://app.fastmail.com', icon: '⚡' },
  { id: 'icloud', label: 'iCloud Mail', url: 'https://www.icloud.com/mail', icon: '☁️' },
];

export const CALENDAR_OPTIONS = [
  { id: 'google-calendar', label: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { id: 'outlook-calendar', label: 'Outlook Calendar', url: 'https://outlook.live.com/calendar', icon: '🗓️' },
  { id: 'notion', label: 'Notion', url: 'https://notion.so', icon: '📓' },
  { id: 'todoist', label: 'Todoist', url: 'https://todoist.com', icon: '✅' },
  { id: 'fantastical', label: 'Fantastical', url: 'https://flexibits.com/fantastical', icon: '✨' },
];

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    maxWidth: 600,
    width: '90%',
    maxHeight: '90vh',
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
  subtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
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
  hint: {
    color: '#666',
    fontSize: 11,
    marginBottom: 10,
    fontStyle: 'italic' as const,
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
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontSize: 13,
    color: '#ccc',
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.6)',
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
  isFirstRun = false,
}) => {
  const [local, setLocal] = useState<UserSettings>(settings);

  useEffect(() => {
    setLocal(settings);
  }, [settings, visible]);

  // ESC to close (unless first run)
  useEffect(() => {
    if (!visible || isFirstRun) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, isFirstRun, onClose]);

  if (!visible) return null;

  const handleSave = () => {
    onSave({ ...local, hasCompletedSetup: true });
    onClose();
  };

  const toggleMultiSelect = (
    key: 'mediaPlayers' | 'messagesApps' | 'emailApps' | 'calendarApps',
    id: string
  ) => {
    setLocal(prev => {
      const current = prev[key] || [];
      const updated = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id];
      return { ...prev, [key]: updated };
    });
  };

  const renderMultiSelect = (
    options: { id: string; label: string; icon?: string }[],
    selected: string[],
    key: 'mediaPlayers' | 'messagesApps' | 'emailApps' | 'calendarApps',
    color = '#6366f1'
  ) => (
    <div style={styles.optionGrid}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <div
            key={opt.id}
            onClick={() => toggleMultiSelect(key, opt.id)}
            style={{
              ...styles.option,
              ...(isSelected ? {
                ...styles.optionSelected,
                borderColor: color,
                backgroundColor: `${color}20`,
              } : {}),
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            <span>{opt.label}</span>
            {isSelected && <span style={{ marginLeft: 4 }}>✓</span>}
          </div>
        );
      })}
    </div>
  );

  const canSave = (local.mediaPlayers?.length || 0) > 0 ||
    (local.messagesApps?.length || 0) > 0 ||
    (local.emailApps?.length || 0) > 0 ||
    (local.calendarApps?.length || 0) > 0;

  return (
    <div style={styles.overlay} onClick={(e) => !isFirstRun && e.target === e.currentTarget && onClose()}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {isFirstRun ? '👋 Welcome! Set up your apps' : '⚙️ Settings'}
            </h2>
            {isFirstRun && (
              <p style={styles.subtitle}>Select the apps you want quick access to</p>
            )}
          </div>
          {!isFirstRun && (
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          )}
        </div>

        <div style={styles.body}>
          {/* Browser */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🌐 Default Browser</div>
            <div style={styles.optionGrid}>
              {BROWSER_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setLocal(prev => ({ ...prev, defaultBrowser: opt.command }))}
                  style={{
                    ...styles.option,
                    ...(local.defaultBrowser === opt.command ? styles.optionSelected : {}),
                  }}
                >
                  <span>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Media Player - Multi-select */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🎵 Music & Media</div>
            <div style={styles.hint}>Select all the services you use</div>
            {renderMultiSelect(
              MEDIA_OPTIONS,
              local.mediaPlayers || [],
              'mediaPlayers',
              '#ec4899'
            )}
          </div>

          {/* Messages - Multi-select */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>💬 Messages</div>
            <div style={styles.hint}>Select all the messaging apps you use</div>
            {renderMultiSelect(
              MESSAGES_OPTIONS,
              local.messagesApps || [],
              'messagesApps',
              '#22c55e'
            )}
          </div>

          {/* Email - Multi-select */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📧 Email</div>
            <div style={styles.hint}>Select all your email accounts</div>
            {renderMultiSelect(
              EMAIL_OPTIONS,
              local.emailApps || [],
              'emailApps',
              '#f59e0b'
            )}
          </div>

          {/* Calendar - Multi-select */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📅 Calendar & Tasks</div>
            <div style={styles.hint}>Select your calendar and task apps</div>
            {renderMultiSelect(
              CALENDAR_OPTIONS,
              local.calendarApps || [],
              'calendarApps',
              '#8b5cf6'
            )}
          </div>
        </div>

        <div style={styles.footer}>
          {!isFirstRun && (
            <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              opacity: canSave ? 1 : 0.5,
            }}
            onClick={handleSave}
            disabled={!canSave && isFirstRun}
          >
            {isFirstRun ? 'Get Started' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
