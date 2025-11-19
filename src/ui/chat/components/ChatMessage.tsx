import React from "react";
import type { ChatMessage as ChatMessageType } from "../../../core/chat";
import { Markdown } from "../../markdown/Markdown";
import { AttachmentList } from "./MessageAttachments";

interface Props {
  message: ChatMessageType;
}

export const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-3xl rounded-lg px-3 py-2 text-sm border theme-border ${
          isUser ? "theme-message-user" : "theme-message-assistant"
        }`}
      >
        <Markdown content={message.content || ""} />
      </div>
      {message.attachments?.length ? <AttachmentList attachments={message.attachments} /> : null}
    </div>
  );
};
