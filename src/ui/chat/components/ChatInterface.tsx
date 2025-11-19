import React from "react";
import type { AppServices } from "../../../adapters/base";
import type { ModelInfo } from "../../../core/types";
import { ChatProvider } from "../context/ChatContext";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";
import { InputArea } from "./InputArea";
import { useChatContext } from "../context/ChatContext";

interface Props {
  services: AppServices;
  workspacePath?: string;
  models?: ModelInfo[];
}

export const ChatInterface: React.FC<Props> = ({ services, workspacePath, models }) => {
  return (
    <ChatProvider services={services} workspacePath={workspacePath} models={models}>
      <div className="flex h-full min-h-0 theme-bg-primary theme-text-primary border theme-border rounded-lg overflow-hidden">
        <div className="w-72 min-w-[16rem] theme-bg-secondary theme-border border-r">
          <ConversationListWrapper />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <ChatView />
          <InputArea models={models} />
        </div>
      </div>
    </ChatProvider>
  );
};

const ConversationListWrapper: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
    loading,
  } = useChatContext();

  return (
    <ConversationList
      conversations={conversations}
      activeConversationId={activeConversationId}
      onConversationSelect={setActiveConversation}
      onRefresh={() => createConversation()}
      loading={loading}
    />
  );
};
