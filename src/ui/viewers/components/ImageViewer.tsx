import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageViewerProps {
  filePath: string;
  imageData?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  filePath,
  imageData,
}) => {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div className="flex items-center justify-between p-2 border-b 
        border-gray-700">
        <span className="text-sm text-gray-400">
          {filePath.split("/").pop()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.1, s - 0.1))}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(5, s + 0.1))}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center 
        bg-gray-800">
        {imageData ? (
          <img
            src={imageData}
            alt={filePath}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: "transform 0.2s",
            }}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-gray-400">Loading image...</div>
        )}
      </div>
    </div>
  );
};
