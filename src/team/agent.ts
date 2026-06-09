/**
 * Agent - Core agent implementation
 * 
 * Uses real LLM calls via llm.ts adapters.
 */

import { AgentConfig, Message, MessageRole, Conversation, ToolCall, ToolDefinition, LLMResponse, LLMStreamChunk, Todo, AgentError } from './types';
import { callLLM, streamLLM, LLMConfig } from './llm';

function generateId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`; }

function createMessage(role: MessageRole, content: string, overrides?: Partial<Message>): Message {
  return { id: generateId(), role, content, timestamp: Date.now(), ...overrides };
}

export class Agent {
  private config: AgentConfig;  private conversation: Conversation;
  private toolRegistry: Map<string, { def: ToolDefinition; executor: (args: any) => Promise<any> }>;

  constructor(config: AgentConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    };
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

  private getLLMConfig(): LLMConfig {
    return {
      model: this.config.model,
      provider: this.config.provider || 'openai',
      apiUrl: this.config.apiUrl,
      apiKey: this.config.apiKey,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };
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

  /**
   * Get LLM response with tool support
   */
  async getResponse(input: string): Promise<LLMResponse> {
    this.conversation.messages.push(createMessage('user', input));
    this.manageMemory();

    const tools = this.getToolDefinitions();
    const llmConfig = this.getLLMConfig();

    let response: LLMResponse;
    try {
      response = await callLLM(this.conversation.messages, llmConfig, tools.length > 0 ? tools : undefined);
    } catch (err) {
      throw new AgentError(`LLM call failed: ${err}`, 'LLM_ERROR');
    }

    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      this.conversation.messages.push(createMessage('assistant', response.content || '', { tool_calls: response.toolCalls }));

      for (const toolCall of response.toolCalls) {
        const toolResult = await this.executeToolCall(toolCall);        this.conversation.messages.push(toolResult);
      }

      // Get final response after tool execution
      return this.getResponse('');
    }

    this.conversation.messages.push(createMessage('assistant', response.content));
    this.conversation.updatedAt = Date.now();
    return response;
  }

  /**
   * Stream LLM response
   */
  async *streamResponse(input: string): AsyncGenerator<LLMStreamChunk> {
    this.conversation.messages.push(createMessage('user', input));
    this.manageMemory();

    const llmConfig = this.getLLMConfig();
    const stream = streamLLM(this.conversation.messages, llmConfig);

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk.delta;
      yield chunk;
    }

    this.conversation.messages.push(createMessage('assistant', fullResponse));
    this.conversation.updatedAt = Date.now();
  }

  async run(input: string): Promise<string> {
    const response = await this.getResponse(input);
    return response.content;
  }

  /**
   * Manage conversation memory window
   */
  private manageMemory(): void {
    if (!this.config.memory?.enabled) return;

    const windowSize = this.config.memory.windowSize || 20;
    const systemMessages = this.conversation.messages.filter(m => m.role === 'system');
    const otherMessages = this.conversation.messages.filter(m => m.role !== 'system');

    if (otherMessages.length > windowSize) {
      const kept = otherMessages.slice(-windowSize);
      this.conversation.messages = [...systemMessages, ...kept];
    }
  }

  getConversation(): Conversation {
    return { ...this.conversation, messages: [...this.conversation.messages] };
  }

  clear(): void {
    const system = this.conversation.messages.find(m => m.role === 'system');
    this.conversation.messages = system ? [system] : [];
    this.conversation.updatedAt = Date.now();
  }

  /**
   * Generate todos for a goal
   */
  async generateTodos(goal: string): Promise<Todo[]> {
    const prompt = `Given the goal: "${goal}", break into actionable steps. Return JSON: [{"id":"1","description":"step","complexity":"medium"}]`;
    const response = await this.run(prompt);
    
    try {
      const todos: Todo[] = JSON.parse(response);
      return todos.map(t => ({ ...t, completed: false }));
    } catch {
      return response.split('\n').filter(l => l.trim()).map((l, i) => ({
        id: String(i + 1),
        description: l.replace(/^[-\d.]+\s*/, ''),
        completed: false,
      }));
    }
  }

  /**
   * Think step by step
   */
  async thinkStepByStep(problem: string): Promise<string> {
    return this.run(`Think through this step by step:\n\n${problem}\n\nProvide reasoning then conclusion.`);
  }

  /**
   * Generate code
   */
  async writeCode(task: string, language = 'typescript'): Promise<string> {
    return this.run(`Write ${language} code for this task:\n\n${task}\n\nProvide ONLY the code in a code block.`);
  }
}
