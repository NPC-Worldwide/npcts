import React, { useState, useCallback } from "react";
import { 
  Settings, 
  Plus, 
  ChevronDown, 
  MessageSquare, 
  Folder,
  Globe,
  FileText,
  Terminal as TerminalIcon,
  Search,
} from "lucide-react";
import { FileTree } from "./FileTree";
import type { FileNode } from "../../../core/files";

interface SidebarProps {
  workspacePath?: string;
  fileTree?: FileNode;
  collapsed?: boolean;
  width?: number;
  onFileClick?: (path: string) => void;
  onNewConversation?: () => void;
  onNewFolder?: () => void;
  onNewBrowser?: () => void;
  onNewFile?: () => void;
  onNewTerminal?: () => void;
  onSettingsClick?: () => void;
  onResize?: (width: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspacePath,
  fileTree,
  collapsed = false,
  width = 280,
  onFileClick,
  onNewConversation,
  onNewFolder,
  onNewBrowser,
  onNewFile,
  onNewTerminal,
  onSettingsClick,
  onResize,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(200, Math.min(600, startWidth + delta));
      if (onResize) {
        onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width, onResize]);

  if (collapsed) {
    return (
      <div className="w-8 border-r theme-border flex flex-col 
        items-center py-4 gap-2">
        <button className="p-2 theme-hover rounded">
          <Folder size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-r theme-border flex flex-col flex-shrink-0 
        theme-sidebar relative"
      style={{ width: `${width}px` }}
    >
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize 
          hover:bg-blue-500 transition-colors z-50"
        onMouseDown={handleMouseDown}
        style={{ 
          backgroundColor: isResizing ? "#3b82f6" : "transparent" 
        }}
      />

      <div className="p-4 border-b theme-border flex items-center 
        justify-between flex-shrink-0">
        <span className="text-sm font-semibold theme-text-primary">
          NPC Workspace
        </span>
        <div className="flex gap-2">
          <button
            onClick={onSettingsClick}
            className="p-2 theme-button theme-hover rounded-full"
            aria-label="Settings"
          >
            <Settings size={14} />
          </button>

          <div className="relative group">
            <button className="p-2 theme-button-primary rounded-full 
              flex items-center gap-1">
              <Plus size={14} />
              <ChevronDown size={10} className="opacity-60" />
            </button>

            <div className="absolute left-0 top-full mt-1 theme-bg-secondary 
              border theme-border rounded shadow-lg py-1 z-50 opacity-0 
              invisible group-hover:opacity-100 group-hover:visible 
              transition-all duration-150">
              <button
                onClick={onNewConversation}
                className="flex items-center gap-2 px-3 py-1 w-full 
                  text-left theme-hover text-xs"
              >
                <MessageSquare size={12} />
                <span>New Conversation</span>
              </button>
              <button
                onClick={onNewFolder}
                className="flex items-center gap-2 px-3 py-1 w-full 
                  text-left theme-hover text-xs"
              >
                <Folder size={12} />
                <span>New Folder</span>
              </button>
              <button
                onClick={onNewBrowser}
                className="flex items-center gap-2 px-3 py-1 w-full 
                  text-left theme-hover text-xs"
              >
                <Globe size={12} />
                <span>New Browser</span>
              </button>
              <button
                onClick={onNewFile}
                className="flex items-center gap-2 px-3 py-1 w-full 
                  text-left theme-hover text-xs"
              >
                <FileText size={12} />
                <span>New Text File</span>
              </button>
              <button
                onClick={onNewTerminal}
                className="flex items-center gap-2 px-3 py-1 w-full 
                  text-left theme-hover text-xs"
              >
                <TerminalIcon size={12} />
                <span>New Terminal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 border-b theme-border">
        <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent outline-none text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {fileTree ? (
          <FileTree root={fileTree} onFileClick={onFileClick} />
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No workspace loaded
          </div>
        )}
      </div>

      {workspacePath && (
        <div className="p-2 border-t theme-border text-xs text-gray-500 
          truncate">
          {workspacePath}
        </div>
      )}
    </div>
  );
};
