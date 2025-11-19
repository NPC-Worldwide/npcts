import React, { useCallback, useEffect, useRef } from "react";

interface Props {
  predictionSuggestion: string;
  predictionTargetElement: HTMLElement | null;
  isPredictiveTextEnabled: boolean;
  setPredictionSuggestion: (value: string) => void;
  setPredictionTargetElement: (el: HTMLElement | null) => void;
}

export const PredictiveTextOverlay: React.FC<Props> = ({
  predictionSuggestion,
  predictionTargetElement,
  isPredictiveTextEnabled,
  setPredictionSuggestion,
  setPredictionTargetElement,
}) => {
  if (!predictionSuggestion || !predictionTargetElement || !isPredictiveTextEnabled) {
    return null;
  }

  const targetRect = predictionTargetElement.getBoundingClientRect();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const handleAcceptSuggestion = useCallback(() => {
    if (predictionTargetElement && predictionSuggestion) {
      const suggestionToInsert = predictionSuggestion.trim();

      if (
        predictionTargetElement instanceof HTMLTextAreaElement ||
        predictionTargetElement instanceof HTMLInputElement
      ) {
        const start = predictionTargetElement.selectionStart || 0;
        const end = predictionTargetElement.selectionEnd || 0;
        const value = predictionTargetElement.value;

        predictionTargetElement.value = value.substring(0, start) + suggestionToInsert + value.substring(end);
        predictionTargetElement.selectionStart = predictionTargetElement.selectionEnd = start + suggestionToInsert.length;
        const event = new Event("input", { bubbles: true });
        predictionTargetElement.dispatchEvent(event);
      } else if (predictionTargetElement.isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(suggestionToInsert));
          range.setStart(range.endContainer, range.endOffset);
          range.collapse(true);
        }
      }
      setPredictionSuggestion("");
      setPredictionTargetElement(null);
    }
  }, [predictionSuggestion, predictionTargetElement, setPredictionSuggestion, setPredictionTargetElement]);

  useEffect(() => {
    const handleOverlayKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && predictionSuggestion) {
        e.preventDefault();
        handleAcceptSuggestion();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPredictionSuggestion("");
        setPredictionTargetElement(null);
      }
    };
    document.addEventListener("keydown", handleOverlayKeyDown);
    return () => document.removeEventListener("keydown", handleOverlayKeyDown);
  }, [handleAcceptSuggestion, predictionSuggestion, setPredictionSuggestion, setPredictionTargetElement]);

  const style: React.CSSProperties = {
    position: "fixed",
    left: targetRect.left,
    top: targetRect.bottom + 5,
    zIndex: 1000,
    maxWidth: targetRect.width,
    backgroundColor: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-border)",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    padding: "8px",
    color: "var(--theme-text-muted)",
    fontSize: "0.875rem",
    whiteSpace: "pre-wrap",
    cursor: "text",
  };

  return (
    <div ref={overlayRef} style={style} onClick={handleAcceptSuggestion}>
      {predictionSuggestion}
      {predictionSuggestion === "Generating..." && (
        <span
          className="ml-1 inline-block w-1.5 h-1.5 theme-text-muted rounded-full animate-bounce"
          style={{ animationDelay: "0.15s" }}
        />
      )}
      <div className="text-xs text-blue-400 mt-1">
        Press <span className="font-bold">Tab</span> to accept, <span className="font-bold">Esc</span> to dismiss.
      </div>
    </div>
  );
};
