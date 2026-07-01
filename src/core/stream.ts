/**
 * Core streaming utilities for NPC
 * Parity with npcpy.streaming
 */

export interface StreamConfig {
  /** NPC instance (optional) */
  npc?: any;
  /** Team instance (optional) */
  team?: any;
  /** Model identifier */
  model?: string;
  /** Provider name (openai, anthropic, ollama, etc.) */
  provider?: string;
  /** Message history */
  messages: Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string }>;
  /** User prompt/command */
  commandstr?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Additional provider parameters */
  params?: Record<string, any>;
  /** File attachments */
  attachments?: any[];
  /** Image attachments */
  images?: any[];
  /** Disable thinking mode for providers that support it */
  disableThinking?: boolean;
  /** Maximum tool call iterations */
  maxToolIterations?: number;
  /** Current working directory */
  currentPath?: string;
  /** Additional context string */
  context?: string;
  /** Enable streaming */
  stream?: boolean;
  /** Custom API URL */
  apiUrl?: string;
}

export interface StreamEvent {
  type: 'content' | 'chunk' | 'tool_call' | 'tool_result' | 'tool_error' | 'complete' | 'error';
  data?: any;
}

/**
 * Remove orphaned tool_calls and tool results from message history.
 * Tool call messages without matching tool results (and vice versa) cause
 * API errors with OpenAI-compatible providers.
 * 
 * Matches npcpy.streaming.clean_messages_for_llm()
 * 
 * @param messages - Array of message objects
 * @returns Cleaned message array
 */
export function cleanMessagesForLLM(
  messages: Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string }>
): Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string }> {
  const toolCallIdsWithResults = new Set<string>();
  const allToolCallIds = new Set<string>();

  // First pass: collect all tool call IDs
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc && tc.id) {
          allToolCallIds.add(tc.id);
        }
      }
    }
    // Collect tool results
    if (msg.role === 'tool' && msg.tool_call_id) {
      toolCallIdsWithResults.add(msg.tool_call_id);
    }
  }

  // Only keep tool calls that have results
  const validToolCallIds = new Set([...allToolCallIds].filter(id => toolCallIdsWithResults.has(id)));

  // Second pass: filter messages
  const cleaned: Array<{ role: string; content?: string; tool_calls?: any[]; tool_call_id?: string }> = [];
  
  for (const msg of messages) {
    // Skip orphaned tool results
    if (msg.role === 'tool') {
      if (!msg.tool_call_id || !validToolCallIds.has(msg.tool_call_id)) {
        continue;
      }
    }

    // For assistant messages, filter tool_calls
    if (msg.role === 'assistant' && msg.tool_calls) {
      const validToolCalls = msg.tool_calls.filter(
        tc => tc && tc.id && validToolCallIds.has(tc.id)
      );
      cleaned.push({
        ...msg,
        tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined,
      });
      continue;
    }

    cleaned.push(msg);
  }

  return cleaned;
}

/**
 * Ensure messages start with a system prompt.
 * @param messages - Message array
 * @param systemPrompt - System prompt content
 * @returns Modified message array with system prompt
 */
export function ensureSystemPrompt(
  messages: Array<{ role: string; content?: string }>,
  systemPrompt?: string
): Array<{ role: string; content?: string }> {
  if (!systemPrompt) {
    return messages;
  }

  const result = [...messages];
  
  if (!result.length) {
    return [{ role: 'system', content: systemPrompt }];
  }
  
  if (result[0].role !== 'system') {
    result.unshift({ role: 'system', content: systemPrompt });
  } else {
    result[0] = { ...result[0], content: systemPrompt };
  }

  return result;
}

export function formatSseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createStreamingResponse<T>(generator: AsyncGenerator<T>): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(new TextEncoder().encode(formatSseEvent(chunk as unknown as StreamEvent)));
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
