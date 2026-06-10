/**
 * NPC TypeScript Streaming Module
 * Mirrors npcpy.streaming for feature parity
 * Handles SSE streaming, chunk parsing, message cleaning, tool execution
 */

// ============================================================================
// Types
// ============================================================================

export type StreamStatus = "idle" | "streaming" | "error" | "completed" | "interrupted";

export interface StreamController {
  streamId: string;
  abort(): Promise<void> | void;
}

export interface StreamHandlers<TChunk> {
  onChunk: (chunk: TChunk) => void;
  onComplete?: () => void;
  onError?: (error: unknown) => void;
}

/** Event types emitted by streaming generators */
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

/** Configuration for a streaming request */
export interface StreamConfig {
  npc?: NPC;
  team?: Team;
  model?: string;
  provider?: string;
  messages: ChatMessage[];
  commandstr: string;
  temperature?: number;
  params?: Record<string, unknown>;
  attachments?: Attachment[];
  images?: ImageData[];
  disableThinking?: boolean;
  maxToolIterations?: number;
  currentPath?: string;
  context?: string;
  stream?: boolean;
  apiUrl?: string;
}

/** A typed event emitted by the streaming generators */
export interface StreamEvent {
  type: StreamEventType;
  data: Record<string, unknown>;
}

/** Chat message format */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/** Tool call structure */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/** Tool call delta (streaming) */
export interface ToolCallDelta {
  index?: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

/** SSE chunk in OpenAI format */
export interface SSEChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: SSEChoice[];
}

export interface SSEChoice {
  index: number;
  delta: SSEDelta;
  finish_reason?: string | null;
}

export interface SSEDelta {
  content?: string;
  role?: string;
  reasoning_content?: string;
  tool_calls?: ToolCallDelta[];
}

/** Tool executor info */
export interface ToolExecutor {
  type: "jinx" | "mcp" | "python";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jinx?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolFunc?: (...args: unknown[]) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  func?: (...args: unknown[]) => unknown;
}

/** NPC interface (minimal) */
export interface NPC {
  model: string;
  provider: string;
  memory: ChatMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jinxesDict?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jinxToolCatalog?: Record<string, any>;
  getSystemPrompt?(toolCapable?: boolean): string;
  getLLMResponse?(options: Record<string, unknown>): Promise<unknown>;
  checkLLMCommand?(command: string, options: Record<string, unknown>): Generator<[string, unknown], void, unknown>;
  resolveTools?(options?: { mcpClientsCache?: Record<string, unknown> }): [ToolSchema[], Record<string, ToolExecutor>];
}

/** Team interface */
export interface Team {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members?: any[];
}

/** Tool schema for LLM */
export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/** Attachment metadata */
export interface Attachment {
  name: string;
  contentType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

/** Image data */
export interface ImageData {
  url: string;
  base64?: string;
}

/** Usage statistics */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost?: number;
}

// ============================================================================
// Message Cleaning
// ============================================================================

/**
 * Remove orphaned tool_calls and tool results from message history.
 * Tool call messages without matching tool results (and vice versa) cause
 * API errors with OpenAI-compatible providers.
 */
