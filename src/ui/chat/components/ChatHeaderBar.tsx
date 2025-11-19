import React from "react";
import { MessageSquare, Terminal, Code2, Users, Paperclip, Wrench } from "lucide-react";

export interface ConversationStats {
  messageCount?: number;
  tokenCount?: number;
  models?: Set<string>;
  agents?: Set<string>;
  totalAttachments?: number;
  totalToolCalls?: number;
}

export const ChatHeaderBar: React.FC<{ stats: ConversationStats; isEmpty: boolean }> = ({ stats, isEmpty }) => {
  if (isEmpty) return null;
  return (
    <div className="p-2 flex flex-wrap gap-x-4 gap-y-1 text-gray-400 min-h-[20px] theme-bg-secondary border-b theme-border">
      <span>
        <MessageSquare size={12} className="inline mr-1" />
        {stats.messageCount || 0} Msgs
      </span>
      <span>
        <Terminal size={12} className="inline mr-1" />
        ~{stats.tokenCount || 0} Tokens
      </span>
      <span>
        <Code2 size={12} className="inline mr-1" />
        {stats.models?.size || 0} Models
      </span>
      <span>
        <Users size={12} className="inline mr-1" />
        {stats.agents?.size || 0} Agents
      </span>
      {stats.totalAttachments ? (
        <span>
          <Paperclip size={12} className="inline mr-1" />
          {stats.totalAttachments} Attachments
        </span>
      ) : null}
      {stats.totalToolCalls ? (
        <span>
          <Wrench size={12} className="inline mr-1" />
          {stats.totalToolCalls} Tool Calls
        </span>
      ) : null}
    </div>
  );
};
