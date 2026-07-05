/**
 * Tools module for automatic schema generation from TypeScript functions.
 * Matches functionality in npcpy/npcpy/tools.py
 */

import { Tool, ToolCall, Message } from "./types";

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Type for tool handler functions.
 */
export type ToolHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

/**
 * Type for functions that can be converted to tools.
 */
export type ToolFunction = (...args: unknown[]) => unknown | Promise<unknown>;

/**
 * Convert TypeScript types to JSON schema types.
 * Mirrors python_type_to_json_schema in npcpy.
 * 
 * @param tsType - TypeScript type name or constructor
 * @returns JSON schema type descriptor
 */
export function tsTypeToJsonSchema(tsType: string | undefined): { type: string; items?: unknown } {
  if (!tsType) return { type: "string" };
  
  const typeMap: Record<string, { type: string; items?: unknown }> = {
    string: { type: "string" },
    number: { type: "number" },
    integer: { type: "integer" },
    boolean: { type: "boolean" },
    array: { type: "array", items: { type: "string" } },
    object: { type: "object" },
    any: { type: "object" },
  };
  
  // Handle array types like string[], number[]
  if (tsType.endsWith("[]")) {
    const itemType = tsType.slice(0, -2);
    return {
      type: "array",
      items: tsTypeToJsonSchema(itemType),
    };
  }
  
  // Handle Promise<T> - unwrap the type
  const promiseMatch = tsType.match(/Promise<(.+)>/);
  if (promiseMatch) {
    return tsTypeToJsonSchema(promiseMatch[1]);
  }
  
  // Handle union types with null/undefined (optional)
  if (tsType.includes("|")) {
    const parts = tsType.split("|").map(t => t.trim());
    const nonNullParts = parts.filter(p => p !== "null" && p !== "undefined");
    if (nonNullParts.length > 0) {
      return tsTypeToJsonSchema(nonNullParts[0]);
    }
  }
  
  return typeMap[tsType] || { type: "string" };
}

/**
 * Extract function information including name, description, and parameters.
 * Mirrors extract_function_info in npcpy.
 * 
 * Note: In TypeScript, we can't introspect function parameters as deeply as Python's inspect.
 * Users should provide metadata explicitly or use TypeScript decorators.
 * 
 * @param func - The function to extract info from
 * @param options - Optional metadata for the function
 * @returns Tool schema object
 */
export interface ExtractFunctionInfoOptions {
  name?: string;
  description?: string;
  parameters?: {
    [paramName: string]: {
      type: string;
      description?: string;
      required?: boolean;
    };
  };
}

