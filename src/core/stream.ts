import { NPCMessage } from "./types";

export type StreamStatus = "idle" | "streaming" | "error";

export interface StreamController {
  streamId: string;
  abort(): Promise<void> | void;
}

export interface StreamHandlers<TChunk> {
  onChunk: (chunk: TChunk) => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface ToolResult {
  content: string;
  error?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface StreamConfig {
  /** The LLM provider to use (e.g., 'openai', 'anthropic') */
  provider?: string;
  /** The model ID to use */
  model?: string;
  /** Optional command string for jinx-based streams */
  commandstr?: string;
  /** Temperature for LLM sampling (0-2) */
  temperature?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Disable reasoning/thinking in response */
  disableThinking?: boolean;
  /** Maximum number of tool call iterations */
  maxToolIterations?: number;
  /** Current working path for tool execution */
  currentPath?: string;
  /** System prompt to prepend to messages */
  systemPrompt?: string;
  /** Available tools for tool-calling streams */
  tools?: ToolDefinition[];
  /** NPC database path for tool resolution */
  npcDbPath?: string;
  /** Extra context for jinx compilation */
  jinxContext?: Record<string, unknown>;
}

export type StreamEventType =
  | "content_delta"
  | "reasoning_delta"
  | "tool_execution_start"
  | "tool_start"
  | "tool_result"
  | "tool_error"
  | "usage"
  | "message_stop"
  | "interrupt"
  | "thinking";

export interface StreamEvent {
  /** Event type discriminator */
  type: StreamEventType;
  /** Delta content for content_delta events */
  contentDelta?: string;
  /** Reasoning/thinking content for reasoning_delta events */
  reasoningDelta?: string;
  /** Tool name for tool_start/tool_result events */
  toolName?: string;
  /** Tool call ID for provider tracking */
  toolCallId?: string;
  /** Tool arguments for tool_start events */
  toolArguments?: Record<string, unknown>;
  /** Tool result content for tool_result events */
  toolResult?: ToolResult;
  /** Error message for tool_error events */
  error?: string;
  /** Usage statistics for usage events */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Interrupt reason for interrupt events */
  interruptReason?: string;
  /** Thinking flag for thinking events */
  thinking?: boolean;
}

export interface ChatStreamOptions {
  /** Messages to send to the LLM */
  messages: NPCMessage[];
  /** Configuration for the stream */
  config?: StreamConfig;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}

export interface ToolAgentStreamOptions extends ChatStreamOptions {
  /** Callback for tool execution */
  onToolCall?: (tool: ToolCall) => Promise<ToolResult>;
  /** Callback for tool result events */
  onToolResult?: (toolName: string, result: ToolResult) => void;
}

/**
 * Creates a basic chat stream without tool execution.
 * Matches npcpy's create_chat_stream functionality.
 */
export async function* createChatStream(
  options: ChatStreamOptions
): AsyncGenerator<StreamEvent, void, unknown> {
  const { messages, config = {}, signal } = options;
  const { provider = "openai", model, temperature = 0.7, maxTokens } = config;

  // This is a placeholder implementation - actual implementation would
  // connect to LLM provider and yield stream events
  yield {
    type: "thinking",
    thinking: true,
  };

  // Check for cancellation
  if (signal?.aborted) {
    yield { type: "interrupt", interruptReason: "User cancelled" };
    return;
  }

  // Yield content deltas
  yield {
    type: "content_delta",
    contentDelta: "",
  };

  // Yield usage stats
  yield {
    type: "usage",
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
  };

  yield { type: "message_stop" };
}

/**
 * Creates a streaming chat with tool-calling capabilities.
 * Matches npcpy's create_tool_agent_stream functionality.
 */
export async function* createToolAgentStream(
  options: ToolAgentStreamOptions
): AsyncGenerator<StreamEvent, void, unknown> {
  const {
    messages,
    config = {},
    signal,
    onToolCall,
    onToolResult,
  } = options;
  const { maxToolIterations = 10, tools = [] } = config;

  let iteration = 0;
  let currentMessages = [...messages];

  while (iteration < maxToolIterations) {
    if (signal?.aborted) {
      yield { type: "interrupt", interruptReason: "User cancelled" };
      return;
    }

    // Yield thinking event
    yield { type: "thinking", thinking: true };

    // Stream content from chat
    let contentBuffer = "";
    for await (const event of createChatStream({
      messages: currentMessages,
      config,
      signal,
    })) {
      yield event;
      if (event.type === "content_delta" && event.contentDelta) {
        contentBuffer += event.contentDelta;
      }
      if (event.type === "message_stop") {
        break;
      }
    }

    // Check for tool calls in content buffer
    // This is a simplified implementation - actual would parse structured tool calls
    const hasToolCall = contentBuffer.includes("<tool>");

    if (!hasToolCall) {
      // No tool call, we're done
      yield { type: "message_stop" };
      break;
    }

    // Parse tool call from content
    const toolCall: ToolCall = {
      name: "unknown",
      arguments: {},
    };

    // Yield tool execution start
    yield {
      type: "tool_execution_start",
      toolName: toolCall.name,
    };

    // Yield tool start
    yield {
      type: "tool_start",
      toolName: toolCall.name,
      toolArguments: toolCall.arguments,
    };

    // Execute tool if handler provided
    let toolResult: ToolResult = { content: "" };
    if (onToolCall) {
      try {
        toolResult = await onToolCall(toolCall);
      } catch (error) {
        yield {
          type: "tool_error",
          toolName: toolCall.name,
          error: error instanceof Error ? error.message : String(error),
        };
        break;
      }
    }

    // Yield tool result
    yield {
      type: "tool_result",
      toolName: toolCall.name,
      toolResult,
    };

    if (onToolResult) {
      onToolResult(toolCall.name, toolResult);
    }

    // Update messages for next iteration
    currentMessages.push({
      role: "assistant",
      content: contentBuffer,
    });
    currentMessages.push({
      role: "tool",
      content: toolResult.content,
    });

    iteration++;
  }

  yield { type: "message_stop" };
}

/**
 * Parses a raw stream chunk into a StreamEvent.
 * Provider-agnostic chunk parser matching npcpy's parse_stream_chunk.
 */
export function parseStreamChunk(
  chunk: string,
  provider: string
): StreamEvent | null {
  try {
    const data = JSON.parse(chunk);

    switch (provider) {
      case "openai":
      case "openrouter":
        if (data.choices?.[0]?.delta?.content) {
          return {
            type: "content_delta",
            contentDelta: data.choices[0].delta.content,
          };
        }
        if (data.choices?.[0]?.delta?.tool_calls) {
          const toolCall = data.choices[0].delta.tool_calls[0];
          return {
            type: "tool_start",
            toolName: toolCall.function?.name || "unknown",
            toolArguments: toolCall.function?.arguments
              ? JSON.parse(toolCall.function.arguments)
              : {},
            toolCallId: toolCall.id,
          };
        }
        if (data.usage) {
          return {
            type: "usage",
            usage: {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            },
          };
        }
        break;

      case "anthropic":
        if (data.delta?.text) {
          return {
            type: "content_delta",
            contentDelta: data.delta.text,
          };
        }
        if (data.type === "message_stop") {
          return { type: "message_stop" };
        }
        if (data.message?.usage) {
          return {
            type: "usage",
            usage: {
              promptTokens: data.message.usage.input_tokens,
              completionTokens: data.message.usage.output_tokens,
              totalTokens:
                data.message.usage.input_tokens + data.message.usage.output_tokens,
            },
          };
        }
        break;

      default:
        // Generic fallback
        if (data.content) {
          return {
            type: "content_delta",
            contentDelta: String(data.content),
          };
        }
    }
  } catch {
    // Invalid JSON, ignore
  }
  return null;
}

/**
 * Formats a StreamEvent as an SSE (Server-Sent Events) string.
 * Matches npcpy's format_sse_event functionality.
 */
export function formatSSEEvent(event: StreamEvent): string {
  const data = JSON.stringify(event);
  return `data: ${data}\n\n`;
}

/**
 * Cleans messages for LLM consumption, removing internal metadata.
 * Matches npcpy's clean_messages_for_llm functionality.
 */
export function cleanMessagesForLLM(
  messages: NPCMessage[]
): NPCMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Ensures a system prompt is present in messages.
 * Matches npcpy's ensure_system_prompt functionality.
 */
export function ensureSystemPrompt(
  messages: NPCMessage[],
  systemPrompt: string
): NPCMessage[] {
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) {
    return [{ role: "system", content: systemPrompt }, ...messages];
  }
  return messages;
}
