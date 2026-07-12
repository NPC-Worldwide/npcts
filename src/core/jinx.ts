/**
 * Jinx - TypeScript/TSX workflow engine for npcts
 *
 * Mirrors the Python jinx system in npcpy but handles:
 * - engine: tsx - React components, transpiled with esbuild-wasm
 * - engine: node - Node.js code execution
 *
 * Jinx format (YAML):
 * ```yaml
export interface JinxStep {
  name: string;
  code?: string;
  engine?: string;
  [key: string]: any;
}

export interface JinxPermissions {
  default: 'allow' | 'deny' | 'ask';
  [key: string]: any;
}
import * as esbuild from 'esbuild-wasm';
export class Jinx {
  jinx_name: string;
  description: string;
  inputs: (string | Record<string, any>)[];
  steps: JinxStep[];
  file_context: any[];
  npc?: string;
  permissions: JinxPermissions;
  
  private _rawSteps: (string | JinxStep)[];
  private _sourcePath?: string;
  private parsedFiles: Record<string, string>;

  constructor(data?: any, path?: string) {
    if (path) {
      this._loadFromFile(path);
    } else if (data) {
      this._loadFromData(data);
    } else {
      throw new Error('Either data or path must be provided');
    }
    
    this._rawSteps = [...this.steps];
    this.parsedFiles = {};
    
    if (this.file_context && this.file_context.length > 0) {
      // File context parsing would go here
    }
  }
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
  private _loadFromData(jinxData: any): void {
    if (!jinxData || typeof jinxData !== 'object') {
      throw new Error('Invalid jinx data provided');
    }
    
    if (!jinxData.jinx_name) {
      throw new Error("Missing 'jinx_name' in jinx definition");
    }
    
    this.jinx_name = jinxData.jinx_name;
    this.inputs = jinxData.inputs || [];
    this.description = jinxData.description || '';
    this.npc = jinxData.npc;
    this.steps = jinxData.steps || [];
    this.file_context = jinxData.file_context || [];
    this._sourcePath = jinxData._source_path;
    
    // Initialize permissions with default
    this.permissions = jinxData.permissions || {};
    if (typeof this.permissions !== 'object') {
      this.permissions = {};
    }
    if (!this.permissions.default) {
      this.permissions.default = 'ask';
    }
  }

  /**
   * Persist a permission level to this jinx's metadata.
   * @param level - 'allow', 'deny', or 'ask'
   */
  setPermission(level: 'allow' | 'deny' | 'ask'): void {
    this.permissions.default = level;
    // Note: In a full implementation, this would save to the source file
    // For now, we just update the in-memory permissions
  }

  /**
   * Return this jinx's default permission level.
   * @returns 'allow', 'deny', or 'ask'
   */
  checkPermission(): 'allow' | 'deny' | 'ask' {
    const level = this.permissions?.default || 'ask';
    if (level !== 'allow' && level !== 'deny' && level !== 'ask') {
      return 'ask';
    }
    return level;
  }

  /**
   * Convert this Jinx to a tool definition for LLM use
   */
  toToolDef(): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const input of this.inputs) {
      if (typeof input === 'string') {
        properties[input] = { type: 'string', description: `Parameter: ${input}` };
        required.push(input);
      } else if (typeof input === 'object' && input !== null) {
        const name = Object.keys(input)[0];
        const defaultVal = input[name];
        let desc = `Parameter: ${name}`;
        if (defaultVal !== undefined && defaultVal !== '') {
          desc += ` (default: ${defaultVal})`;
        }
        properties[name] = { type: 'string', description: desc };
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
          required
        }
      }
    };
  }
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
