import React, { useMemo } from "react";
import { useChatContext } from "../context/ChatContext";
import { ChatMessage } from "./ChatMessage";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { Spinner } from "../../primitives/Spinner";

export const ChatView: React.FC = () => {
  const { messages, activeConversationId, streaming, loading } = useChatContext();
  const currentMessages = useMemo(
    () => (activeConversationId ? messages[activeConversationId] || [] : []),
    [activeConversationId, messages],
  );
  const scrollRef = useAutoScroll<HTMLDivElement>([currentMessages.length, streaming]);

  return (
    <div className="flex-1 flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {currentMessages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {loading && <Spinner />}
      </div>
    </div>
  );
};
