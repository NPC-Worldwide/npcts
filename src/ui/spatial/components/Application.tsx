/**
 * Application Component
 *
 * Renders an interactive application icon that can execute commands.
 * Supports menu items and rotation.
 */

import React, { useMemo, useState, useCallback } from 'react';
import type { Application as ApplicationType } from '../../../core/spatial';

// =============================================================================
// Component Props
// =============================================================================

interface ApplicationProps {
  app: ApplicationType;
  name: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (app: ApplicationType, name: string) => void;
  onDoubleClick?: (app: ApplicationType, name: string) => void;
  onHover?: (app: ApplicationType | null, name?: string) => void;
  onMouseDown?: (app: ApplicationType, name: string, e: React.MouseEvent) => void;
  onDragStart?: (app: ApplicationType, name: string, e: React.DragEvent) => void;
  onDragEnd?: (app: ApplicationType, name: string, e: React.DragEvent) => void;
  onDelete?: (name: string) => void;
  selected?: boolean;
  highlighted?: boolean;
  draggable?: boolean;
  showLabel?: boolean;
  showMenuOnHover?: boolean;
}

// =============================================================================
// Application Component
// =============================================================================

export const Application: React.FC<ApplicationProps> = ({
  app,
  name,
  className = '',
  style: customStyle,
  onClick,
  onDoubleClick,
  onHover,
  onMouseDown,
  onDragStart,
  onDragEnd,
  onDelete,
  selected = false,
  highlighted = false,
  draggable = false,
  showLabel = true,
  showMenuOnHover = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const appStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: app.x,
      top: app.y,
      width: app.width,
      height: app.height,
      zIndex: 50,
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      transform: app.rotation ? `rotate(${app.rotation}deg)` : 'none',
      outline: selected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '2px',
      overflow: 'visible',
      ...customStyle,
    };

    if (highlighted || isHovered) {
      baseStyle.transform = `${app.rotation ? `rotate(${app.rotation}deg)` : ''} scale(1.1)`;
      baseStyle.filter = 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))';
    }

    return baseStyle;
  }, [app, customStyle, selected, highlighted, isHovered]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(app, name);
    },
    [app, name, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(app, name);
    },
    [app, name, onDoubleClick]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(app, name);
    if (showMenuOnHover && Object.keys(app.menuItems).length > 0) {
      setShowMenu(true);
    }
  }, [app, name, onHover, showMenuOnHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(null);
    setShowMenu(false);
  }, [onHover]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      // Prevent default browser image drag behavior
      e.preventDefault();
      // Use a transparent image as drag ghost
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(img, 0, 0);
      onDragStart?.(app, name, e);
    },
    [app, name, onDragStart]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      onDragEnd?.(app, name, e);
    },
    [app, name, onDragEnd]
  );

  const handleMouseDownEvent = useCallback(
    (e: React.MouseEvent) => {
      onMouseDown?.(app, name, e);
    },
    [app, name, onMouseDown]
  );

  const hasMenuItems = Object.keys(app.menuItems).length > 0;

  return (
    <div
      className={`spatial-application ${className}`}
      style={appStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDownEvent}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={draggable}
      role="button"
      tabIndex={0}
      aria-label={`${app.name}${app.text ? `: ${app.text}` : ''}`}
    >
      {/* Application Icon */}
      {app.image && !imageError ? (
        <img
          src={app.image}
          alt={app.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#4a5568',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: Math.min(app.width, app.height) * 0.3,
            fontWeight: 'bold',
          }}
        >
          {app.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Label */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {app.name}
        </div>
      )}

      {/* Menu indicator */}
      {hasMenuItems && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 12,
            height: 12,
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            border: '2px solid #fff',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Menu popup */}
      {showMenu && hasMenuItems && (
        <ApplicationMenu
          menuItems={app.menuItems}
          onItemClick={(item, itemName) => {
            onClick?.(item, itemName);
            setShowMenu(false);
          }}
        />
      )}

      {/* Delete button in edit mode */}
      {draggable && onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(name);
          }}
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #fff',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            zIndex: 9999,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// =============================================================================
// Application Menu Component
// =============================================================================

interface ApplicationMenuProps {
  menuItems: Record<string, ApplicationType>;
  onItemClick?: (item: ApplicationType, name: string) => void;
}

export const ApplicationMenu: React.FC<ApplicationMenuProps> = ({
  menuItems,
  onItemClick,
}) => {
  const items = Object.entries(menuItems);

  if (items.length === 0) return null;

  return (
    <div
      className="spatial-application-menu"
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: 8,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 8,
        padding: 8,
        minWidth: 120,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 200,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map(([itemName, item]) => (
        <div
          key={itemName}
          className="spatial-application-menu-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onClick={() => onItemClick?.(item, itemName)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.backgroundColor =
              'transparent';
          }}
        >
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              style={{
                width: 24,
                height: 24,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                backgroundColor: '#4a5568',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 12,
              }}
            >
              {item.name.charAt(0)}
            </div>
          )}
          <span
            style={{
              color: '#fff',
              fontSize: 12,
            }}
          >
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// Application Grid (for displaying multiple apps)
// =============================================================================

interface ApplicationGridProps {
  applications: Record<string, ApplicationType>;
  onAppClick?: (app: ApplicationType, name: string) => void;
  columns?: number;
  iconSize?: number;
  gap?: number;
  className?: string;
}

export const ApplicationGrid: React.FC<ApplicationGridProps> = ({
  applications,
  onAppClick,
  columns = 4,
  iconSize = 64,
  gap = 16,
  className = '',
}) => {
  const apps = Object.entries(applications);

  return (
    <div
      className={`spatial-application-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${iconSize}px)`,
        gap,
        padding: 16,
      }}
    >
      {apps.map(([name, app]) => (
        <div
          key={name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
          onClick={() => onAppClick?.(app, name)}
        >
          {app.image ? (
            <img
              src={app.image}
              alt={app.name}
              style={{
                width: iconSize,
                height: iconSize,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: '#4a5568',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: iconSize * 0.4,
                fontWeight: 'bold',
              }}
            >
              {app.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              color: '#fff',
              textAlign: 'center',
              maxWidth: iconSize + 20,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {app.name}
          </span>
        </div>
      ))}
    </div>
  );
};
