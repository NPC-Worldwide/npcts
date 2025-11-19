import React, { useState } from 'react';
import { Wrench, FolderTree, ChevronRight } from 'lucide-react';

export interface Jinx {
  jinx_name: string;
  path: string;
  description?: string;
  inputs?: string[];
}

interface JinxTreeProps {
  jinxs: Jinx[];
  selectedJinx: string | null;
  onJinxSelect: (jinx: Jinx) => void;
}

export const JinxTree: React.FC<JinxTreeProps> = ({
  jinxs,
  selectedJinx,
  onJinxSelect
}) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set<string>());

  const buildTree = (jinxList: Jinx[]) => {
    const tree: any = { folders: {}, files: [] };
    
    for (const jinx of jinxList) {
      const pathParts = (jinx.path || jinx.jinx_name).split('/');
      
      if (pathParts.length === 1) {
        tree.files.push(jinx);
      } else {
        let current = tree;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folder = pathParts[i];
          if (!current.folders[folder]) {
            current.folders[folder] = { folders: {}, files: [] };
          }
          current = current.folders[folder];
        }
        current.files.push(jinx);
      }
    }
    return tree;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderTree = (node: any, path = ''): JSX.Element[] => {
    const items: JSX.Element[] = [];
    
    const sortedFolders = Object.keys(node.folders).sort();
    for (const folder of sortedFolders) {
      const folderPath = path ? `${path}/${folder}` : folder;
      const isExpanded = expandedFolders.has(folderPath);
      
      items.push(
        <div key={folderPath}>
          <button
            onClick={() => toggleFolder(folderPath)}
            className="flex items-center gap-2 w-full p-2 rounded text-sm 
              text-left hover:bg-gray-800"
          >
            <FolderTree size={16} className="text-yellow-500" />
            <span className="flex-1 font-medium">{folder}</span>
            <ChevronRight 
              size={16} 
              className={`text-gray-500 transition-transform 
                ${isExpanded ? 'rotate-90' : ''}`} 
            />
          </button>
          {isExpanded && (
            <div className="ml-4 border-l border-gray-700 pl-2">
              {renderTree(node.folders[folder], folderPath)}
            </div>
          )}
        </div>
      );
    }
    
    const sortedFiles = node.files.sort((a: Jinx, b: Jinx) => 
      a.jinx_name.localeCompare(b.jinx_name)
    );
    for (const jinx of sortedFiles) {
      items.push(
        <button
          key={jinx.path || jinx.jinx_name}
          onClick={() => onJinxSelect(jinx)}
          className={`flex items-center gap-2 w-full p-2 rounded text-sm 
            text-left ${
              selectedJinx === jinx.jinx_name 
                ? 'bg-blue-600/50' 
                : 'hover:bg-gray-800'
            }`}
        >
          <Wrench size={14} className="text-gray-400" />
          <span className="flex-1 truncate">{jinx.jinx_name}</span>
        </button>
      );
    }
    
    return items;
  };

  const tree = buildTree(jinxs);

  return (
    <div className="space-y-1">
      {renderTree(tree)}
      {jinxs.length === 0 && (
        <div className="text-center p-4 text-gray-500 text-sm">
          No jinxs found
        </div>
      )}
    </div>
  );
};
