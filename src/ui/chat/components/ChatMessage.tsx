import React from "react";
import type { ChatMessage as ChatMessageType } from "../../../core/chat";
import { Markdown } from "../../markdown/Markdown";
import { AttachmentList } from "./MessageAttachments";

interface Props {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-3xl rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        }`}
      >
        <Markdown content={message.content || ""} />
      </div>
      {message.attachments?.length ? <AttachmentList attachments={message.attachments} /> : null}
    </div>
  );
};
