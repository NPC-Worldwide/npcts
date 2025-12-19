/**
 * BottomDock Component
 *
 * Shows user's selected services. If multiple selected per category, shows submenu.
 * Uses persistent partition for webview to maintain login sessions.
 */

import React, { useState, useRef } from 'react';
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

// =============================================================================
// Component
// =============================================================================

export const MediaPlayerDock: React.FC<MediaPlayerDockProps> = ({
  mediaPlayers = [],
  messagesApps = [],
  emailApps = [],
  calendarApps = [],
  visible = true,
}) => {
  const [activeService, setActiveService] = useState<ServiceItem | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [panelSize, setPanelSize] = useState<'normal' | 'large'>('normal');
  const [dockHidden, setDockHidden] = useState(false);
  const webviewRef = useRef<HTMLWebViewElement | null>(null);

  if (!visible) return null;

  // Build category data
  const allCategories: { key: CategoryKey; items: ServiceItem[] }[] = [
    { key: 'media' as CategoryKey, items: getServiceItems(mediaPlayers, MEDIA_OPTIONS) },
    { key: 'messages' as CategoryKey, items: getServiceItems(messagesApps, MESSAGES_OPTIONS) },
    { key: 'email' as CategoryKey, items: getServiceItems(emailApps, EMAIL_OPTIONS) },
    { key: 'calendar' as CategoryKey, items: getServiceItems(calendarApps, CALENDAR_OPTIONS) },
  ];
  const categories = allCategories.filter(cat => cat.items.length > 0);

  const handleCategoryClick = (key: CategoryKey, items: ServiceItem[]) => {
    if (items.length === 1) {
      // Single item - open directly
      setActiveService(items[0]);
      setExpandedCategory(null);
    } else {
      // Multiple items - toggle submenu
      setExpandedCategory(expandedCategory === key ? null : key);
    }
  };

  const handleServiceSelect = (service: ServiceItem) => {
    setActiveService(service);
    setExpandedCategory(null);
  };

  const panelWidth = panelSize === 'large' ? 900 : 450;
  const panelHeight = panelSize === 'large' ? 650 : 400;

  return (
    <>
      {/* Embedded Panel */}
      {activeService && (
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
              {activeService.icon} {activeService.label}
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
                onClick={() => setActiveService(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Webview with persistent partition for login sessions */}
          {isElectron ? (
            <webview
              ref={webviewRef as any}
              src={activeService.url}
              style={{ flex: 1, width: '100%', border: 'none' }}
              // @ts-ignore - partition persists cookies/login across sessions
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
          bottom: 52,
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
                transition: 'background 0.15s',
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

      {/* Toggle button - always visible */}
      <button
        onClick={() => setDockHidden(!dockHidden)}
        style={{
          position: 'fixed',
          bottom: dockHidden ? 4 : 28,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(50,35,25,0.95)',
          border: '1px solid #6a5040',
          color: '#aaa',
          fontSize: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 101,
          transition: 'bottom 0.2s ease',
        }}
        title={dockHidden ? 'Show dock' : 'Hide dock'}
      >
        {dockHidden ? '▲' : '▼'}
      </button>

      {/* Dock Bar */}
      <div style={{
        position: 'fixed',
        bottom: dockHidden ? -40 : 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 8px',
        background: 'linear-gradient(to top, rgba(50,35,25,0.95) 0%, rgba(70,50,35,0.9) 100%)',
        borderTop: '1px solid #6a5040',
        borderLeft: '1px solid #6a5040',
        borderTopLeftRadius: 6,
        zIndex: 90,
        transition: 'bottom 0.2s ease',
      }}>
        {categories.map(({ key, items }) => {
          const isActive = activeService && items.some(i => i.id === activeService.id);
          const isExpanded = expandedCategory === key;
          // Show first item's icon if single, category icon if multiple
          const displayIcon = items.length === 1 ? items[0].icon : getCategoryIcon(key);
          const displayLabel = items.length === 1 ? items[0].label : getCategoryLabel(key);

          return (
            <button
              key={key}
              onClick={() => handleCategoryClick(key, items)}
              onMouseEnter={() => setHoveredItem(key)}
              onMouseLeave={() => setHoveredItem(null)}
              title={displayLabel}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 6px',
                background: isActive || isExpanded
                  ? 'rgba(255,255,255,0.2)'
                  : hoveredItem === key
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{displayIcon}</span>
            </button>
          );
        })}

        {/* Show message if no apps configured */}
        {categories.length === 0 && (
          <span style={{ color: '#888', fontSize: 11, padding: '8px 12px' }}>
            Open Settings to add apps
          </span>
        )}
      </div>
    </>
  );
};

export default MediaPlayerDock;