export function cleanMessagesForLLM(messages: ChatMessage[]): ChatMessage[] {
  const toolCallIdsWithResults = new Set<string>();
  const allToolCallIds = new Set<string>();

  // First pass: collect tool call IDs
  for (const msg of messages) {
    if (msg.role === "assistant" && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (tc.id) {
          allToolCallIds.add(tc.id);
        }
      }
    }
    if (msg.role === "tool" && msg.tool_call_id) {
      toolCallIdsWithResults.add(msg.tool_call_id);
    }
  }

  // Valid tool calls have both the call and the result
  const validToolCallIds = new Set<string>();
  for (const id of allToolCallIds) {
    if (toolCallIdsWithResults.has(id)) {
      validToolCallIds.add(id);
    }
  }

  // Second pass: filter messages
  const cleaned: ChatMessage[] = [];
  for (const msg of messages) {
    // Filter orphaned tool results
    if (msg.role === "tool") {
      if (!msg.tool_call_id || !validToolCallIds.has(msg.tool_call_id)) {
        continue;
      }
    }

    // Filter orphaned tool calls from assistant messages
    if (msg.role === "assistant" && msg.tool_calls) {
      const validToolCalls = msg.tool_calls.filter((tc) => validToolCallIds.has(tc.id));
      if (validToolCalls.length > 0) {
        cleaned.push({
          ...msg,
          tool_calls: validToolCalls,
        });
      } else {
        // Keep message but remove tool_calls
        const { tool_calls: _, ...rest } = msg;
        cleaned.push(rest);
      }
      continue;
    }

    cleaned.push(msg);
  }

  return cleaned;
}

// ============================================================================
// System Prompt Management
// ============================================================================

/**
 * Ensure messages start with a system prompt.
 * Falls back to npc.getSystemPrompt() if available.
 */
export function ensureSystemPrompt(
  messages: ChatMessage[],
  npc?: NPC,
  systemPrompt?: string,
  toolCapable = false
): ChatMessage[] {
  let prompt = systemPrompt;
  if (prompt === undefined && npc?.getSystemPrompt) {
    prompt = npc.getSystemPrompt(toolCapable);
  }

  if (!prompt) {
    return [...messages];
  }

  const result = [...messages];

  if (result.length === 0) {
    result.unshift({ role: "system", content: prompt });
  } else if (result[0].role !== "system") {
    result.unshift({ role: "system", content: prompt });
  } else {
    result[0] = { ...result[0], content: prompt };
  }

  return result;
}

// ============================================================================
// Chunk Parsing (Provider-Agnostic)
// ============================================================================

export interface ParsedChunk {
  content: string;
  reasoning: string;
  toolCallDeltas: ToolCallDelta[];
}

/**
 * Normalize a streaming chunk from any provider into structured data.
 * Handles OpenAI, Ollama, llama.cpp, and plain dict formats.
 */
export function parseStreamChunk(responseChunk: unknown, model = "", provider = ""): ParsedChunk {
  let content = "";
  let reasoning = "";
  const toolCallDeltas: ToolCallDelta[] = [];

  // Ollama / HuggingFace style (message-based)
  if (provider === "ollama" || (typeof model === "string" && model.includes("hf.co"))) {
    const msg =
      (responseChunk as { message?: { content?: string; thinking?: string; tool_calls?: unknown[] } }).message ??
      (typeof responseChunk === "object" && responseChunk !== null
        ? (responseChunk as Record<string, unknown>).message
        : {}) ??
      {};

    content = (msg as { content?: string }).content ?? "";
    reasoning = (msg as { thinking?: string }).thinking ?? "";

    const toolCalls = (msg as { tool_calls?: unknown[] }).tool_calls;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        const tcId = (tc as { id?: string }).id ?? "";
        const tcFunc = (tc as { function?: { name?: string; arguments?: unknown } }).function;
        if (tcFunc) {
          const tcName = tcFunc.name ?? "";
          const tcArgs = typeof tcFunc.arguments === "string" ? tcFunc.arguments : JSON.stringify(tcFunc.arguments ?? {});
          if (tcName) {
            toolCallDeltas.push({
              id: tcId,
              type: "function",
              function: { name: tcName, arguments: tcArgs },
            });
          }
        }
      }
    }
    return { content, reasoning, toolCallDeltas };
  }

  // llama.cpp style (raw dict with choices)
  if (provider === "llamacpp") {
    const chunk = responseChunk as { choices?: { delta?: { content?: string; reasoning_content?: string } }[] };
    if (chunk.choices && chunk.choices.length > 0) {
      const delta = chunk.choices[0].delta ?? {};
      content = delta.content ?? "";
      reasoning = delta.reasoning_content ?? "";
    }
    return { content, reasoning, toolCallDeltas };
  }

  // OpenAI / litellm SDK objects
  const hasChoices =
    typeof responseChunk === "object" &&
    responseChunk !== null &&
    "choices" in responseChunk &&
    Array.isArray((responseChunk as { choices: unknown }).choices);

  if (hasChoices) {
    const choices = (responseChunk as { choices: unknown[] }).choices;
    for (const choice of choices) {
      const delta = (choice as { delta?: { content?: string; reasoning_content?: string; tool_calls?: ToolCallDelta[] } }).delta;
      if (delta) {
        if (delta.content) {
          content += delta.content;
        }
        if (delta.reasoning_content) {
          reasoning += delta.reasoning_content;
        }
        if (delta.tool_calls) {
          toolCallDeltas.push(...delta.tool_calls);
        }
      }
    }
    return { content, reasoning, toolCallDeltas };
  }

  // Plain dict fallback
  if (typeof responseChunk === "object" && responseChunk !== null) {
    const chunk = responseChunk as { content?: string; response?: string };
    content = chunk.content ?? chunk.response ?? "";
  }

  return { content, reasoning, toolCallDeltas };
}

