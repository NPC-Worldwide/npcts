/**
 * LLM Provider Adapters
 * 
 * Direct API calls to OpenAI and Ollama.
 * No mock data - real implementations.
 */

import { Message, ToolDefinition, LLMResponse, LLMStreamChunk } from './types';

export interface LLMConfig {
  model?: string;
  provider: 'openai' | 'ollama' | string;
  apiUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call OpenAI API (non-streaming)
 */
export async function callOpenAI(
  messages: Message[],
  config: LLMConfig,
  tools?: ToolDefinition[]
): Promise<LLMResponse> {
  const url = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
  
  const body: any = {
    model: config.model || 'gpt-4',
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 4096,
  };

  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            t.parameters.map(p => [p.name, { type: p.type, description: p.description }])
          ),
          required: t.parameters.filter(p => p.required).map(p => p.name),
        },
      },
    }));
    body.tool_choice = 'auto';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    toolCalls: data.choices[0]?.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: 'function',
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    })),
  };
}

/**
 * Call Ollama API
 */
export async function callOllama(
  messages: Message[],
  config: LLMConfig
): Promise<LLMResponse> {
  const url = config.apiUrl || 'http://localhost:11434/api/chat';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model || 'llama2',
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: config.temperature ?? 0.7,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama ${response.status}: ${err}`);
  }

  const data = await response.json();
  
  return {
    content: data.message?.content || data.response || '',
  };
}

/**
 * Stream from OpenAI
 */
export async function* streamOpenAI(
  messages: Message[],
  config: LLMConfig
): AsyncGenerator<LLMStreamChunk> {
  const url = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI streaming error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta?.content || '';
          if (delta) yield { delta, done: false };
        } catch { /* skip malformed */ }
      }
    }
  }

  yield { delta: '', done: true };
}

/**
 * Route to correct provider
 */
export async function callLLM(
  messages: Message[],
  config: LLMConfig,
  tools?: ToolDefinition[]
): Promise<LLMResponse> {
  switch (config.provider) {
    case 'ollama':
      return callOllama(messages, config);
    case 'openai':
    default:
      return callOpenAI(messages, config, tools);
  }
}

/**
 * Stream from any provider
 */
export async function* streamLLM(
  messages: Message[],
  config: LLMConfig
): AsyncGenerator<LLMStreamChunk> {
  if (config.provider === 'ollama') {
    // Ollama streaming is different - would need separate impl
    const response = await callOllama(messages, config);
    yield { delta: response.content, done: true };
  } else {
    yield* streamOpenAI(messages, config);
  }
}
