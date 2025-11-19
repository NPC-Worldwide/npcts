import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface PdfViewerProps {
  filePath: string;
  onTextSelect?: (text: string) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  filePath,
  onTextSelect,
}) => {
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div className="flex items-center justify-between p-2 border-b 
        border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-800 flex items-center 
        justify-center">
        <div className="text-gray-400">
          PDF Viewer: {filePath}
          <div className="text-xs mt-2">
            (Requires PDF.js integration)
          </div>
        </div>
      </div>
    </div>
  );
};