// ============================================================================
// SSE Formatting
// ============================================================================

// Eventlet/gevent WSGI servers buffer responses until minimum_chunk_size
// (default 4096 bytes). SSE events are typically ~80 bytes, so they get
// batched instead of streaming in real-time. We pad each event with an
// SSE comment line (ignored by clients) to force an immediate flush.
const SSE_FLUSH_PAD = ": " + " ".repeat(4096) + "\n\n";

// Generate a unique ID (v4 UUID style or timestamp-based fallback)
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Build a normalized SSE chunk dict in OpenAI format.
 */
function buildSSEChunk(
  content: string,
  model: string,
  reasoning?: string,
  chunkId?: string,
  chunkObj?: string,
  created?: number,
  finishReason?: string | null
): SSEChunk {
  return {
    id: chunkId ?? generateId(),
    object: chunkObj ?? "chat.completion.chunk",
    created: created ?? Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {
          content,
          role: "assistant",
          reasoning_content: reasoning,
        },
        finish_reason: finishReason,
      },
    ],
  };
}

/**
 * Convert a StreamEvent to an SSE data: ... line.
 */
export function formatSSEEvent(event: StreamEvent): string {
  if (event.type === "content_delta") {
    const chunk = buildSSEChunk(
      (event.data.content as string) ?? "",
      (event.data.model as string) ?? "",
      (event.data.reasoning as string) ?? undefined
    );
    return `data: ${JSON.stringify(chunk)}\n\n${SSE_FLUSH_PAD}`;
  }

  if (event.type === "reasoning_delta") {
    const chunk = buildSSEChunk(
      "",
      (event.data.model as string) ?? "",
      (event.data.reasoning as string) ?? ""
    );
    return `data: ${JSON.stringify(chunk)}\n\n${SSE_FLUSH_PAD}`;
  }

  // All other event types just serialize data with the type field
  const payload = { ...event.data, type: event.type };
  return `data: ${JSON.stringify(payload)}\n\n${SSE_FLUSH_PAD}`;
}

/**
 * Format a raw dict as an SSE data line.
 */
