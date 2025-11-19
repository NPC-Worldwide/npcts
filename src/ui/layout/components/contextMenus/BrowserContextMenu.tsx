import React from "react";
import { 
  Copy, 
  MessageSquare,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { 
  ContextMenu, 
  ContextMenuItem, 
  ContextMenuSeparator 
} from "../../../primitives/ContextMenu";

interface BrowserContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  selectedText?: string;
  onCopy?: () => void;
  onAddToChat?: () => void;
  onOpenExternal?: () => void;
  onBookmark?: () => void;
}

export const BrowserContextMenu: React.FC<BrowserContextMenuProps> = ({
  x,
  y,
  onClose,
  selectedText,
  onCopy,
  onAddToChat,
  onOpenExternal,
  onBookmark,
}) => {
  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        onClick={() => {
          onCopy?.();
          onClose();
        }}
        disabled={!selectedText}
        icon={<Copy size={14} />}
      >
        Copy
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onAddToChat?.();
          onClose();
        }}
        disabled={!selectedText}
        icon={<MessageSquare size={14} />}
      >
        Add to Chat
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          onOpenExternal?.();
          onClose();
        }}
        icon={<ExternalLink size={14} />}
      >
        Open in Browser
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onBookmark?.();
          onClose();
        }}
        icon={<Bookmark size={14} />}
      >
        Bookmark Page
      </ContextMenuItem>
    </ContextMenu>
  );
};
