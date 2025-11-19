import React, { useEffect, useRef, useState, memo } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Globe, Home } from "lucide-react";

interface BrowserViewerProps {
  initialUrl?: string;
  viewId?: string;
  currentPath?: string;
  onNavigate?: (url: string) => void;
}

export const BrowserViewer: React.FC<BrowserViewerProps> = memo(({
  initialUrl,
  viewId,
  currentPath,
  onNavigate,
}) => {
  const webviewRef = useRef<HTMLIFrameElement>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    if (initialUrl) {
      const formatted = initialUrl.startsWith("http")
        ? initialUrl
        : `https://${initialUrl}`;
      setCurrentUrl(formatted);
      setUrlInput(formatted);
    }
  }, [initialUrl]);

  const handleNavigate = (url: string) => {
    const formatted = url.startsWith("http") ? url : `https://${url}`;
    setCurrentUrl(formatted);
    setUrlInput(formatted);
    if (onNavigate) {
      onNavigate(formatted);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      <div className="flex items-center gap-2 p-2 border-b border-gray-700">
        <button
          onClick={() => window.history.back()}
          disabled={!canGoBack}
          className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={() => window.history.forward()}
          disabled={!canGoForward}
          className="p-2 hover:bg-gray-700 rounded disabled:opacity-50"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => setCurrentUrl(currentUrl)}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <RotateCcw size={16} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-gray-800 rounded px-3 py-1">
          <Globe size={14} className="text-gray-400" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleNavigate(urlInput);
              }
            }}
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Enter URL..."
          />
        </div>
      </div>
      <div className="flex-1 bg-white">
        {currentUrl && (
          <iframe
            ref={webviewRef}
            src={currentUrl}
            className="w-full h-full border-0"
            title="Browser"
          />
        )}
      </div>
    </div>
  );
});

BrowserViewer.displayName = "BrowserViewer";
