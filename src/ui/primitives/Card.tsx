import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-gray-400',
  children,
  className = '',
  onContextMenu
}) => {
  return (
    <div
      className={`theme-bg-tertiary p-4 rounded-lg flex flex-col h-full relative ${className}`}
      onContextMenu={onContextMenu}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-2 flex-shrink-0">
          {Icon && <Icon className={iconColor} size={18} />}
          {title && (
            <h4 className="font-semibold theme-text-secondary truncate">
              {title}
            </h4>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
};