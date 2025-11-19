import React from "react";
import { 
  Copy, 
  Clipboard, 
  Scissors, 
  MessageSquare, 
  Sparkles,
  Search,
} from "lucide-react";
import { 
  ContextMenu, 
  ContextMenuItem, 
  ContextMenuSeparator 
} from "../../../primitives/ContextMenu";

interface EditorContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  hasSelection: boolean;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onAddToChat?: () => void;
  onAIEdit?: () => void;
  onSearch?: () => void;
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  x,
  y,
  onClose,
  hasSelection,
  onCopy,
  onCut,
  onPaste,
  onAddToChat,
  onAIEdit,
  onSearch,
}) => {
  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        onClick={() => {
          onCopy?.();
          onClose();
        }}
        disabled={!hasSelection}
        icon={<Copy size={14} />}
      >
        Copy
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onCut?.();
          onClose();
        }}
        disabled={!hasSelection}
        icon={<Scissors size={14} />}
      >
        Cut
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onPaste?.();
          onClose();
        }}
        icon={<Clipboard size={14} />}
      >
        Paste
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          onAddToChat?.();
          onClose();
        }}
        disabled={!hasSelection}
        icon={<MessageSquare size={14} />}
      >
        Add to Chat
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onAIEdit?.();
          onClose();
        }}
        disabled={!hasSelection}
        icon={<Sparkles size={14} />}
      >
        AI Edit
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          onSearch?.();
          onClose();
        }}
        icon={<Search size={14} />}
      >
        Find in File
      </ContextMenuItem>
    </ContextMenu>
  );
};
