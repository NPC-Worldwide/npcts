/**
 * SettingsOverlay Component - Collapsible Sections
 */

import React, { useState, useEffect } from 'react';

export interface UserSettings {
  defaultBrowser: string;
  browserArgs?: string;
  mediaPlayers: string[];
  messagesApps: string[];
  emailApps: string[];
  calendarApps: string[];
  theme?: 'dark' | 'light' | 'system';
  showKeyLegend?: boolean;
  showMinimap?: boolean;
  showTimeTracking?: boolean;
  moveSpeed?: number;
  hasCompletedSetup?: boolean;
}

export interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  isFirstRun?: boolean;
}

const BROWSER_OPTIONS = [
  { id: 'firefox', label: 'Firefox', command: 'firefox' },
  { id: 'chrome', label: 'Chrome', command: 'google-chrome' },
  { id: 'brave', label: 'Brave', command: 'brave-browser' },
  { id: 'edge', label: 'Edge', command: 'microsoft-edge' },
  { id: 'vivaldi', label: 'Vivaldi', command: 'vivaldi' },
  { id: 'zen', label: 'Zen', command: 'zen-browser' },
];

export const MEDIA_OPTIONS = [
  { id: 'youtube-music', label: 'YouTube Music', url: 'https://music.youtube.com', icon: '▶️' },
  { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
  { id: 'soundcloud', label: 'SoundCloud', url: 'https://soundcloud.com', icon: '☁️' },
  { id: 'apple-music', label: 'Apple Music', url: 'https://music.apple.com', icon: '🍎' },
  { id: 'tidal', label: 'Tidal', url: 'https://listen.tidal.com', icon: '🌊' },
];

export const MESSAGES_OPTIONS = [
  { id: 'google-messages', label: 'Messages', url: 'https://messages.google.com', icon: '💬' },
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '📱' },
  { id: 'telegram', label: 'Telegram', url: 'https://web.telegram.org', icon: '✈️' },
  { id: 'discord', label: 'Discord', url: 'https://discord.com/app', icon: '🎮' },
  { id: 'slack', label: 'Slack', url: 'https://app.slack.com', icon: '💼' },
];

