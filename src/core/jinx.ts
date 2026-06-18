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
 * file_context:
 *   - "*.ts"
 *   - "README.md"
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
import path from 'path';
import { promises as fs } from 'fs';

// Track esbuild initialization
let esbuildInitialized = false;
let esbuildInitPromise: Promise<void> | null = null;

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
 * Parsed file entry for file_context
 */
export interface ParsedFile {
  path: string;
  content: string;

/**
 * Step definition
 */
export interface JinxStep {
  name: string;
  engine: 'tsx' | 'node' | string;
  code: string;
}

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
  file_context?: string[];
  inputs?: JinxInput[];
  steps: JinxStep[];
  _source_path?: string;
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
/**
 * Jinx class - loads and executes jinx workflows
 */
export class Jinx {
  jinx_name: string;
  description: string;
  file_context: string[];
  inputs: JinxInput[];
  steps: JinxStep[];
  _source_path?: string;
  parsedFiles: ParsedFile[];

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
    this.parsedFiles = [];
  }

  private _loadFromData(data: JinxDefinition): void {
    if (!data.jinx_name) {
      throw new Error("Missing 'jinx_name' in jinx definition");
    }

    this.jinx_name = data.jinx_name;
    this.description = data.description || '';
    this.file_context = data.file_context || [];
    this.inputs = data.inputs || [];
    this.steps = data.steps || [];
    this._source_path = data._source_path;
    this.parsedFiles = [];
  }

  /**
   * Parse file_context patterns and load file contents
   */
  private async _parseFilePatterns(): Promise<ParsedFile[]> {
    if (!this._source_path || this.file_context.length === 0) {
      return [];
    }

    const basePath = path.dirname(this._source_path);
    const parsedFiles: ParsedFile[] = [];

    for (const pattern of this.file_context) {
      const matchingFiles = await this._findMatchingFiles(basePath, pattern);
      for (const filePath of matchingFiles) {
        const content = await this._loadFileContent(filePath);
        if (content !== null) {
          parsedFiles.push({ path: filePath, content });
        }
      }
    }

    return parsedFiles;
  }

  /**
   * Find files matching a glob-like pattern
   */
  private async _findMatchingFiles(basePath: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    
    try {
      // Handle glob patterns (simplified implementation)
      if (pattern.includes('*')) {
        // Recursively find files matching pattern
        await this._findFilesRecursive(basePath, pattern, results);
      } else {
        // Direct file path
        const fullPath = path.join(basePath, pattern);
        try {
          await fs.access(fullPath);
          results.push(fullPath);
        } catch {
          // File doesn't exist, skip
        }
      }
    } catch (err) {
      console.warn(`Error finding files for pattern '${pattern}':`, err);
    }

    return results;
  }

  /**
   * Recursively find files matching a glob pattern
   */
  private async _findFilesRecursive(
    dir: string,
    pattern: string,
    results: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this._findFilesRecursive(fullPath, pattern, results);
        } else if (entry.isFile()) {
          // Simple glob matching
          if (this._matchGlob(entry.name, pattern) || this._matchGlob(fullPath, pattern)) {
            results.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Directory access error, skip
    }
  }

  /**
   * Simple glob pattern matching
   */
  private _matchGlob(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/\\]*')
      .replace(/\?/g, '.')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*');
    
    const regex = new RegExp(regexPattern.replace(/\\/g, '\\\\'));
    return regex.test(filePath);
  }

  /**
   * Load content of a file
   */
  private async _loadFileContent(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (err) {
      console.warn(`Failed to load file ${filePath}:`, err);
      return null;
    }
  }

  /**
   * Format parsed files as context string
   */
  private _formatParsedFilesContext(files: ParsedFile[]): string {
    if (files.length === 0) {
      return '';
    }

    const sections = files.map(file => {
      return `---\nFile: ${file.path}\n---\n${file.content}`;
    });

    return `\n\n<files_context>\n${sections.join('\n\n')}\n</files_context>`;
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
  /**
   * Execute all steps in the jinx
   */
  async execute(
    inputValues: Record<string, any> = {},
    extraContext: Record<string, any> = {}
  ): Promise<JinxContext> {
    await initJinxEngine();

    // Parse file_context if defined
    if (this.file_context.length > 0 && this.parsedFiles.length === 0) {
      this.parsedFiles = await this._parseFilePatterns();
    }

    // Build initial context with defaults + provided inputs + file_context
    const context: JinxContext = {
      ...this.getDefaultInputs(),
      ...inputValues,
      ...extraContext,
      output: null,
    };

    // Inject file_context into the context
    if (this.parsedFiles.length > 0) {
      context.file_context = this._formatParsedFilesContext(this.parsedFiles);
    }

    // Execute each step
    for (const step of this.steps) {
      await this._executeStep(step, context);
    }

    return context;

  /**
   * Execute a single step and get a React component (for tsx engine)
   */
  async executeForComponent(
    inputValues: Record<string, any> = {},
    extraContext: Record<string, any> = {}
  ): Promise<TsxStepResult | null> {
    await initJinxEngine();

    // Parse file_context if defined
    if (this.file_context.length > 0 && this.parsedFiles.length === 0) {
      this.parsedFiles = await this._parseFilePatterns();
    }

    const context: JinxContext = {
      ...this.getDefaultInputs(),
      ...inputValues,
      ...extraContext,
      output: null,
    };

    // Inject file_context into the context
    if (this.parsedFiles.length > 0) {
      context.file_context = this._formatParsedFilesContext(this.parsedFiles);
    }

    // Find the tsx step (usually named 'render')
    const tsxStep = this.steps.find(s => s.engine === 'tsx');
    if (!tsxStep) {
      return null;
    }

    const Component = await this._executeTsxStep(tsxStep, context);
    return Component ? { Component, props: context } : null;

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
  /**
   * Serialize back to YAML
   */
  toYaml(): string {
    return yaml.dump({
      jinx_name: this.jinx_name,
      description: this.description,
      file_context: this.file_context,
      inputs: this.inputs,
      steps: this.steps,
    });
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
