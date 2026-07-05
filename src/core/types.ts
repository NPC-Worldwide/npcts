export type Provider = "openai" | "ollama" | "anthropic" | "local" | string;

export interface Attachment {
  id: string;
  name: string;
  path: string;
  mime?: string;
  sizeBytes?: number;
}

export interface ModelInfo {
  id: string;
  provider: Provider;
  displayName?: string;
  contextWindow?: number;
  supportsImages?: boolean;
  supportsTools?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status?: "pending" | "running" | "succeeded" | "failed";
  output?: string;
}

/**
 * Tool definition for function calling.
 * Matches the OpenAI-style function calling format.
 */
export interface Tool {
  /** The type of the tool - always "function" for function calling */
  type?: "function";
  /** Function definition */
  function?: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
  /** Direct name (alternative format) */
  name?: string;
  /** Direct description (alternative format) */
  description?: string;
  /** Direct parameters (alternative format) */
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Message interface for chat conversations.
 * Supports both standard messages and tool-related messages.
 */
export interface Message {
  role: string;
  content?: string;
  tool_calls?: ToolCall[];
  name?: string;
}