export const EMAIL_OPTIONS = [
  { id: 'gmail', label: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
  { id: 'outlook', label: 'Outlook', url: 'https://outlook.live.com', icon: '📬' },
  { id: 'protonmail', label: 'ProtonMail', url: 'https://mail.proton.me', icon: '🔐' },
];

export const CALENDAR_OPTIONS = [
  { id: 'google-calendar', label: 'Google Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { id: 'outlook-calendar', label: 'Outlook', url: 'https://outlook.live.com/calendar', icon: '🗓️' },
  { id: 'notion', label: 'Notion', url: 'https://notion.so', icon: '📓' },
];

type SectionKey = 'browser' | 'media' | 'messages' | 'email' | 'calendar' | 'display';

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  visible,
  onClose,
  settings,
  onSave,
  isFirstRun = false,
}) => {
  const [local, setLocal] = useState<UserSettings>(settings);
  const [expanded, setExpanded] = useState<SectionKey | null>(isFirstRun ? 'browser' : null);

  useEffect(() => {
    setLocal(settings);
  }, [settings, visible]);

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

  const toggleSection = (key: SectionKey) => {
    setExpanded(prev => prev === key ? null : key);
  };

  const toggleMulti = (
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

  // Get summary of selected items for collapsed view
  const getSummary = (items: string[] | undefined, options: { id: string; label: string }[]) => {
    if (!items || items.length === 0) return 'None selected';
    if (items.length === 1) return options.find(o => o.id === items[0])?.label || items[0];
    return `${items.length} selected`;
  };

  const getBrowserLabel = () => {
    const browser = BROWSER_OPTIONS.find(b => b.command === local.defaultBrowser);
    return browser?.label || 'Not set';
  };

  const Section = ({
    id,
    icon,
    title,
    summary,
    children
  }: {
    id: SectionKey;
    icon: string;
    title: string;
    summary: string;
    children: React.ReactNode;
  }) => {
    const isOpen = expanded === id;
    return (
      <div style={{
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 8,
        background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: isOpen ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
      }}>
        <div
          onClick={() => toggleSection(id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            cursor: 'pointer',
            background: isOpen ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.02)',
            borderRadius: isOpen ? 0 : 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>{summary}</span>
            <span style={{
              color: '#64748b',
              fontSize: 12,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
            }}>▼</span>
          </div>
        </div>
        {isOpen && (
          <div style={{ padding: '12px 14px', paddingTop: 0 }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  const OptionChip = ({
    selected,
    onClick,
    icon,
    label
  }: {
    selected: boolean;
    onClick: () => void;
    icon?: string;
    label: string;
  }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        background: selected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
        border: selected ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
        color: selected ? '#fff' : '#94a3b8',
      }}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {selected && <span style={{ fontSize: 10 }}>✓</span>}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes settingsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes settingsSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={(e) => !isFirstRun && e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'settingsFadeIn 0.15s',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1e1e2e',
            borderRadius: 14,
            width: 420,
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            animation: 'settingsSlideUp 0.2s',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
              {isFirstRun ? 'Welcome! Set up your apps' : 'Settings'}
            </span>
            {!isFirstRun && (
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >×</button>
            )}
          </div>

          {/* Body - Collapsible Sections */}
          <div style={{ padding: 14, overflowY: 'auto', flex: 1 }}>
            {/* Browser */}
            <Section id="browser" icon="🌐" title="Browser" summary={getBrowserLabel()}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {BROWSER_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.id}
                    selected={local.defaultBrowser === opt.command}
                    onClick={() => setLocal(prev => ({ ...prev, defaultBrowser: opt.command }))}
                    label={opt.label}
                  />
                ))}
              </div>
            </Section>

            {/* Media */}
            <Section id="media" icon="🎵" title="Music" summary={getSummary(local.mediaPlayers, MEDIA_OPTIONS)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {MEDIA_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.id}
                    selected={(local.mediaPlayers || []).includes(opt.id)}
                    onClick={() => toggleMulti('mediaPlayers', opt.id)}
                    icon={opt.icon}
                    label={opt.label}
                  />
                ))}
              </div>
            </Section>

            {/* Messages */}
            <Section id="messages" icon="💬" title="Messages" summary={getSummary(local.messagesApps, MESSAGES_OPTIONS)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {MESSAGES_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.id}
                    selected={(local.messagesApps || []).includes(opt.id)}
                    onClick={() => toggleMulti('messagesApps', opt.id)}
                    icon={opt.icon}
                    label={opt.label}
                  />
                ))}
              </div>
            </Section>

            {/* Email */}
            <Section id="email" icon="📧" title="Email" summary={getSummary(local.emailApps, EMAIL_OPTIONS)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {EMAIL_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.id}
                    selected={(local.emailApps || []).includes(opt.id)}
                    onClick={() => toggleMulti('emailApps', opt.id)}
                    icon={opt.icon}
                    label={opt.label}
                  />
                ))}
              </div>
            </Section>

            {/* Calendar */}
            <Section id="calendar" icon="📅" title="Calendar" summary={getSummary(local.calendarApps, CALENDAR_OPTIONS)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {CALENDAR_OPTIONS.map((opt) => (
                  <OptionChip
                    key={opt.id}
                    selected={(local.calendarApps || []).includes(opt.id)}
                    onClick={() => toggleMulti('calendarApps', opt.id)}
                    icon={opt.icon}
                    label={opt.label}
                  />
                ))}
              </div>
            </Section>

            {/* Display */}
            <Section id="display" icon="🖥️" title="Display" summary={(local.showTimeTracking ?? true) ? 'Time tracking on' : 'Time tracking off'}>
              <div
                onClick={() => setLocal(prev => ({ ...prev, showTimeTracking: !(prev.showTimeTracking ?? true) }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: 13 }}>Show time tracking</span>
                <div style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: (local.showTimeTracking ?? true) ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 2,
                    left: (local.showTimeTracking ?? true) ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.2s',
                  }} />
                </div>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 18px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            {!isFirstRun && (
              <button
                onClick={onClose}
                style={{
                  padding: '8px 18px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#94a3b8',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >Cancel</button>
            )}
            <button
              onClick={handleSave}
              style={{
                padding: '8px 18px',
                background: '#6366f1',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >{isFirstRun ? 'Get Started' : 'Save'}</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsOverlay;
