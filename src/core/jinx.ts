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
 * file_context:
 *   - pattern: "*.sql"
 *     base_path: "./queries"
 *     recursive: true
 * steps:
 *   - name: render
 *     engine: tsx
 *     code: |
 *       export default function({ actions, file_context }) {
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
 * File context pattern definition
 */
export interface FileContextPattern {
  pattern: string;
  base_path?: string;
  recursive?: boolean;
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
  file_context?: FileContextPattern[];
  steps: JinxStep[];
  _source_path?: string;
}

/**
 * Execution context passed to jinx code
 */
export interface JinxContext {
  [key: string]: any;
  output?: any;
  file_context?: string;
  files?: Record<string, string>;
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
  file_context: FileContextPattern[];
  steps: JinxStep[];
  _source_path?: string;
  parsed_files: Record<string, string> = {};

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
    // Parse file patterns if file_context is defined
    if (this.file_context && this.file_context.length > 0) {
      this.parsed_files = this._parseFilePatterns(this.file_context);
    }
  }

  private _loadFromData(data: JinxDefinition): void {
    if (!data.jinx_name) {
      throw new Error("Missing 'jinx_name' in jinx definition");
    }

    this.jinx_name = data.jinx_name;
    this.description = data.description || '';
    this.inputs = data.inputs || [];
    this.file_context = data.file_context || [];
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
   * Parse file patterns and load matching files into a KV cache
   */
  private _parseFilePatterns(patternsConfig: FileContextPattern[]): Record<string, string> {
    if (!patternsConfig || patternsConfig.length === 0) {
      return {};
    }

    const fileCache: Record<string, string> = {};

    for (const patternEntry of patternsConfig) {
      const pattern = patternEntry.pattern;
      const recursive = patternEntry.recursive || false;
      let basePath = patternEntry.base_path || '.';

      if (!pattern) {
        continue;
      }

      // Resolve base path relative to source path if available
      if (this._source_path) {
        const sourceDir = this._source_path.substring(0, this._source_path.lastIndexOf('/') + 1);
        basePath = this._resolvePath(basePath, sourceDir);
      }

      const matchingFiles = this._findMatchingFiles(pattern, basePath, recursive);

      for (const filePath of matchingFiles) {
        const fileContent = this._loadFileContent(filePath);
        if (fileContent !== null) {
          // Store relative path as key
          const relativePath = filePath.replace(basePath, '').replace(/^\//, '');
          fileCache[relativePath] = fileContent;
        }
      }
    }

    return fileCache;
  }

  /**
   * Resolve a potentially relative path against a base directory
   */
  private _resolvePath(targetPath: string, baseDir: string): string {
    if (targetPath.startsWith('/')) {
      return targetPath;
    }
    if (targetPath.startsWith('~/')) {
      // In browser/electron context, ~ might resolve to home
      // For now, treat as relative to base
      return `${baseDir}/${targetPath.slice(2)}`;
    }
    return `${baseDir}/${targetPath}`;
  }

  /**
   * Find files matching the given pattern
   * Note: In browser/Electron, this uses window.api or falls back to limited fs access
   */
  private _findMatchingFiles(pattern: string, basePath: string, recursive: boolean): string[] {
    const matchingFiles: string[] = [];

    // In browser/Electron context, we need to use the exposed API
    if (typeof window !== 'undefined' && (window as any).api?.listFiles) {
      try {
        const files = (window as any).api.listFiles(basePath, recursive);
        for (const file of files) {
          if (this._matchPattern(file, pattern)) {
            matchingFiles.push(file);
          }
        }
      } catch (error) {
        console.warn(`Error listing files in ${basePath}:`, error);
      }
      return matchingFiles;
    }

    // Fallback: return empty array in pure browser context without API
    console.warn(`File pattern matching not available: ${pattern}`);
    return matchingFiles;
  }

  /**
   * Match a filename against a glob-like pattern
   */
  private _matchPattern(filename: string, pattern: string): boolean {
    // Simple glob matching: * matches any characters
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    );
    return regex.test(filename);
  }

  /**
   * Load content from a file
   * Note: In browser/Electron, this uses window.api or returns null
   */
  private _loadFileContent(filePath: string): string | null {
    if (typeof window !== 'undefined' && (window as any).api?.readFile) {
      try {
        return (window as any).api.readFile(filePath);
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Format parsed files into context string for LLM
   */
  private _formatParsedFilesContext(parsedFiles: Record<string, string>): string {
    if (!parsedFiles || Object.keys(parsedFiles).length === 0) {
      return '';
    }

    const contextParts: string[] = ['Additional context from files:'];

    for (const [filePath, content] of Object.entries(parsedFiles)) {
      contextParts.push(`\n--- ${filePath} ---`);
      contextParts.push(content);
      contextParts.push('');
    }

    return contextParts.join('\n');
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

    // Add file context if available
    if (this.parsed_files && Object.keys(this.parsed_files).length > 0) {
      context.files = this.parsed_files;
      context.file_context = this._formatParsedFilesContext(this.parsed_files);
    }

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

    // Add file context if available
    if (this.parsed_files && Object.keys(this.parsed_files).length > 0) {
      context.files = this.parsed_files;
      context.file_context = this._formatParsedFilesContext(this.parsed_files);
    }

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
      file_context: this.file_context,
      steps: this.steps,
    });
  }

  /**
   * Convert to a dictionary representation (for serialization)
   */
  toDict(): Record<string, any> {
    return {
      jinx_name: this.jinx_name,
      description: this.description,
      inputs: this.inputs,
      file_context: this.file_context,
      steps: this.steps,
    };
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