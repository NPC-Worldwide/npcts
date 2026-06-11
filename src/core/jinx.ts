/**
 * Jinx - TypeScript/TSX workflow engine for npcts
 *
 * Mirrors the Python jinx system in npcpy but handles:
 * - engine: tsx - React components, transpiled with esbuild-wasm
 * - engine: node - Node.js code execution
 *
 * Jinx format (YAML):
 * ```yaml
 * jinx_name: tile.db_tool
 * description: Opens Database Tool pane
 * inputs:
 *   - label: "DB Tool"
 *   - icon: "Database"
 * steps:
 *   - name: render
 *     engine: tsx
 *     code: |
 *       export default function({ actions }) {
 *         return <button onClick={() => actions.createDBToolPane()}>DB</button>
 *       }
 * ```
 */

import * as esbuild from 'esbuild-wasm';
import yaml from 'js-yaml';
import React from 'react';

// Track esbuild initialization
let esbuildInitialized = false;
let esbuildInitPromise: Promise<void> | null = null;

/**
 * Initialize esbuild-wasm (call once at app startup)
 */
export async function initJinxEngine(): Promise<void> {
  if (esbuildInitialized) return;
  if (esbuildInitPromise) return esbuildInitPromise;

  esbuildInitPromise = esbuild.initialize({
    wasmURL: 'https://unpkg.com/esbuild-wasm@0.24.0/esbuild.wasm',
  }).then(() => {
    esbuildInitialized = true;
  });

  return esbuildInitPromise;
}

/**
 * Input parameter definition
 */
export interface JinxInput {
  [key: string]: any;
}

/**
 * Step definition
 */
export interface JinxStep {
  name: string;
  engine: 'tsx' | 'node' | string;
  code: string;
}

/**
 * Jinx definition (parsed from YAML)
 */
export interface JinxDefinition {
  jinx_name: string;
  description?: string;
  inputs?: JinxInput[];
  steps: JinxStep[];
  _source_path?: string;
}

/**
 * Execution context passed to jinx code
 */
export interface JinxContext {
  [key: string]: any;
  output?: any;
}

/**
 * Result of executing a TSX step (returns a React component)
 */
export interface TsxStepResult {
  Component: React.ComponentType<any>;
  props?: Record<string, any>;
}

/**
 * Jinx class - loads and executes jinx workflows
 */
export class Jinx {
  jinx_name: string;
  description: string;
  inputs: JinxInput[];
  steps: JinxStep[];
  _source_path?: string;

  constructor(data: JinxDefinition | string, sourcePath?: string) {
    if (typeof data === 'string') {
      // Parse YAML string
      const parsed = yaml.load(data) as JinxDefinition;
      this._loadFromData(parsed);
    } else {
      this._loadFromData(data);
    }
    if (sourcePath) {
      this._source_path = sourcePath;
    }
  }

  private _loadFromData(data: JinxDefinition): void {
    if (!data.jinx_name) {
      throw new Error("Missing 'jinx_name' in jinx definition");
    }

    this.jinx_name = data.jinx_name;
    this.description = data.description || '';
    this.inputs = data.inputs || [];
    this.steps = data.steps || [];
    this._source_path = data._source_path;
  }

