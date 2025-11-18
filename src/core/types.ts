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
