/**
 * Taskbar Component
 *
 * Bottom taskbar that sits below the room viewport.
 * Contains: Keys | Actions (E/R/F) | Media controls | App shortcuts | Collapse
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MEDIA_OPTIONS,
  MESSAGES_OPTIONS,
  EMAIL_OPTIONS,
  CALENDAR_OPTIONS,
} from './SettingsOverlay';

// =============================================================================
// Types
// =============================================================================

export interface MediaPlayerDockProps {
  mediaPlayers: string[];
  messagesApps: string[];
  emailApps: string[];
  calendarApps: string[];
  visible?: boolean;
  // Action callbacks
  onAddApp?: () => void;
  onAddRoom?: () => void;
  onToggleEdit?: () => void;
  onShowHelp?: () => void;
  editMode?: boolean;
  // Tool callbacks
  onOpenSettings?: () => void;
  onOpenWorldMap?: () => void;
  onOpenAvatarEditor?: () => void;
  onOpenStats?: () => void;
  currentRoom?: string;
  // Time tracking
  roomTime?: number; // seconds in current room
  totalTime?: number; // total seconds today
}

interface ServiceItem {
  id: string;
  icon: string;
  label: string;
  url: string;
}

type CategoryKey = 'media' | 'messages' | 'email' | 'calendar';

// =============================================================================
// Helpers
// =============================================================================

const getServiceItems = (ids: string[], options: typeof MEDIA_OPTIONS): ServiceItem[] => {
  return ids
    .map(id => options.find(o => o.id === id))
    .filter((o): o is ServiceItem => o !== undefined);
};

const getCategoryIcon = (key: CategoryKey): string => {
  switch (key) {
    case 'media': return '🎵';
    case 'messages': return '💬';
    case 'email': return '📧';
    case 'calendar': return '📅';
  }
};

const getCategoryLabel = (key: CategoryKey): string => {
  switch (key) {
    case 'media': return 'Music';
    case 'messages': return 'Messages';
    case 'email': return 'Email';
    case 'calendar': return 'Calendar';
  }
};

// Check if running in Electron
const isElectron = typeof window !== 'undefined' &&
  ((window as any).process?.type === 'renderer' ||
  (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')));

export const TASKBAR_HEIGHT = 36;

// =============================================================================
// Component
// =============================================================================

// Format seconds to human readable time
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format seconds to MM:SS for media timeline
const formatTimeSeconds = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MediaPlayerDock: React.FC<MediaPlayerDockProps> = ({
  mediaPlayers = [],
  messagesApps = [],
  emailApps = [],
  calendarApps = [],
  visible = true,
  onAddApp,
  onAddRoom,
  onToggleEdit,
  onShowHelp,
  editMode = false,
  onOpenSettings,
  onOpenWorldMap,
  onOpenAvatarEditor,
  onOpenStats,
  currentRoom,
  roomTime = 0,
  totalTime = 0,
}) => {
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);
  const [panelVisible, setPanelVisible] = useState(true); // Controls panel visibility (keeps webview alive)
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState<'normal' | 'large'>('normal');
  const [collapsed, setCollapsed] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Build category data
  const allCategories: { key: CategoryKey; items: ServiceItem[]; shortcut: string }[] = [
    { key: 'media', items: getServiceItems(mediaPlayers, MEDIA_OPTIONS), shortcut: '1' },
    { key: 'messages', items: getServiceItems(messagesApps, MESSAGES_OPTIONS), shortcut: '2' },
    { key: 'email', items: getServiceItems(emailApps, EMAIL_OPTIONS), shortcut: '3' },
    { key: 'calendar', items: getServiceItems(calendarApps, CALENDAR_OPTIONS), shortcut: '4' },
  ];
  const categories = allCategories.filter(cat => cat.items.length > 0);

  // Keyboard shortcuts for apps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Number keys 1-4 for app shortcuts
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        const category = categories[num - 1];
        if (category) {
          if (category.items.length === 1) {
            setActiveService(category.items[0]);
          } else if (category.items.length > 1) {
            setExpandedCategory(category.key);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories]);

  // Service-specific media control scripts
  const getMediaScripts = (serviceId: string) => {
    // Spotify Web Player selectors
    if (serviceId === 'spotify') {
      return {
        play: `document.querySelector('[data-testid="control-button-playpause"]')?.click()`,
        pause: `document.querySelector('[data-testid="control-button-playpause"]')?.click()`,
        prev: `document.querySelector('[data-testid="control-button-skip-back"]')?.click()`,
        next: `document.querySelector('[data-testid="control-button-skip-forward"]')?.click()`,
        getState: `
          (function() {
            const video = document.querySelector('video') || document.querySelector('audio');
            const titleEl = document.querySelector('[data-testid="context-item-info-title"]') || document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-link"]');
            const artistEl = document.querySelector('[data-testid="context-item-info-artist"]') || document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"]');
            const progressEl = document.querySelector('[data-testid="playback-progressbar"]');
            const playBtn = document.querySelector('[data-testid="control-button-playpause"]');
            const isPlaying = playBtn?.getAttribute('aria-label')?.toLowerCase().includes('pause') || false;

            let progress = 0, duration = 0;
            if (video) {
              progress = video.currentTime || 0;
              duration = video.duration || 0;
            } else if (progressEl) {
              const valueNow = progressEl.getAttribute('aria-valuenow');
              const valueMax = progressEl.getAttribute('aria-valuemax');
              progress = parseFloat(valueNow) || 0;
              duration = parseFloat(valueMax) || 0;
            }

            return JSON.stringify({
              title: titleEl?.textContent?.trim() || '',
              artist: artistEl?.textContent?.trim() || '',
              isPlaying: isPlaying,
              progress: progress,
              duration: duration
            });
          })()
        `,
        seek: (time: number) => `
          const video = document.querySelector('video') || document.querySelector('audio');
          if (video) video.currentTime = ${time};
        `,
      };
    }

    // YouTube Music selectors
    if (serviceId === 'youtube-music') {
      return {
        play: `document.querySelector('.play-pause-button')?.click() || document.querySelector('tp-yt-paper-icon-button.play-pause-button')?.click()`,
        pause: `document.querySelector('.play-pause-button')?.click() || document.querySelector('tp-yt-paper-icon-button.play-pause-button')?.click()`,
        prev: `document.querySelector('.previous-button')?.click() || document.querySelector('tp-yt-paper-icon-button.previous-button')?.click()`,
        next: `document.querySelector('.next-button')?.click() || document.querySelector('tp-yt-paper-icon-button.next-button')?.click()`,
        getState: `
          (function() {
            const video = document.querySelector('video');
            const titleEl = document.querySelector('.title.ytmusic-player-bar');
            const artistEl = document.querySelector('.byline.ytmusic-player-bar a') || document.querySelector('.byline.ytmusic-player-bar');

            if (video) {
              return JSON.stringify({
                title: titleEl?.textContent?.trim() || '',
                artist: artistEl?.textContent?.trim() || '',
                isPlaying: !video.paused,
                progress: video.currentTime || 0,
                duration: video.duration || 0
              });
            }
            return JSON.stringify({ title: '', artist: '', isPlaying: false, progress: 0, duration: 0 });
          })()
        `,
        seek: (time: number) => `
          const video = document.querySelector('video');
          if (video) video.currentTime = ${time};
        `,
      };
    }

    // Generic fallback
    return {
      play: `document.querySelector('video')?.play() || document.querySelector('audio')?.play()`,
      pause: `document.querySelector('video')?.pause() || document.querySelector('audio')?.pause()`,
      prev: `document.querySelector('[class*="prev"]')?.click() || document.querySelector('[aria-label*="Previous"]')?.click()`,
      next: `document.querySelector('[class*="next"]')?.click() || document.querySelector('[aria-label*="Next"]')?.click()`,
      getState: `
        (function() {
          const media = document.querySelector('video') || document.querySelector('audio');
          return JSON.stringify({
            title: document.title || '',
            artist: '',
            isPlaying: media ? !media.paused : false,
            progress: media?.currentTime || 0,
            duration: media?.duration || 0
          });
        })()
      `,
      seek: (time: number) => `
        const media = document.querySelector('video') || document.querySelector('audio');
        if (media) media.currentTime = ${time};
      `,
    };
  };

  // Set up webview dom-ready listener
  useEffect(() => {
    const webview = webviewRef.current as any;
    if (!webview || !activeService) return;

    const handleDomReady = () => {
      console.log('Webview dom-ready for', activeService.id);
    };

    // Electron webviews use addEventListener for events
    webview.addEventListener?.('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener?.('dom-ready', handleDomReady);
    };
  }, [activeService]);

  // Poll for player state when a service is active
  useEffect(() => {
    if (!activeService) return;

    const scripts = getMediaScripts(activeService.id);

    // Start polling - check webview exists on each poll
    pollIntervalRef.current = setInterval(async () => {
      const webview = webviewRef.current as any;
      if (!webview?.executeJavaScript) return;

      try {
        const result = await webview.executeJavaScript(scripts.getState);
        if (result) {
          const state = JSON.parse(result);
          setIsPlaying(state.isPlaying);
          setTrackProgress(state.progress);
          setTrackDuration(state.duration);
          setTrackTitle(state.title);
          setTrackArtist(state.artist);
        }
      } catch (e) {
        // Webview not ready yet or script error
      }
    }, 500); // Poll every 500ms for smoother timeline updates

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeService]);

  // Send media command to the active webview
  const sendMediaCommand = (command: 'play' | 'pause' | 'prev' | 'next') => {
    if (!webviewRef.current || !activeService) return;

    const scripts = getMediaScripts(activeService.id);
    try {
      (webviewRef.current as any).executeJavaScript?.(scripts[command]);
    } catch (e) {
      console.log('Could not send media command:', e);
    }
  };

  // Seek to a specific time
  const seekTo = (time: number) => {
    if (!webviewRef.current || !activeService) return;

    const scripts = getMediaScripts(activeService.id);
    try {
      (webviewRef.current as any).executeJavaScript?.(scripts.seek(time));
    } catch (e) {
      console.log('Could not seek:', e);
    }
  };

  const handlePlayPause = () => {
    sendMediaCommand(isPlaying ? 'pause' : 'play');
    setIsPlaying(!isPlaying);
  };

  const handleCategoryClick = (key: CategoryKey, items: ServiceItem[]) => {
    if (items.length === 1) {
      // If same service, toggle panel visibility
      if (activeService?.id === items[0].id) {
        setPanelVisible(!panelVisible);
      } else {
        setActiveService(items[0]);
        setPanelVisible(true);
      }
      setExpandedCategory(null);
    } else {
      setExpandedCategory(expandedCategory === key ? null : key);
    }
  };

  const handleServiceSelect = (service: ServiceItem) => {
    // If same service, toggle visibility
    if (activeService?.id === service.id) {
      setPanelVisible(!panelVisible);
    } else {
      setActiveService(service);
      setPanelVisible(true);
    }
    setExpandedCategory(null);
  };

  // Close panel (hide, don't unmount - keeps music playing)
  const handleClosePanel = () => {
    setPanelVisible(false);
  };

  // Fully stop and unmount the service
  const handleStopService = () => {
    setActiveService(null);
    setPanelVisible(true);
    setTrackTitle('');
    setTrackArtist('');
    setTrackProgress(0);
    setTrackDuration(0);
    setIsPlaying(false);
  };

  if (!visible) return null;

  const panelWidth = panelSize === 'large' ? 900 : 450;
  const panelHeight = panelSize === 'large' ? 650 : 400;

  // Button style helper
  const btnStyle = (active = false, hovered = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '4px 8px',
    background: active ? 'rgba(255,255,255,0.2)' : hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
    border: 'none',
    borderRadius: 4,
    color: active ? '#fff' : '#ccc',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const kbdStyle: React.CSSProperties = {
    fontSize: 9,
    padding: '1px 4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginLeft: 4,
  };

  return (
    <>
      {/* Embedded Panel - floats above taskbar, moved offscreen when minimized to keep webview alive */}
      {activeService && (
        <div style={{
          position: 'fixed',
          bottom: TASKBAR_HEIGHT + 8,
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
          // When minimized: move offscreen but keep fully rendered for webview to stay active
          transform: panelVisible ? 'none' : 'translateX(calc(100% + 100px))',
          opacity: panelVisible ? 1 : 0,
          pointerEvents: panelVisible ? 'auto' : 'none',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
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
              {activeService.icon} {activeService.label}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setPanelSize(panelSize === 'normal' ? 'large' : 'normal')}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
                title="Resize"
              >
                {panelSize === 'normal' ? '⤢' : '⤡'}
              </button>
              <button
                onClick={handleClosePanel}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
                title="Minimize (keeps playing)"
              >
                ─
              </button>
              <button
                onClick={handleStopService}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
                title="Stop & close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Media Control Bar - track info, controls, and timeline */}
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#1f1f1f',
            borderBottom: '1px solid #333',
            flexShrink: 0,
          }}>
            {/* Track info and controls row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}>
              {/* Playback controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => sendMediaCommand('prev')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 4,
                    opacity: 0.8,
                  }}
                  title="Previous"
                >
                  ⏮
                </button>
                <button
                  onClick={handlePlayPause}
                  style={{
                    background: activeService.id === 'spotify' ? '#1db954' : '#ff0000',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: 14,
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => sendMediaCommand('next')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 4,
                    opacity: 0.8,
                  }}
                  title="Next"
                >
                  ⏭
                </button>
              </div>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {trackTitle || 'No track playing'}
                </div>
                <div style={{
                  color: '#888',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {trackArtist || 'Select a song to play'}
                </div>
              </div>

              {/* Volume control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#888', fontSize: 12 }}>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{
                    width: 60,
                    height: 4,
                    accentColor: activeService.id === 'spotify' ? '#1db954' : '#ff0000',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Timeline / Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', fontSize: 10, minWidth: 35 }}>
                {formatTimeSeconds(trackProgress)}
              </span>
              <input
                type="range"
                min="0"
                max={trackDuration || 100}
                value={trackProgress}
                onChange={(e) => {
                  const newTime = Number(e.target.value);
                  setTrackProgress(newTime);
                  seekTo(newTime);
                }}
                style={{
                  flex: 1,
                  height: 4,
                  accentColor: activeService.id === 'spotify' ? '#1db954' : '#ff0000',
                  cursor: 'pointer',
                }}
              />
              <span style={{ color: '#888', fontSize: 10, minWidth: 35, textAlign: 'right' }}>
                {formatTimeSeconds(trackDuration)}
              </span>
            </div>
          </div>

          {/* Webview */}
          {isElectron ? (
            <webview
              ref={webviewRef as any}
              src={activeService.url}
              style={{ flex: 1, width: '100%', border: 'none' }}
              // @ts-ignore
              partition="persist:bloomos"
              // @ts-ignore
              allowpopups="true"
              // @ts-ignore
              useragent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            />
          ) : (
            <iframe
              src={activeService.url}
              style={{ flex: 1, width: '100%', border: 'none', backgroundColor: '#000' }}
              allow="autoplay; encrypted-media; fullscreen"
              title={activeService.label}
            />
          )}
        </div>
      )}

      {/* Submenu popup */}
      {expandedCategory && (
        <div style={{
          position: 'fixed',
          bottom: TASKBAR_HEIGHT + 8,
          right: 8,
          backgroundColor: '#2a2a2a',
          border: '1px solid #5a4030',
          borderRadius: 8,
          padding: 8,
          zIndex: 101,
          minWidth: 150,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {categories.find(c => c.key === expandedCategory)?.items.map((service) => (
            <div
              key={service.id}
              onClick={() => handleServiceSelect(service)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                backgroundColor: hoveredItem === service.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
              onMouseEnter={() => setHoveredItem(service.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span style={{ fontSize: 16 }}>{service.icon}</span>
              <span style={{ color: '#fff', fontSize: 13 }}>{service.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ========== TASKBAR ========== */}
      <div style={{
        height: collapsed ? 8 : TASKBAR_HEIGHT,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '2px 8px' : '0 8px',
        background: 'linear-gradient(to top, rgba(40,30,20,0.98) 0%, rgba(60,45,30,0.95) 100%)',
        borderTop: '1px solid #6a5040',
        transition: 'height 0.15s ease',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <>
            {/* LEFT SECTION: Keys + Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={onShowHelp}
                onMouseEnter={() => setHoveredItem('keys')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'keys')}
                title="Keyboard shortcuts (?)"
              >
                <span>⌨️</span>
                <span>Keys</span>
              </button>

              <div style={{ width: 1, height: 20, backgroundColor: '#5a4030', margin: '0 4px' }} />

              <button
                onClick={onAddApp}
                onMouseEnter={() => setHoveredItem('addapp')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'addapp')}
                title="Add App (E)"
              >
                <span>📦</span>
                <span style={kbdStyle}>e</span>
              </button>

              <button
                onClick={onAddRoom}
                onMouseEnter={() => setHoveredItem('addroom')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'addroom')}
                title="Add Room (r)"
              >
                <span>🚪</span>
                <span style={kbdStyle}>r</span>
              </button>

              <button
                onClick={onToggleEdit}
                onMouseEnter={() => setHoveredItem('edit')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(editMode, hoveredItem === 'edit')}
                title="Edit Mode (f)"
              >
                <span>✏️</span>
                <span style={kbdStyle}>f</span>
              </button>
            </div>

            {/* CENTER SECTION: Room & Time & Tools */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {/* Room name and time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {currentRoom && (
                  <span style={{ color: '#ccc', fontSize: 11 }}>{currentRoom}</span>
                )}
                <span style={{ color: '#666', fontSize: 10 }}>
                  {formatTime(roomTime)} | {formatTime(totalTime)} total
                </span>
              </div>

              <div style={{ width: 1, height: 16, backgroundColor: '#5a4030', margin: '0 4px' }} />

              {/* Stats button */}
              <button
                onClick={onOpenStats}
                onMouseEnter={() => setHoveredItem('stats')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'stats')}
                title="Usage Stats"
              >
                <span>📊</span>
              </button>

              <button
                onClick={onOpenWorldMap}
                onMouseEnter={() => setHoveredItem('map')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'map')}
                title="World Map"
              >
                <span>🗺️</span>
              </button>

              <button
                onClick={onOpenAvatarEditor}
                onMouseEnter={() => setHoveredItem('avatar')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'avatar')}
                title="Avatar"
              >
                <span>🎭</span>
              </button>

              <button
                onClick={onOpenSettings}
                onMouseEnter={() => setHoveredItem('settings')}
                onMouseLeave={() => setHoveredItem(null)}
                style={btnStyle(false, hoveredItem === 'settings')}
                title="Settings"
              >
                <span>⚙️</span>
              </button>
            </div>

            {/* RIGHT SECTION: Media + Apps + Collapse */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Now Playing mini display - shows when panel is hidden but music is active */}
              {activeService && !panelVisible && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    maxWidth: 280,
                  }}
                >
                  {/* Icon - clickable to expand */}
                  <span
                    onClick={() => setPanelVisible(true)}
                    style={{ fontSize: 14, cursor: 'pointer' }}
                    title="Show player"
                  >
                    {activeService.icon}
                  </span>

                  {/* Track info */}
                  <div
                    onClick={() => setPanelVisible(true)}
                    style={{ minWidth: 0, width: 80, cursor: 'pointer' }}
                    title="Click to show player"
                  >
                    <div style={{
                      color: '#fff',
                      fontSize: 10,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {trackTitle || 'Playing...'}
                    </div>
                    {trackArtist && (
                      <div style={{
                        color: '#888',
                        fontSize: 9,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {trackArtist}
                      </div>
                    )}
                  </div>

                  {/* Mini timeline */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <span style={{ color: '#888', fontSize: 9, minWidth: 28 }}>
                      {formatTimeSeconds(trackProgress)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={trackDuration || 100}
                      value={trackProgress}
                      onChange={(e) => {
                        const newTime = Number(e.target.value);
                        setTrackProgress(newTime);
                        seekTo(newTime);
                      }}
                      style={{
                        flex: 1,
                        width: 80,
                        height: 3,
                        accentColor: activeService.id === 'spotify' ? '#1db954' : '#ff0000',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ color: '#888', fontSize: 9, minWidth: 28 }}>
                      {formatTimeSeconds(trackDuration)}
                    </span>
                  </div>

                  {isPlaying && (
                    <span style={{ color: activeService.id === 'spotify' ? '#1db954' : '#ff0000', fontSize: 8 }}>●</span>
                  )}
                </div>
              )}

              {/* Media controls */}
              {(mediaPlayers.length > 0 || activeService) && (
                <>
                  <button onClick={() => sendMediaCommand('prev')} style={btnStyle()} title="Previous">
                    ⏮
                  </button>
                  <button onClick={handlePlayPause} style={btnStyle(isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => sendMediaCommand('next')} style={btnStyle()} title="Next">
                    ⏭
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    style={{ width: 60, height: 4, accentColor: activeService?.id === 'spotify' ? '#1db954' : '#ff0000', cursor: 'pointer', margin: '0 4px' }}
                    title={`Volume: ${volume}%`}
                  />
                  <div style={{ width: 1, height: 20, backgroundColor: '#5a4030', margin: '0 4px' }} />
                </>
              )}

              {/* App shortcuts */}
              {categories.map(({ key, items, shortcut }) => {
                const isActive = activeService && items.some(i => i.id === activeService.id);
                const isExpanded = expandedCategory === key;
                const displayIcon = items.length === 1 ? items[0].icon : getCategoryIcon(key);
                const displayLabel = getCategoryLabel(key);

                return (
                  <button
                    key={key}
                    onClick={() => handleCategoryClick(key, items)}
                    onMouseEnter={() => setHoveredItem(key)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={btnStyle(isActive || isExpanded, hoveredItem === key)}
                    title={`${displayLabel} (${shortcut})`}
                  >
                    <span style={{ fontSize: 16 }}>{displayIcon}</span>
                    <span style={kbdStyle}>{shortcut}</span>
                  </button>
                );
              })}

              {categories.length === 0 && (
                <span style={{ color: '#666', fontSize: 11 }}>No apps configured</span>
              )}

              <div style={{ width: 1, height: 20, backgroundColor: '#5a4030', margin: '0 4px' }} />

              {/* Collapse toggle */}
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={btnStyle(false, hoveredItem === 'collapse')}
                onMouseEnter={() => setHoveredItem('collapse')}
                onMouseLeave={() => setHoveredItem(null)}
                title="Collapse taskbar"
              >
                ▼
              </button>
            </div>
          </>
        )}

        {/* When collapsed - just show expand button on right */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{ ...btnStyle(false, hoveredItem === 'collapse'), marginLeft: 'auto' }}
            onMouseEnter={() => setHoveredItem('collapse')}
            onMouseLeave={() => setHoveredItem(null)}
            title="Expand taskbar"
          >
            ▲
          </button>
        )}
      </div>
    </>
  );
};

export default MediaPlayerDock;
