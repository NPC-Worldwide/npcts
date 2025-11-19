import React from "react";
import { 
  Edit, 
  Trash, 
  Copy, 
  FilePlus,
  FolderPlus,
  Download,
} from "lucide-react";
import { 
  ContextMenu, 
  ContextMenuItem, 
  ContextMenuSeparator 
} from "../../../primitives/ContextMenu";

interface FileContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  isDirectory: boolean;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onDownload?: () => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  onClose,
  isDirectory,
  onRename,
  onDelete,
  onDuplicate,
  onNewFile,
  onNewFolder,
  onDownload,
}) => {
  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      {isDirectory && (
        <>
          <ContextMenuItem
            onClick={() => {
              onNewFile?.();
              onClose();
            }}
            icon={<FilePlus size={14} />}
          >
            New File
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              onNewFolder?.();
              onClose();
            }}
            icon={<FolderPlus size={14} />}
          >
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      <ContextMenuItem
        onClick={() => {
          onRename?.();
          onClose();
        }}
        icon={<Edit size={14} />}
      >
        Rename
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          onDuplicate?.();
          onClose();
        }}
        icon={<Copy size={14} />}
      >
        Duplicate
      </ContextMenuItem>
      {!isDirectory && (
        <ContextMenuItem
          onClick={() => {
            onDownload?.();
            onClose();
          }}
          icon={<Download size={14} />}
        >
          Download
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          onDelete?.();
          onClose();
        }}
        icon={<Trash size={14} />}
      >
        Delete
      </ContextMenuItem>
    </ContextMenu>
  );
};
