import React, { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed theme-bg-secondary theme-border border rounded 
          shadow-lg py-1 z-50 min-w-[160px]"
        style={{ top: `${y}px`, left: `${x}px` }}
      >
        {children}
      </div>
    </>
  );
};

interface ContextMenuItemProps {
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  onClick,
  disabled = false,
  icon,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 theme-hover w-full 
        text-left theme-text-primary text-sm disabled:opacity-50 
        disabled:cursor-not-allowed"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export const ContextMenuSeparator: React.FC = () => {
  return <div className="border-t theme-border my-1" />;
};
