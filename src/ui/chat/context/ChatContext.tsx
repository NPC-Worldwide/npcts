import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Attachment, ChatMessage, ChatSendRequest, Conversation } from "../../../core/chat";
import type { AppServices } from "../../../adapters/base";
import type { ModelInfo } from "../../../core/types";

type MessageMap = Record<string, ChatMessage[]>;

interface ChatState {
  conversations: Conversation[];
  messages: MessageMap;
  activeConversationId?: string;
  loading: boolean;
  streaming: boolean;
  error?: string;
  send: (payload: Omit<ChatSendRequest, "conversationId">) => Promise<void>;
  setActiveConversation: (id: string) => void;
  createConversation: (workspacePath?: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshMessages: (id: string) => Promise<void>;
  setWorkspacePath: (path?: string) => void;
  workspacePath?: string;
  models?: ModelInfo[];
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
}

const ChatContext = createContext<ChatState | undefined>(undefined);

export const ChatProvider: React.FC<{
  services: AppServices;
  workspacePath?: string;
  children: React.ReactNode;
  models?: ModelInfo[];
}> = ({ services, workspacePath, children, models }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageMap>({});
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | undefined>(workspacePath);

  useEffect(() => {
    setCurrentWorkspace(workspacePath);
  }, [workspacePath]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const convs = await services.chat.listConversations(currentWorkspace);
        setConversations(convs);
        if (!activeConversationId && convs[0]) {
          setActiveConversationId(convs[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  const refreshMessages = async (id: string) => {
    try {
      const msgs = await services.chat.listMessages(id);
      setMessages((prev) => ({ ...prev, [id]: msgs }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      refreshMessages(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const send = async (payload: Omit<ChatSendRequest, "conversationId">) => {
    if (!activeConversationId) return;
    setStreaming(Boolean(payload.stream));
    try {
      const result = await services.chat.sendMessage({
        ...payload,
        conversationId: activeConversationId,
      });

      if (typeof (result as any)?.[Symbol.asyncIterator] === "function") {
        const chunks: string[] = [];
        for await (const chunk of result as AsyncGenerator<any>) {
          if (chunk?.delta) {
            chunks.push(chunk.delta);
            setMessages((prev) => {
              const prevMsgs = prev[activeConversationId] || [];
              const last = prevMsgs[prevMsgs.length - 1];
              const partial: ChatMessage =
                last && last.role === "assistant" && last.metadata?.streaming
                  ? { ...last, content: (last.content || "") + chunk.delta }
                  : {
                      id: chunk.messageId ?? `stream-${Date.now()}`,
                      role: "assistant",
                      content: chunk.delta,
                      metadata: { streaming: true },
                    };
              return {
                ...prev,
                [activeConversationId]: [...prevMsgs.filter((m) => m !== last), partial],
              };
            });
          }
        }
      } else if (result) {
        await refreshMessages(activeConversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setStreaming(false);
    }
  };

  const createConversation = async (ws?: string) => {
    const newConv = await services.chat.createConversation(ws ?? currentWorkspace);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const deleteConversation = async (id: string) => {
    await services.chat.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessages((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    if (activeConversationId === id) {
      setActiveConversationId(conversations.find((c) => c.id !== id)?.id);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    await services.chat.deleteMessage(activeConversationId, messageId);
    await refreshMessages(activeConversationId);
  };

  const value: ChatState = useMemo(
    () => ({
      conversations,
      messages,
      activeConversationId,
      loading,
      streaming,
      error,
      send,
      setActiveConversation: setActiveConversationId,
      createConversation,
      deleteConversation,
      deleteMessage,
      refreshMessages,
      workspacePath: currentWorkspace,
      setWorkspacePath: setCurrentWorkspace,
      models,
      attachments,
      setAttachments,
    }),
    [
      activeConversationId,
      attachments,
      conversations,
      currentWorkspace,
      error,
      loading,
      messages,
      models,
      streaming,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
};
