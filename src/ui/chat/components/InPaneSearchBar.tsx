import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  resultCount: number;
  currentIndex: number;
}

export const InPaneSearchBar: React.FC<Props> = ({
  searchTerm,
  onSearchTermChange,
  onNext,
  onPrevious,
  onClose,
  resultCount,
  currentIndex,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localInputTerm, setLocalInputTerm] = useState(searchTerm);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(localInputTerm.length, localInputTerm.length);
    }
  }, [localInputTerm]);

  useEffect(() => {
    if (localInputTerm !== searchTerm) {
      setLocalInputTerm(searchTerm);
    }
  }, [searchTerm, localInputTerm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full theme-bg-tertiary p-2 rounded-lg">
      <input
        ref={inputRef}
        type="text"
        value={localInputTerm}
        onChange={(e) => {
          setLocalInputTerm(e.target.value);
          onSearchTermChange(e.target.value);
        }}
        className="flex-1 theme-input text-xs rounded px-3 py-2 border-0 focus:ring-1 focus:ring-blue-500"
        placeholder="Search messages..."
        onKeyDown={handleKeyDown}
      />
      <span className="text-xs theme-text-muted min-w-[60px] text-center">
        {resultCount > 0 ? `${currentIndex + 1} of ${resultCount}` : "No results"}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevious}
          disabled={resultCount === 0}
          className="p-2 theme-hover rounded disabled:opacity-50"
          title="Previous (Shift+Enter)"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={onNext}
          disabled={resultCount === 0}
          className="p-2 theme-hover rounded disabled:opacity-50"
          title="Next (Enter)"
        >
          <ChevronRight size={14} />
        </button>
        <button onClick={onClose} className="p-2 theme-hover rounded text-red-400" title="Close search (Escape)">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
