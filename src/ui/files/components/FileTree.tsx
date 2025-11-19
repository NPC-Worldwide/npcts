import React, { useState, useCallback, memo } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  File, 
  FileText,
  FileCode,
  FileJson,
  Image as ImageIcon,
} from "lucide-react";
import type { FileNode } from "../../../core/files";

interface FileTreeProps {
  node: FileNode;
  level?: number;
  onFileClick?: (path: string) => void;
  onFolderClick?: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}

const getFileIcon = (filename: string, isDirectory: boolean) => {
  if (isDirectory) return <Folder size={14} className="text-blue-400" />;
  
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
      return <FileCode size={14} className="text-green-400" />;
    case "json":
      return <FileJson size={14} className="text-yellow-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <ImageIcon size={14} className="text-purple-400" />;
    case "md":
    case "txt":
      return <FileText size={14} className="text-gray-400" />;
    default:
      return <File size={14} className="text-gray-400" />;
  }
};

export const FileTreeNode: React.FC<FileTreeProps> = memo(({
  node,
  level = 0,
  onFileClick,
  onFolderClick,
  onContextMenu,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      setExpanded(!expanded);
      if (onFolderClick) {
        onFolderClick(node.path);
      }
    } else {
      if (onFileClick) {
        onFileClick(node.path);
      }
    }
  }, [node, expanded, onFileClick, onFolderClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e, node.path, node.isDirectory);
    }
  }, [node, onContextMenu]);

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 hover:bg-gray-700 
          cursor-pointer text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDirectory && (
          <span className="flex-shrink-0">
            {expanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </span>
        )}
        <span className="flex-shrink-0">
          {getFileIcon(node.name, node.isDirectory)}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDirectory && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onFolderClick={onFolderClick}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FileTreeNode.displayName = "FileTreeNode";

interface FileTreeRootProps {
  root: FileNode;
  onFileClick?: (path: string) => void;
  onFolderClick?: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}

export const FileTree: React.FC<FileTreeRootProps> = ({
  root,
  onFileClick,
  onFolderClick,
  onContextMenu,
}) => {
  return (
    <div className="overflow-auto">
      <FileTreeNode
        node={root}
        onFileClick={onFileClick}
        onFolderClick={onFolderClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
};
