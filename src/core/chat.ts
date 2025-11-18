import type { Attachment, ModelInfo, ToolCall } from "./types";

export interface Conversation {
  id: string;
  title?: string;
  workspacePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: string;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStreamChunk {
  id: string;
  conversationId: string;
  messageId: string;
  delta: string;
  done?: boolean;
}

export interface ChatSendRequest {
  conversationId: string;
  prompt: string;
  model: ModelInfo | string;
  attachments?: Attachment[];
  context?: Record<string, unknown>;
  stream?: boolean;
}

export interface ChatClient {
  listConversations(workspacePath?: string): Promise<Conversation[]>;
  createConversation(workspacePath?: string): Promise<Conversation>;
  deleteConversation(conversationId: string): Promise<void>;
  listMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(request: ChatSendRequest): Promise<ChatMessage | AsyncGenerator<ChatStreamChunk>>;
  deleteMessage(conversationId: string, messageId: string): Promise<void>;
}
