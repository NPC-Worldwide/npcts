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

/**
 * Message role types supported by LLM APIs.
 */
export type MessageRole = "user" | "assistant" | "system" | "tool" | "function";

/**
 * A single message in a conversation with an LLM.
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

/**
 * Cleans messages for LLM consumption by removing NPC internal metadata
 * and ensuring proper formatting. Mirrors the npcpy implementation.
 * 
 * @param messages - Array of messages to clean
 * @param removeSystemMessages - Whether to filter out system messages
 * @returns Cleaned message array suitable for LLM APIs
 */
export function cleanMessagesForLlm(
  messages: Message[],
  removeSystemMessages: boolean = false
): Message[] {
  const cleaned: Message[] = [];

  for (const msg of messages) {
    // Skip NPC internal metadata messages (marked with npc_ prefix in name)
    if (msg.name && msg.name.startsWith("npc_")) {
      continue;
    }

    // Skip system messages if requested
    if (removeSystemMessages && msg.role === "system") {
      continue;
    }

    // Create a clean message with only the essential fields
    const cleanMsg: Message = {
      role: msg.role,
      content: msg.content
    };

    // Preserve name for non-system messages if present and not internal
    if (msg.name && !msg.name.startsWith("npc_")) {
      cleanMsg.name = msg.name;
    }

    // Preserve tool call fields if present
    if (msg.tool_calls) {
      cleanMsg.tool_calls = msg.tool_calls;
    }
    if (msg.tool_call_id) {
      cleanMsg.tool_call_id = msg.tool_call_id;
    }

    cleaned.push(cleanMsg);
  }

  return cleaned;
}

/**
 * Strips NPC-specific metadata from message content.
 * Removes any content that starts with NPC internal markers.
 * 
 * @param content - The message content to clean
 * @returns Cleaned content string
 */
export function stripNpcMetadata(content: string): string {
  if (!content) {
    return content;
  }

  // Remove NPC-specific metadata markers
  // Pattern: <!--NPC:...--> or similar internal markers
  const cleaned = content
    .replace(/<!--NPC:[\s\S]*?-->/g, "")
    .replace(/\[NPC_INTERNAL:[\s\S]*?\]/g, "")
    .trim();

  return cleaned;
}

/**
 * Formats messages for a specific LLM provider.
 * Currently supports OpenAI-compatible format.
 * 
 * @param messages - Array of messages to format
 * @param provider - The LLM provider format to use
 * @returns Formatted messages for the specified provider
 */
export function formatMessagesForProvider(
  messages: Message[],
  provider: "openai" | "anthropic" | "generic" = "openai"
): Record<string, unknown>[] {
  const cleaned = cleanMessagesForLlm(messages);

  switch (provider) {
    case "anthropic":
      // Anthropic uses a different message format
      return cleaned.map(msg => ({
        role: msg.role === "system" ? "user" : msg.role, // Anthropic handles system differently
        content: stripNpcMetadata(msg.content)
      }));
    
    case "openai":
    case "generic":
    default:
      // Standard OpenAI-compatible format
      return cleaned.map(msg => {
        const formatted: Record<string, unknown> = {
          role: msg.role,
          content: stripNpcMetadata(msg.content)
        };
        if (msg.name) {
          formatted.name = msg.name;
        }
        if (msg.tool_calls) {
          formatted.tool_calls = msg.tool_calls;
        }
        if (msg.tool_call_id) {
          formatted.tool_call_id = msg.tool_call_id;
        }
        return formatted;
      });
  }
}