export function formatSSERaw(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n${SSE_FLUSH_PAD}`;
}

// ============================================================================
// Tool Resolution
// ============================================================================

export interface ResolvedTools {
  toolsForLLM: ToolSchema[];
  toolExecutors: Map<string, ToolExecutor>;
}

/**
 * Convert a Map to a Record for API compatibility.
 */
function mapToRecord<T>(map: Map<string, T>): Record<string, T> {
  const record: Record<string, T> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
}

/**
 * Resolve all tools available to an NPC: jinx catalog + MCP + python funcs.
 * Returns tools for LLM and a map of executors.
 */
export async function resolveNPCTools(
  npc: NPC | undefined,
  mcpClientsCache?: Map<string, unknown>,
  selectedTools?: string[]
): Promise<ResolvedTools> {
  const toolsForLLM: ToolSchema[] = [];
  const toolExecutors = new Map<string, ToolExecutor>();

  if (!npc) {
    return { toolsForLLM, toolExecutors };
  }

  // 1. NPC.resolveTools() — covers MCP + python tools
  if (npc.resolveTools) {
    const mcpRecord = mcpClientsCache ? mapToRecord(mcpClientsCache) : undefined;
    const [tools, executors] = npc.resolveTools({ mcpClientsCache: mcpRecord });
    toolsForLLM.push(...tools);
    for (const [name, executor] of Object.entries(executors)) {
      toolExecutors.set(name, executor);
    }
  }

  // 2. Jinx tool catalog (backward compat for NPCs without resolveTools)
  if (npc.jinxToolCatalog) {
    const existingNames = new Set(toolsForLLM.map((t) => t.function.name));
    const jinxesDict = npc.jinxesDict ?? {};
    for (const [key, t] of Object.entries(npc.jinxToolCatalog)) {
      const toolSchema = t as ToolSchema;
      const name = toolSchema.function.name;
      if (!existingNames.has(name)) {
        toolsForLLM.push(toolSchema);
        toolExecutors.set(name, {
          type: "jinx",
          jinx: jinxesDict[key],
        });
        existingNames.add(name);
      }
    }
  }

  // 3. Filter by selected tools
  if (selectedTools && selectedTools.length > 0) {
    const allowed = new Set(selectedTools);
    return {
      toolsForLLM: toolsForLLM.filter((t) => allowed.has(t.function.name)),
      toolExecutors: new Map([...toolExecutors].filter(([k]) => allowed.has(k))),
    };
  }

  return { toolsForLLM, toolExecutors };
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute a single tool and return a StreamEvent.
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, unknown>,
  toolId: string,
  toolExecutors: Map<string, ToolExecutor>,
  npc?: NPC
): Promise<StreamEvent> {
  try {
    const executor = toolExecutors.get(toolName);
    if (!executor) {
      return {
        type: "tool_error",
        data: {
          name: toolName,
          id: toolId,
          error: `Tool '${toolName}' not found in resolved tools`,
        },
      };
    }

    let toolContent = "";

    switch (executor.type) {
      case "jinx": {
        const jinxObj = executor.jinx;
        if (!jinxObj) {
          return {
            type: "tool_error",
            data: {
              name: toolName,
              id: toolId,
              error: "Jinx executor missing jinx object",
            },
          };
        }

        try {
          // Assuming jinx has execute method
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jinxCtx = await (jinxObj as any).execute?.({
            inputValues: toolArgs,
            npc,
          });
          toolContent =
            typeof jinxCtx === "object" && jinxCtx !== null
              ? String((jinxCtx as { output?: unknown }).output ?? jinxCtx)
              : String(jinxCtx);
        } catch (e) {
          toolContent = `Jinx execution error: ${e instanceof Error ? e.message : String(e)}`;
        }
        break;
      }

      case "mcp": {
        const toolFunc = executor.toolFunc;
        if (!toolFunc) {
          return {
            type: "tool_error",
            data: {
              name: toolName,
              id: toolId,
              error: "MCP executor missing tool function",
            },
          };
        }
        const result = await toolFunc(...Object.values(toolArgs));
        // Handle MCP result with content array
        if (
          typeof result === "object" &&
          result !== null &&
          "content" in result &&
          Array.isArray((result as { content: unknown[] }).content)
        ) {
          const content = (result as { content: { text: string }[] }).content;
          toolContent = content.length > 0 ? content[0].text : "Tool returned no result";
        } else {
          toolContent = String(result ?? "Tool returned no result");
        }
        break;
      }

      case "python": {
        const func = executor.func;
        if (!func) {
          return {
            type: "tool_error",
            data: {
              name: toolName,
              id: toolId,
              error: "Python executor missing function",
            },
          };
        }
        toolContent = String(await func(...Object.values(toolArgs)));
        break;
      }

      default: {
        return {
          type: "tool_error",
          data: {
            name: toolName,
            id: toolId,
            error: `Unknown executor type: ${executor.type}`,
          },
        };
      }
    }

    return {
      type: "tool_result",
      data: {
        name: toolName,
        id: toolId,
        result: toolContent,
        args: toolArgs,
      },
    };
  } catch (e) {
    return {
      type: "tool_error",
      data: {
        name: toolName,
        id: toolId,
        error: `Tool execution error: ${e instanceof Error ? e.message : String(e)}`,
      },
    };
  }
}

// ============================================================================
// Accumulate Tool Call Deltas
// ============================================================================

/**
 * Merge streaming tool_call deltas into collected list.
 */
export function accumulateToolCallDeltas(collected: ToolCall[], deltas: ToolCallDelta[]): ToolCall[] {
  const result = [...collected];

  for (const tcDelta of deltas) {
    const idx = tcDelta.index ?? result.length;

    // Ensure array has enough slots
    while (result.length <= idx) {
      result.push({
        id: "",
        type: "function",
        function: { name: "", arguments: "" },
      });
    }

    if (tcDelta.id) {
      result[idx].id = tcDelta.id;
    }

    if (tcDelta.function) {
      if (tcDelta.function.name) {
        result[idx].function.name = tcDelta.function.name;
      }
      if (tcDelta.function.arguments) {
        result[idx].function.arguments += tcDelta.function.arguments;
      }
    }
  }

  return result;
}

// ============================================================================
// Chat Stream (No Tool Execution)
// ============================================================================

/**
 * Stream an LLM response without tool execution.
 * Yields StreamEvent objects.
 */
export async function* createChatStream(
  config: StreamConfig,
  cancellationCheck?: () => boolean
): AsyncGenerator<StreamEvent, void, unknown> {
  const { messages, npc, model, provider } = config;

  const kwargs: Record<string, unknown> = { ...config.params };
  if (config.temperature !== undefined && !("temperature" in kwargs)) {
    kwargs.temperature = config.temperature;
  }

  const thinkingKwargs: Record<string, unknown> = {};
  if (!config.disableThinking && provider === "anthropic") {
    thinkingKwargs.thinking = { type: "enabled", budget_tokens: 10000 };
    delete kwargs.temperature;
  }

  let response: unknown;

  try {
    if (npc?.getLLMResponse) {
      response = await npc.getLLMResponse({
        command: config.commandstr,
        messages,
        stream: true,
        attachments: config.attachments,
        autoProcessToolCalls: false,
        ...kwargs,
        ...thinkingKwargs,
      });
    } else {
      // External LLM call - caller must implement
      throw new Error("getLLMResponse not available on NPC. Use external LLM provider.");
    }
  } catch (e) {
    yield {
      type: "tool_error",
      data: { error: `LLM call failed: ${e instanceof Error ? e.message : String(e)}` },
    };
    return;
  }

  // Unwrap response
  let streamIter: AsyncIterable<unknown> | Iterable<unknown> | null = null;

  if (typeof response === "object" && response !== null) {
    const resp = response as { response?: unknown; content?: unknown };
    if (resp.response) {
      streamIter = resp.response as AsyncIterable<unknown> | Iterable<unknown>;
    } else if (resp.content) {
      yield {
        type: "content_delta",
        data: { content: String(resp.content), model: model ?? "" },
      };
      yield { type: "message_stop", data: {} };
      return;
    }
  }

  if (!streamIter) {
    if (typeof response === "string") {
      yield {
        type: "content_delta",
        data: { content: response, model: model ?? "" },
      };
    }
    yield { type: "message_stop", data: {} };
    return;
  }

  // Stream chunks
  try {
    for await (const chunk of streamIter as AsyncIterable<unknown>) {
      if (cancellationCheck?.()) {
        yield { type: "interrupt", data: {} };
        return;
      }

      const { content, reasoning, toolCallDeltas } = parseStreamChunk(chunk, model ?? "", provider ?? "");

      if (content) {
        yield { type: "content_delta", data: { content, model: model ?? "" } };
      }
      if (reasoning) {
        yield { type: "reasoning_delta", data: { reasoning, model: model ?? "" } };
      }

      // Ignore tool_call_deltas in chat mode
      void toolCallDeltas;
    }
  } catch (e) {
    console.error("Error during chat stream:", e);
  }

  yield { type: "message_stop", data: {} };
}

// ============================================================================
// Tool-Agent Stream (With Tool-Calling Loop)
// ============================================================================

/**
 * Agentic streaming loop: call LLM → stream content → execute tool calls → repeat.
 * Uses the OpenAI-style tool_calls mechanism.
 * Mutates config.messages in place.
 */
export async function* createToolAgentStream(
  config: StreamConfig,
  toolsForLLM: ToolSchema[],
  toolExecutors: Map<string, ToolExecutor>,
  cancellationCheck?: () => boolean
): AsyncGenerator<StreamEvent, void, unknown> {
  const { messages, npc, model, provider } = config;
  const prompt = config.commandstr;
  const maxIterations = config.maxToolIterations ?? 10;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const kwargs: Record<string, unknown> = { ...config.params };
  if (config.temperature !== undefined && !("temperature" in kwargs)) {
    kwargs.temperature = config.temperature;
  }

  const thinkingKwargs: Record<string, unknown> = {};
  if (!config.disableThinking && provider === "anthropic") {
    thinkingKwargs.thinking = { type: "enabled", budget_tokens: 10000 };
    delete kwargs.temperature;
  }

  let agentContext = "";
  if (config.currentPath) {
    agentContext = `The user's working directory is ${config.currentPath}`;
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let llmResponse: unknown;

    try {
      if (!npc?.getLLMResponse) {
        throw new Error("getLLMResponse not available on NPC");
      }

      llmResponse = await npc.getLLMResponse({
        prompt,
        model,
        provider,
        messages,
        tools: toolsForLLM,
        stream: true,
        context: agentContext || config.context,
        includeUsage: true,
        ...kwargs,
        ...thinkingKwargs,
      });
    } catch (e) {
      yield {
        type: "tool_error",
        data: { error: `LLM call failed: ${e instanceof Error ? e.message : String(e)}` },
      };
      break;
    }

    // Unwrap response
    let streamIter: AsyncIterable<unknown> | Iterable<unknown> | null = null;
    const usage =
      typeof llmResponse === "object" && llmResponse !== null
        ? (llmResponse as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
        : undefined;

    if (usage) {
      totalInputTokens += usage.input_tokens ?? 0;
      totalOutputTokens += usage.output_tokens ?? 0;
    }

    if (typeof llmResponse === "object" && llmResponse !== null) {
      const resp = llmResponse as { response?: unknown };
      if (resp.response) {
        streamIter = resp.response as AsyncIterable<unknown> | Iterable<unknown>;
      }
    }

    let collectedContent = "";
    const collectedToolCalls: ToolCall[] = [];

    // Stream response chunks
    if (streamIter) {
      for await (const chunk of streamIter) {
        if (cancellationCheck?.()) {
          yield { type: "interrupt", data: {} };
          return;
        }

        const { content, reasoning, toolCallDeltas } = parseStreamChunk(chunk, model ?? "", provider ?? "");

        if (content) {
          collectedContent += content;
          yield { type: "content_delta", data: { content, model: model ?? "" } };
        }
        if (reasoning) {
          yield { type: "reasoning_delta", data: { reasoning, model: model ?? "" } };
        }

        // Accumulate tool call deltas
        if (toolCallDeltas.length > 0) {
          accumulateToolCallDeltas(collectedToolCalls, toolCallDeltas);
        }

        // Extract usage from streaming chunks
        const chunkUsage =
          typeof chunk === "object" && chunk !== null ? (chunk as { usage?: TokenUsage }).usage : undefined;
        if (chunkUsage) {
          totalInputTokens = chunkUsage.inputTokens ?? totalInputTokens;
          totalOutputTokens = chunkUsage.outputTokens ?? totalOutputTokens;
        }
      }
    }

    // No tool calls — we're done
    if (collectedToolCalls.length === 0) {
      break;
    }

    // Serialize tool calls for message history
    const serializedToolCalls: ToolCall[] = collectedToolCalls.map((tc) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments:
          typeof tc.function.arguments === "object"
            ? JSON.stringify(tc.function.arguments)
            : String(tc.function.arguments),
      },
    }));

    messages.push({
      role: "assistant",
      content: collectedContent,
      tool_calls: serializedToolCalls,
    });

    // Signal tool execution start
    yield {
      type: "tool_execution_start",
      data: {
        tool_calls: collectedToolCalls.map((tc) => ({
          name: tc.function.name,
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
    };

    // Execute each tool
    for (const tc of collectedToolCalls) {
      const toolName = tc.function.name;
      let toolArgs: Record<string, unknown> = {};

      if (typeof tc.function.arguments === "string") {
        try {
          toolArgs = tc.function.arguments.trim() ? JSON.parse(tc.function.arguments) : {};
        } catch {
          toolArgs = {};
        }
      } else {
        toolArgs = tc.function.arguments as Record<string, unknown>;
      }

      const toolId = tc.id;

      yield {
        type: "tool_start",
        data: { name: toolName, id: toolId, args: toolArgs },
      };

      const resultEvent = await executeTool(toolName, toolArgs, toolId, toolExecutors, npc);
      yield resultEvent;

      // Add to messages for next iteration
      const toolContent =
        resultEvent.data.result ?? resultEvent.data.error ?? "";
      messages.push({
        role: "tool",
        tool_call_id: toolId,
        name: toolName,
        content: String(toolContent),
      });
    }

    // Next iteration uses tool results in messages, no new prompt
    config.commandstr = "";
  }

  // Emit usage
  if (totalInputTokens > 0 || totalOutputTokens > 0) {
    yield {
      type: "usage",
      data: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    };
  }

  yield { type: "message_stop", data: {} };
}

// ============================================================================
// Jinx Stream (Agentic Jinx Streaming Loop)
// ============================================================================

/**
 * Agentic jinx streaming loop.
 * Mirrors create_jinx_stream from npcpy.streaming.
 */
export async function* createJinxStream(
  npc: NPC,
  command: string,
  cancellationCheck?: () => boolean,
  maxFollowups = 10
): AsyncGenerator<StreamEvent, void, unknown> {
  const { model, provider } = npc;
  const messages = [...npc.memory];

  // Check if we even have jinxes
  const jinxesDict = npc.jinxesDict;

  if (!jinxesDict || Object.keys(jinxesDict).length === 0) {
    // No jinxes — just call getLLMResponse directly
    if (!npc.getLLMResponse) {
      yield {
        type: "tool_error",
        data: { error: "getLLMResponse not available on NPC" },
      };
      return;
    }

    const response = await npc.getLLMResponse({
      command,
      model,
      provider,
      messages,
      stream: true,
    });

    const out =
      typeof response === "object" && response !== null
        ? (response as { response?: unknown }).response ?? response
        : response;

    if (typeof out === "string") {
      yield { type: "content_delta", data: { content: out, model } };
    } else if (typeof out === "object" && out !== null) {
      const iterable = out as AsyncIterable<unknown> | Iterable<unknown>;
      if (Symbol.asyncIterator in iterable || Symbol.iterator in iterable) {
        for await (const chunk of iterable) {
          const { content } = parseStreamChunk(chunk, model, provider);
          if (content) {
            yield { type: "content_delta", data: { content, model } };
          }
        }
      }
    }

    yield { type: "message_stop", data: {} };
    return;
  }

  // Agentic loop: everything goes through checkLLMCommand / jinxes
  for (let iteration = 0; iteration < maxFollowups; iteration++) {
    if (cancellationCheck?.()) {
      yield { type: "interrupt", data: {} };
      return;
    }

    if (iteration > 0) {
      yield { type: "thinking", data: { message: "Processing..." } };
    }

    const cmd =
      iteration === 0
        ? command
        : "Continue. If results are ready, present them to the user using chat, then call stop. Do not call stop without first responding to the user.";

    if (!npc.checkLLMCommand) {
      yield {
        type: "tool_error",
        data: { error: "checkLLMCommand not available on NPC" },
      };
      break;
    }

    try {
      const gen = npc.checkLLMCommand(cmd, { messages, stream: true });

      let hasJinxCalls = false;

      for (const [eventType, data] of gen) {
        if (eventType === "tool_start") {
          const name = (data as { name?: string }).name ?? "";
          if (!["chat", "stop"].includes(name)) {
            hasJinxCalls = true;
            yield { type: "tool_start", data: data as Record<string, unknown> };
          }
        } else if (eventType === "tool_result") {
          const dataObj = data as { name?: string; result?: unknown };
          const name = dataObj.name ?? "";
          const output = dataObj.result;

          if (name === "chat") {
            // Chat — stream wrapper or string becomes content
            if (typeof output === "object" && output !== null) {
              const iterable = output as AsyncIterable<unknown> | Iterable<unknown>;
              if (Symbol.asyncIterator in iterable || Symbol.iterator in iterable) {
                for await (const chunk of iterable) {
                  const { content } = parseStreamChunk(chunk, model, provider);
                  if (content) {
                    yield { type: "content_delta", data: { content, model } };
                  }
                }
              }
            } else if (typeof output === "string") {
              let content = output;
              if (content.startsWith("[Response delivered to user] ")) {
                content = content.slice("[Response delivered to user] ".length);
              }
              if (content) {
                yield { type: "content_delta", data: { content, model } };
              }
            }
          } else if (name !== "stop") {
            yield { type: "tool_result", data: data as Record<string, unknown> };
          }

          if (name === "stop") {
            yield { type: "message_stop", data: {} };
            return;
          }
        } else if (eventType === "content") {
          // Direct response (no jinx)
          const output = data;
          if (typeof output === "string" && output) {
            yield { type: "content_delta", data: { content: output, model } };
          } else if (typeof output === "object" && output !== null) {
            const iterable = output as AsyncIterable<unknown> | Iterable<unknown>;
            if (Symbol.asyncIterator in iterable || Symbol.iterator in iterable) {
              for await (const chunk of iterable) {
                const { content } = parseStreamChunk(chunk, model, provider);
                if (content) {
                  yield { type: "content_delta", data: { content, model } };
                }
              }
            }
          }
        }
      }

      if (!hasJinxCalls) {
        break;
      }
    } catch (e) {
      console.error(`checkLLMCommand error (iter ${iteration}):`, e);
      break;
    }
  }

  yield { type: "message_stop", data: {} };
}

// ============================================================================
// Legacy Exports for Backward Compatibility
// ============================================================================

export { cleanMessagesForLLM as clean_messages_for_llm };
export { ensureSystemPrompt as ensure_system_prompt };
export { parseStreamChunk as parse_stream_chunk };
export { formatSSEEvent as format_sse_event };
export { formatSSERaw as format_sse_raw };
export { resolveNPCTools as resolve_npc_tools };
export { executeTool as execute_tool };
export { accumulateToolCallDeltas as _accumulate_tool_call_deltas };
export { createChatStream as create_chat_stream };
export { createToolAgentStream as create_tool_agent_stream };
export { createJinxStream as create_jinx_stream };
