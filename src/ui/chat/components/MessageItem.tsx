import React, { memo } from "react";
import { Paperclip, Wrench } from "lucide-react";

type Message = {
  id?: string;
  timestamp?: string;
  role: string;
  content?: string;
  npc?: string;
  model?: string;
  isStreaming?: boolean;
  type?: string;
  attachments?: any[];
  tool_calls?: any[];
  tool_use_history?: any[];
};

interface Props {
  message: Message;
  isSelected: boolean;
  messageSelectionMode: boolean;
  toggleMessageSelection: (id: string) => void;
  handleMessageContextMenu: (e: React.MouseEvent, id: string) => void;
  searchTerm: string;
  isCurrentSearchResult: boolean;
  onResendMessage?: (m: Message) => void;
  onCreateBranch?: (idx: number) => void;
  messageIndex: number;
}

export const MessageItem: React.FC<Props> = memo(({
  message,
  isSelected,
  messageSelectionMode,
  toggleMessageSelection,
  handleMessageContextMenu,
  searchTerm,
  isCurrentSearchResult,
  onResendMessage,
  onCreateBranch,
  messageIndex,
}) => {
  const messageId = message.id || message.timestamp || String(messageIndex);

  return (
    <div
      id={`message-${messageId}`}
      className={`max-w-[85%] rounded-lg p-3 relative group ${
        message.role === "user" ? "theme-message-user" : "theme-message-assistant"
      } ${message.type === "error" ? "theme-message-error theme-border" : ""} ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${isCurrentSearchResult ? "ring-2 ring-yellow-500" : ""} ${messageSelectionMode ? "cursor-pointer" : ""}`}
      onClick={() => messageSelectionMode && toggleMessageSelection(messageId)}
      onContextMenu={(e) => handleMessageContextMenu(e, messageId)}
    >
      {messageSelectionMode && (
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleMessageSelection(messageId)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {message.role === "user" && !messageSelectionMode && onCreateBranch && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateBranch(messageIndex);
            }}
            className="p-1 theme-hover rounded-full transition-all"
            title="Create branch from here"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
          </button>
        </div>
      )}

      {message.role === "user" && !messageSelectionMode && onResendMessage && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResendMessage(message);
            }}
            className="p-1 theme-hover rounded-full transition-all"
            title="Resend"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center text-xs theme-text-muted mb-1 opacity-80">
        <span className="font-semibold">{message.role === "user" ? "You" : (message.npc || "Agent")}</span>
        <div className="flex items-center gap-2">
          {message.role !== "user" && message.model && (
            <span className="truncate" title={message.model}>{message.model}</span>
          )}
          <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
        </div>
      </div>

      <div className="whitespace-pre-wrap break-words">{message.content}</div>

      {(message.attachments?.length || message.tool_calls?.length || message.tool_use_history?.length) ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs theme-text-muted">
          {message.attachments?.length ? (
            <span className="flex items-center gap-1">
              <Paperclip size={12} /> {message.attachments.length} attachments
            </span>
          ) : null}
          {(message.tool_calls?.length || message.tool_use_history?.length) ? (
            <span className="flex items-center gap-1">
              <Wrench size={12} /> {(message.tool_calls?.length || 0) + (message.tool_use_history?.length || 0)} tool calls
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
