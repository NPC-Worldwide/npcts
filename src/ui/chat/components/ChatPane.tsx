import React, { useEffect, useRef } from "react";
import { ChatHeaderBar, ConversationStats } from "./ChatHeaderBar";
import { ChatMessageBubble } from "./ChatMessage";
import { Spinner } from "../../primitives/Spinner";

export interface ChatPaneProps {
  isEmpty: boolean;
  stats: ConversationStats;
  scrollRef?: React.Ref<HTMLDivElement> | null;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  renderMessages: () => React.ReactNode;
  renderSelectionToolbar?: () => React.ReactNode;
  renderInputArea: () => React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  paneRef?: React.Ref<HTMLDivElement> | null;
  ariaLabel?: string;
  isStreaming?: boolean;
  isLoadingMessages?: boolean;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
}

// Structural wrapper that mirrors the chat pane layout in ChatInterface.jsx
export const ChatPane: React.FC<ChatPaneProps> = ({
  isEmpty,
  stats,
  scrollRef,
  onScroll,
  renderMessages,
  renderSelectionToolbar,
  renderInputArea,
  onClick,
  onKeyDown,
  paneRef,
  ariaLabel,
  isStreaming,
  isLoadingMessages,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden relative focus:outline-none"
      tabIndex={-1}
      ref={paneRef as any}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel || "Chat pane"}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ChatHeaderBar stats={stats} isEmpty={isEmpty} />

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center theme-text-muted">
          <div className="text-center">
            <div className="text-lg mb-2">No messages yet</div>
            <div className="text-sm">Start a conversation by typing below</div>
          </div>
        </div>
      ) : (
        <>
          <div
            className="flex-1 overflow-y-auto theme-bg-primary custom-scrollbar relative"
            ref={scrollRef as any}
            onScroll={onScroll}
          >
            <div className="flex flex-col gap-4 p-4 pb-24" style={{ userSelect: "auto" }}>
              {renderMessages()}
              {(isStreaming || isLoadingMessages) && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-4 h-4 border-2 border-gray-500 rounded-full border-t-transparent animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                </div>
              )}
            </div>
            {renderSelectionToolbar ? renderSelectionToolbar() : null}
          </div>
        </>
      )}

      {renderInputArea()}
    </div>
  );
};
