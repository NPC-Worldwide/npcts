/**
 * Team/Agent System - Core Types
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  messages: Message[];
  context?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: { name: string; type: string; description?: string; required?: boolean }[];
}

export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;

export interface AgentConfig {
  name: string;
  primaryDirective?: string;
  model?: string;
  provider?: string;
  apiUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  memory?: { enabled: boolean; strategy?: string; windowSize?: number };
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface LLMStreamChunk {
  delta: string;
  done: boolean;
}

export interface Todo {
  id: string;
  description: string;
  complexity?: string;
  subtasks?: Todo[];
  completed: boolean;
}

export type AgentCapability = 'chat' | 'tool_use' | 'planning' | 'code_generation' | 'memory_management';

export interface TeamMember {
  agentId: string;
  role: 'lead' | 'member' | 'specialist';
 directives?: string[];
  capabilities: AgentCapability[];
}

export class AgentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AgentError';
  }
}