  /**
   * Get default input values from the inputs definition
   */
  getDefaultInputs(): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const input of this.inputs) {
      if (typeof input === 'object') {
        for (const [key, value] of Object.entries(input)) {
          defaults[key] = value;
        }
      }
    }
    return defaults;
  }

  /**
   * Execute all steps in the jinx
   */
  async execute(
    inputValues: Record<string, any> = {},
    extraContext: Record<string, any> = {}
  ): Promise<JinxContext> {
    await initJinxEngine();

    // Build initial context with defaults + provided inputs
    const context: JinxContext = {
      ...this.getDefaultInputs(),
      ...inputValues,
      ...extraContext,
      output: null,
    };

    // Execute each step
    for (const step of this.steps) {
      await this._executeStep(step, context);
    }

    return context;
  }

  /**
   * Execute a single step and get a React component (for tsx engine)
   */
  async executeForComponent(
    inputValues: Record<string, any> = {},
    extraContext: Record<string, any> = {}
  ): Promise<TsxStepResult | null> {
    await initJinxEngine();

    const context: JinxContext = {
      ...this.getDefaultInputs(),
      ...inputValues,
      ...extraContext,
      output: null,
    };

    // Find the tsx step (usually named 'render')
    const tsxStep = this.steps.find(s => s.engine === 'tsx');
    if (!tsxStep) {
      return null;
    }

    const Component = await this._executeTsxStep(tsxStep, context);
    return Component ? { Component, props: context } : null;
  }

  private async _executeStep(step: JinxStep, context: JinxContext): Promise<void> {
    const { engine, code, name } = step;

    try {
      switch (engine) {
        case 'tsx':
          const Component = await this._executeTsxStep(step, context);
          if (Component) {
            context[name] = Component;
            context.output = Component;
          }
          break;

        case 'node':
          await this._executeNodeStep(step, context);
          break;

        default:
          console.warn(`Unknown engine '${engine}' in step '${name}'`);
      }
    } catch (err) {
      console.error(`Error executing step '${name}':`, err);
      context.output = `Error in step '${name}': ${err}`;
    }
  }

  /**
   * Execute a TSX step - transpile and return the component
   */
  private async _executeTsxStep(
    step: JinxStep,
    context: JinxContext
  ): Promise<React.ComponentType<any> | null> {
    const { code, name } = step;

    try {
      // Transpile TSX to JS
      const result = await esbuild.transform(code, {
        loader: 'tsx',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2020',
      });

      const transpiledCode = result.code;

      // Create a module-like execution environment
      // We'll wrap the code to capture the default export
      const wrappedCode = `
        const exports = {};
        const module = { exports };
        ${transpiledCode}
        return module.exports.default || exports.default;
      `;

      // Execute with React and context available
      const execFn = new Function('React', 'context', wrappedCode);
      const Component = execFn(React, context);

      return Component;
    } catch (err) {
      console.error(`TSX transpile error in step '${name}':`, err);
      return null;
    }
  }

  /**
   * Execute a Node step - runs JS code with context available
   */
  private async _executeNodeStep(step: JinxStep, context: JinxContext): Promise<void> {
    const { code, name } = step;

    try {
      // Wrap code to have context available and handle async
      const wrappedCode = `
        return (async function(context) {
          ${code}
        })(context);
      `;

      const execFn = new Function('context', wrappedCode);
      await execFn(context);
    } catch (err) {
      console.error(`Node execution error in step '${name}':`, err);
      context.output = `Error: ${err}`;
    }
  }

  /**
   * Convert to a tool definition (for LLM tool use)
   */
  toToolDef(): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const input of this.inputs) {
      if (typeof input === 'string') {
        properties[input] = { type: 'string', description: `Parameter: ${input}` };
        required.push(input);
      } else if (typeof input === 'object') {
        const [inputName, defaultValue] = Object.entries(input)[0];
        properties[inputName] = {
          type: 'string',
          description: `Parameter: ${inputName}${defaultValue !== '' ? ` (default: ${defaultValue})` : ''}`,
        };
      }
    }

    return {
      type: 'function',
      function: {
        name: this.jinx_name,
        description: this.description || `Jinx: ${this.jinx_name}`,
        parameters: {
          type: 'object',
          properties,
          required,
        },
      },
    };
  /**
   * Convert to a tool definition (for LLM tool use)
   */
  toToolDef(): Record<string, any> {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const input of this.inputs) {
      if (typeof input === 'string') {
        properties[input] = { type: 'string', description: `Parameter: ${input}` };
        required.push(input);
      } else if (typeof input === 'object') {
        const [inputName, defaultValue] = Object.entries(input)[0];
        properties[inputName] = {
          type: 'string',
          description: `Parameter: ${inputName}${defaultValue !== '' ? ` (default: ${defaultValue})` : ''}`,
        };
      }
    }

    return {
      type: 'function',
      function: {
        name: this.jinx_name,
        description: this.description || `Jinx: ${this.jinx_name}`,
        parameters: {
          type: 'object',
          properties,
          required,
        },
      },
    };
  }

  /**
   * Create a Jinx from an MCP tool definition.
   * Mirrors npcpy's Jinx.from_mcp() class method.
   *
   * @param mcpTool - MCP tool object with name, description, and inputSchema
   * @returns A new Jinx instance configured to call the MCP tool
   */
  static fromMcp(mcpTool: {
    name: string;
    description?: string;
    inputSchema?: {
      type?: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  }): Jinx {
    const inputs: JinxInput[] = [];
    const paramNames: string[] = [];

    // Extract parameters from MCP inputSchema
    if (mcpTool.inputSchema?.properties) {
      for (const [paramName, paramDef] of Object.entries(mcpTool.inputSchema.properties)) {
        paramNames.push(paramName);
        const paramType = (paramDef as any).type || 'string';
        const paramDesc = (paramDef as any).description || '';

        // Build input definition with type info in description
        const inputDef: JinxInput = {};
        let description = paramDesc;
        if (paramType && paramType !== 'string') {
          description = `[${paramType}] ${paramDesc}`;
        }
        inputDef[paramName] = description;
        inputs.push(inputDef);
      }
    }

    // Build the step code that calls the MCP tool
    const argsMapping = paramNames.map(name => `      ${name}: context.${name}`).join(',\n');

    const stepCode = `
// Call MCP tool: ${mcpTool.name}
const result = await mcpCall('${mcpTool.name}', {
${argsMapping}
});
context.output = result;
`;

    const jinxData: JinxDefinition = {
      jinx_name: mcpTool.name,
      description: mcpTool.description || `MCP Tool: ${mcpTool.name}`,
      inputs,
      steps: [
        {
          name: 'mcp_call',
          engine: 'node',
          code: stepCode,
        },
      ],
    };

    return new Jinx(jinxData);
  }

  /**
   * Create a Jinx from a simple function signature.
   * Utility method for wrapping functions as jinxes.
   */
  static fromFunction(
    name: string,
    fn: (...args: any[]) => any,
    options?: {
      description?: string;
      inputNames?: string[];
    }
  ): Jinx {
    const funcStr = fn.toString();
    const paramMatch = funcStr.match(/\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [];

    const inputs: JinxInput[] = options?.inputNames || params.map((p, i) => ({ [p]: '' }));

    const argsMapping = params.map((p, i) => `      args[${i}]`).join(',\n');

    const stepCode = `
const fn = ${funcStr};
const result = fn(${argsMapping});
context.output = result;
`;

    const jinxData: JinxDefinition = {
      jinx_name: name,
      description: options?.description || `Function: ${name}`,
      inputs,
      steps: [
        {
          name: 'function_call',
          engine: 'node',
          code: stepCode,
        },
      ],
    };

    return new Jinx(jinxData);
  }

  /**
   * Serialize back to YAML
   */
  toYaml(): string {
    return yaml.dump({
      jinx_name: this.jinx_name,
      description: this.description,
      inputs: this.inputs,
      steps: this.steps,
    });
  }
}

/**
 * Load a jinx from a YAML string
 */
export function loadJinx(yamlContent: string, sourcePath?: string): Jinx {
  return new Jinx(yamlContent, sourcePath);
}

/**
 * Load multiple jinxes and return a lookup dict
 */
export function loadJinxes(
  jinxYamls: Array<{ content: string; path?: string }>
): Map<string, Jinx> {
  const jinxMap = new Map<string, Jinx>();

  for (const { content, path } of jinxYamls) {
    try {
      const jinx = loadJinx(content, path);
      jinxMap.set(jinx.jinx_name, jinx);
    } catch (err) {
      console.error(`Failed to load jinx from ${path}:`, err);
    }
  }

  return jinxMap;
}
