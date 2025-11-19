import React, { useEffect, useMemo, useRef } from "react";
import { useChatContext } from "../context/ChatContext";
import { ChatMessageBubble } from "./ChatMessage";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { Spinner } from "../../primitives/Spinner";
import { Conversation } from "../../../core/chat";

export type MessageListProps = {
  renderHeader?: (args: { conversation?: Conversation | undefined; messageCount: number }) => React.ReactNode;
  renderMessage?: (message: any) => React.ReactNode;
};

// Message list pane with header; defaults mimic ChatInterface.jsx message pane styling
export const ChatView: React.FC<MessageListProps> = ({
  renderHeader,
  renderMessage,
}) => {
  const { messages, activeConversationId, streaming, loading, conversations } = useChatContext();

  const currentMessages = useMemo(
    () => (activeConversationId ? messages[activeConversationId] || [] : []),
    [activeConversationId, messages],
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useAutoScroll<HTMLDivElement>([currentMessages.length, streaming]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [currentMessages.length]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  const defaultHeader = (
    <div className="flex items-center justify-between px-4 py-2 border-b theme-border bg-gray-800/60 text-gray-300 text-xs">
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wide">Conversation: {activeConversation?.id || "None"}</span>
        <span className="text-[11px] text-gray-400">Msgs: {currentMessages.length}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-200 text-[11px]">Auto</span>
        <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-200 text-[11px]">Select</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col theme-bg-primary">
      {renderHeader
        ? renderHeader({ conversation: activeConversation, messageCount: currentMessages.length })
        : defaultHeader}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        {currentMessages.map((m) =>
          renderMessage ? renderMessage(m) : <ChatMessageBubble key={m.id} message={m} />,
        )}
        {loading && <Spinner />}
      </div>
    </div>
  );
};
