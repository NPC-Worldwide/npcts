import React from "react";
import { HardDrive, Folder, File } from "lucide-react";

interface FileSize {
  path: string;
  sizeBytes: number;
  isDirectory: boolean;
}

interface DiskUsageAnalyzerProps {
  items?: FileSize[];
  totalSize?: number;
}

export const DiskUsageAnalyzer: React.FC<DiskUsageAnalyzerProps> = ({
  items = [],
  totalSize = 0,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const sortedItems = [...items].sort((a, b) => b.sizeBytes - a.sizeBytes);

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive size={20} />
        <h2 className="text-lg font-semibold">Disk Usage Analysis</h2>
      </div>

      <div className="bg-gray-800 rounded p-3 mb-4">
        <div className="text-sm text-gray-400">Total Size</div>
        <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {sortedItems.map((item, i) => {
          const percentage = totalSize > 0 
            ? (item.sizeBytes / totalSize) * 100 
            : 0;
          return (
            <div key={i} className="bg-gray-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.isDirectory ? (
                    <Folder size={14} className="text-blue-400 flex-shrink-0" />
                  ) : (
                    <File size={14} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{item.path}</span>
                </div>
                <span className="text-sm font-mono ml-2 flex-shrink-0">
                  {formatSize(item.sizeBytes)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {percentage.toFixed(1)}% of total
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
