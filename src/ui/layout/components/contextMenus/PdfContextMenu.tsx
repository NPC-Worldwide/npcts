import React from "react";
import { 
  Copy, 
  Highlighter, 
  MessageSquare,
  FileText,
} from "lucide-react";
import { 
  ContextMenu, 
  ContextMenuItem, 
  ContextMenuSeparator 
} from "../../../primitives/ContextMenu";

interface PdfContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  hasSelection: boolean;
  onCopy?: () => void;
  onHighlight?: () => void;
  onAddToChat?: () => void;
  onSummarize?: () => void;
}

export const PdfContextMenu: React.FC<PdfContextMenuProps> = ({
  x,
  y,
  onClose,
  hasSelection,
  onCopy,
  onHighlight,
  onAddToChat,
  onSummarize,
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
        Copy Text
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onHighlight?.();
          onClose();
        }}
        disabled={!hasSelection}
        icon={<Highlighter size={14} />}
      >
        Highlight
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
          onSummarize?.();
          onClose();
        }}
        icon={<FileText size={14} />}
      >
        Summarize Page
      </ContextMenuItem>
    </ContextMenu>
  );
};
