import React, { memo } from "react";
import { X } from "lucide-react";

interface PaneHeaderProps {
  nodeId: string;
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  fileChanged?: boolean;
  onSave?: () => void;
  onStartRename?: () => void;
  findNodePath: (root: any, id: string) => number[];
  rootLayoutNode: any;
  setDraggedItem: (item: any) => void;
  setPaneContextMenu: (menu: any) => void;
  closeContentPane: (id: string, path: number[]) => void;
}

export const PaneHeader: React.FC<PaneHeaderProps> = memo(({
  nodeId,
  icon,
  title,
  children,
  fileChanged,
  onSave,
  onStartRename,
  findNodePath,
  rootLayoutNode,
  setDraggedItem,
  setPaneContextMenu,
  closeContentPane,
}) => {
  const nodePath = findNodePath(rootLayoutNode, nodeId);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({ type: 'pane', id: nodeId, nodePath })
        );
        setTimeout(() => {
          setDraggedItem({ type: 'pane', id: nodeId, nodePath });
        }, 0);
      }}
      onDragEnd={() => setDraggedItem(null)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPaneContextMenu({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          nodeId,
          nodePath,
        });
      }}
      className="p-2 border-b theme-border text-xs theme-text-muted 
        flex-shrink-0 theme-bg-secondary cursor-move"
    >
      <div className="flex justify-between items-center min-h-[28px] w-full">
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon}
          <span
            className="truncate font-semibold cursor-pointer 
              hover:bg-gray-700 px-1 rounded"
            title={title}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onStartRename) {
                onStartRename();
              }
            }}
          >
            {title}
            {fileChanged && <span className="text-yellow-500 ml-1">*</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeContentPane(nodeId, nodePath);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 theme-hover rounded-full flex-shrink-0 
              transition-all hover:bg-red-500/20"
            aria-label="Close pane"
          >
            <X size={14} className="hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
});
