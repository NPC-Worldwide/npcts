/**
 * Agent - Core agent implementation
 */

import { AgentConfig, Message, MessageRole, Conversation, ToolCall, ToolDefinition, LLMResponse, LLMStreamChunk, Todo, AgentError } from './types';

function generateId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`; }

function createMessage(role: MessageRole, content: string, overrides?: Partial<Message>): Message {
  return { id: generateId(), role, content, timestamp: Date.now(), ...overrides };
}

export class Agent {
  private config: AgentConfig;
  private conversation: Conversation;
  private toolRegistry: Map<string, { def: ToolDefinition; executor: (args: any) => Promise<any> }>;

  constructor(config: AgentConfig) {
    this.config = config;
    this.conversation = { id: generateId(), messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    this.toolRegistry = new Map();

    if (config.primaryDirective) {
      this.conversation.messages.push(createMessage('system', this.buildSystemPrompt()));
    }
  }

  private buildSystemPrompt(): string {
    const parts: string[] = [];
    if (this.config.primaryDirective) parts.push(this.config.primaryDirective);
    parts.push(`You are ${this.config.name}.`);
    return parts.join('\n\n');
  }

  registerTool(def: ToolDefinition, executor: (args: any) => Promise<any>): void {
    this.toolRegistry.set(def.name, { def, executor });
  }

  hasTool(name: string): boolean { return this.toolRegistry.has(name); }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.toolRegistry.values()).map(e => e.def);
  }

  private async executeToolCall(toolCall: ToolCall): Promise<Message> {
    const entry = this.toolRegistry.get(toolCall.function.name);
    if (!entry) {
      return createMessage('tool', JSON.stringify({ error: `Tool not found` }), { tool_call_id: toolCall.id, name: toolCall.function.name });
    }
    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await entry.executor(args);
      return createMessage('tool', typeof result === 'string' ? result : JSON.stringify(result), { tool_call_id: toolCall.id, name: toolCall.function.name });
    } catch (err) {
      return createMessage('tool', JSON.stringify({ error: String(err) }), { tool_call_id: toolCall.id, name: toolCall.function.name });
    }
  }

  async getResponse(input: string): Promise<LLMResponse> {
    this.conversation.messages.push(createMessage('user', input));
    
    // Placeholder - actual LLM call would go here
    const mockResponse: LLMResponse = { content: `Response from ${this.config.name}` };
    
    this.conversation.messages.push(createMessage('assistant', mockResponse.content));
    this.conversation.updatedAt = Date.now();
    return mockResponse;
  }

  async *streamResponse(input: string): AsyncGenerator<LLMStreamChunk> {
    this.conversation.messages.push(createMessage('user', input));
    yield { delta: 'Streaming...', done: false };
    yield { delta: ` from ${this.config.name}`, done: true };
  }

  async run(input: string): Promise<string> {
    const response = await this.getResponse(input);
    return response.content;
  }

  getConversation(): Conversation {
    return { ...this.conversation, messages: [...this.conversation.messages] };
  }
}