export function extractFunctionInfo(
  func: ToolFunction,
  options: ExtractFunctionInfoOptions = {}
): Tool {
  const funcName = options.name || func.name || "anonymous";
  const description = options.description || `Call the ${funcName} function`;
  
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];
  
  if (options.parameters) {
    for (const [paramName, paramInfo] of Object.entries(options.parameters)) {
      properties[paramName] = {
        type: tsTypeToJsonSchema(paramInfo.type).type,
        description: paramInfo.description || `The ${paramName} parameter`,
      };
      
      if (paramInfo.required !== false) {
        required.push(paramName);
      }
    }
  }
  
  return {
    type: "function",
    function: {
      name: funcName,
      description,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

/**
 * Create OpenAI-style tool schema from a list of functions.
 * Mirrors create_tool_schema in npcpy.
 * 
 * @param functions - Array of functions with optional metadata
 * @returns Array of tool schemas
 */
export function createToolSchema(
  functions: Array<{ func: ToolFunction; options?: ExtractFunctionInfoOptions }>
): Tool[] {
  return functions.map(({ func, options }) => extractFunctionInfo(func, options));
}

/**
 * Create a tool map from a list of functions.
 * Mirrors create_tool_map in npcpy.
 * 
 * @param functions - Array of functions with their names
 * @returns Map from function names to functions
 */
export function createToolMap(
  functions: Array<{ name: string; func: ToolFunction }>
): Map<string, ToolFunction> {
  const map = new Map<string, ToolFunction>();
  for (const { name, func } of functions) {
    map.set(name, func);
  }
  return map;
}

/**
 * Automatically create both tool schema and tool map from functions.
 * Mirrors auto_tools in npcpy.
 * 
 * @param functions - Array of functions with metadata
 * @returns Tuple of [toolsSchema, toolMap]
 * 
 * @example
 * ```typescript
 * const getWeather = (location: string) => `Weather in ${location}: sunny`;
 * const calcMath = (expression: string) => eval(expression);
 * 
 * const [schema, map] = autoTools([
 *   { 
 *     func: getWeather, 
 *     options: { 
 *       name: "get_weather",
 *       description: "Get weather for a location",
 *       parameters: { location: { type: "string", required: true } }
 *     } 
 *   },
 * ]);
 * ```
 */
export function autoTools(
  functions: Array<{ 
    func: ToolFunction; 
    options?: ExtractFunctionInfoOptions;
    name?: string;
  }>
): [Tool[], Map<string, ToolFunction>] {
  const schema: Tool[] = [];
  const toolMap = new Map<string, ToolFunction>();
  
  for (const { func, options = {}, name } of functions) {
    const toolInfo = extractFunctionInfo(func, options);
    schema.push(toolInfo);
    
    const funcName = name || options.name || func.name || "anonymous";
    toolMap.set(funcName, func);
  }
  
  return [schema, toolMap];
}

/**
 * Registry for tool handlers.
 */
export class ToolRegistry {
  private handlers: Map<string, ToolHandler> = new Map();

  /**
   * Register a tool handler.
   * 
   * @param name - Tool name
   * @param handler - Function to handle tool execution
   */
  register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * Unregister a tool handler.
   * 
   * @param name - Tool name
   */
  unregister(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * Get a tool handler by name.
   * 
   * @param name - Tool name
   * @returns The handler function or undefined
   */
  get(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * Check if a handler is registered.
   * 
   * @param name - Tool name
   * @returns True if handler exists
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get all registered tool names.
   * 
   * @returns Array of registered tool names
   */
  list(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all registered handlers.
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Global tool registry instance
export const globalToolRegistry = new ToolRegistry();

/**
 * Validates tool calls against available tool schemas.
 * 
 * @param toolCalls - Array of tool calls to validate
 * @param availableTools - Array of available tool schemas
 * @returns ValidationResult indicating if all calls are valid
 */
export function validateToolCalls(
  toolCalls: ToolCall[],
  availableTools: Tool[]
): ValidationResult {
  const errors: string[] = [];

  for (const call of toolCalls) {
    const tool = availableTools.find((t) => {
      // Handle both Tool structure formats
      const toolName = t.function?.name || t.name;
      return toolName === call.name;
    });
    
    if (!tool) {
      errors.push(`Tool '${call.name}' not found in available tools`);
      continue;
    }

    // Get the function definition (handle both formats)
    const funcDef = tool.function || tool;
    const parameters = funcDef.parameters;
    
    // Validate arguments against tool's parameter schema
    if (parameters && parameters.properties) {
      const required = parameters.required || [];
      
      for (const paramName of required) {
        if (!(paramName in call.arguments)) {
          errors.push(
            `Tool '${call.name}': missing required parameter '${paramName}'`
          );
        }
      }

      // Check for extra arguments not in schema
      for (const paramName of Object.keys(call.arguments)) {
        if (!(paramName in parameters.properties)) {
          errors.push(
            `Tool '${call.name}': unknown parameter '${paramName}'`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Executes a single tool call.
 * 
 * @param toolCall - The tool call to execute
 * @param registry - Optional custom registry (defaults to global registry)
 * @returns Promise resolving to ToolResult
 */
export async function runTool(
  toolCall: ToolCall,
  registry: ToolRegistry = globalToolRegistry
): Promise<ToolResult> {
  const handler = registry.get(toolCall.name);
  
  if (!handler) {
    return {
      toolCallId: toolCall.id,
      result: null,
      error: `Tool '${toolCall.name}' is not registered`,
    };
  }

  try {
    const result = await handler(toolCall.arguments);
    return {
      toolCallId: toolCall.id,
      result,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Executes multiple tool calls in parallel.
 * 
 * @param toolCalls - Array of tool calls to execute
 * @param registry - Optional custom registry (defaults to global registry)
 * @returns Promise resolving to array of ToolResults
 */
export async function runToolCalls(
  toolCalls: ToolCall[],
  registry: ToolRegistry = globalToolRegistry
): Promise<ToolResult[]> {
  return Promise.all(toolCalls.map((call) => runTool(call, registry)));
}

/**
 * Convert tool_calls/tool messages to plain text for non-tool-capable models.
 * Mirrors flatten_tool_messages in npcpy.
 * 
 * Keeps the information but in a format that won't break models
 * that don't support the tool calling protocol.
 * 
 * @param messages - Array of messages to flatten
 * @returns Flattened array of messages
 */
export function flattenToolMessages(messages: Message[]): Message[] {
  const flat: Message[] = [];
  
  for (const msg of messages) {
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const parts: string[] = [];
      for (const tc of msg.tool_calls) {
        const name = tc.name || "?";
        const args = JSON.stringify(tc.arguments);
        parts.push(`Called ${name} with: ${args}`);
      }
      flat.push({ role: "assistant", content: parts.join("\n") });
    } else if (msg.role === "tool") {
      const name = msg.name || "tool";
      const content = msg.content || "";
      flat.push({ role: "user", content: `Result of ${name}: ${content}` });
    } else {
      flat.push(msg);
    }
  }
  
  return flat;
}
