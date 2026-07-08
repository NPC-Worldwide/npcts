/**
 * npc_array.ts - NumPy-like interface for language models and ML at scale
 *
 * This module provides NPCArray, a vectorized abstraction for model populations
 * that enables ensemble interactions, evolutionary optimization, and parallel
 * inference across heterogeneous model types (LLMs, sklearn, torch, etc.)
 *
 * Core concepts:
 * - NPCArray wraps a collection of models (LLMs, ML models, or NPCs)
 * - Operations are lazy - they build a computation graph
 * - .collect() materializes results with automatic parallelization (like Spark)
 * - Same interface for single items (treated as 1D array of length 1)
 *
 * Example:
 *     const models = NPCArray.fromLLMs(['gpt-4', 'claude-3', 'llama3']);
 *     const result = models.infer(prompts).filter(r => r.length > 100).vote();
 *     await result.collect();
 */

import { NPCConfig } from './types';

/** Operation types for the computation graph */
export enum OpType {
  SOURCE = 'source',
  INFER = 'infer',
  PREDICT = 'predict',
  FIT = 'fit',
  FORWARD = 'forward',
  MAP = 'map',
  FILTER = 'filter',
  REDUCE = 'reduce',
  CHAIN = 'chain',
  EVOLVE = 'evolve',
  JINX = 'jinx'
}

/** A node in the lazy computation graph */
export interface GraphNode {
  opType: OpType;
  params: Record<string, any>;
  parents: GraphNode[];
  result?: any;
  shape?: number[];
}

/** Model type supported by NPCArray */
export type ModelType = 'llm' | 'sklearn' | 'torch' | 'npc' | 'custom';

/** Specification for a model in the array */
export interface ModelSpec {
  modelType: ModelType;
  modelRef: any;
  provider?: string;
  config: Record<string, any>;
}

/** Container for vectorized model outputs with shape information */
export interface ResponseTensor {
  data: any[][];
  modelSpecs: ModelSpec[];
  prompts?: string[];
  metadata: Record<string, any>;
  shape: number[];
}

/** Create a graph node */
function createGraphNode(
  opType: OpType,
  params: Record<string, any> = {},
  parents: GraphNode[] = [],
  shape?: number[]
): GraphNode {
  return {
    opType,
    params,
    parents,
    shape
  };
}

/**
 * Lazy result from model operations.
 *
 * Builds computation graph without executing until .collect() is called.
 * Supports chaining operations like map, filter, reduce.
 */
export class LazyResult {
  private specs: ModelSpec[];
  private graph: GraphNode;
  private prompts?: string[];
  private computed: boolean = false;
  private result?: ResponseTensor;

  constructor(
    specs: ModelSpec[],
    graph: GraphNode,
    prompts?: string[]
  ) {
    this.specs = specs;
    this.graph = graph;
    this.prompts = prompts;
  }

  /** Expected shape of result */
  get shape(): number[] | undefined {
    return this.graph.shape;
  }

  /**
   * Apply function to each response.
   */
  map(fn: (item: any) => any): LazyResult {
    const newNode = createGraphNode(
      OpType.MAP,
      { fn },
      [this.graph],
      this.graph.shape
    );
    return new LazyResult(this.specs, newNode, this.prompts);
  }

  /**
   * Filter responses by predicate.
   */
  filter(predicate: (item: any) => boolean): LazyResult {
    const newNode = createGraphNode(
      OpType.FILTER,
      { predicate },
      [this.graph],
      undefined // Shape unknown until runtime
    );
    return new LazyResult(this.specs, newNode, this.prompts);
  }

  /**
   * Reduce responses along an axis.
   */
  reduce(
    method: string | ((items: any[]) => any) = 'vote',
    axis: number = 0,
    extraParams: Record<string, any> = {}
  ): LazyResult {
    const newNode = createGraphNode(
      OpType.REDUCE,
      { method, axis, ...extraParams },
      [this.graph],
      this.computeReducedShape(axis)
    );
    return new LazyResult(this.specs, newNode, this.prompts);
  }

  /**
   * Chain outputs through a synthesis function.
   */
  chain(
    fn: (items: any[]) => string,
    nRounds: number = 1
  ): LazyResult {
    const newNode = createGraphNode(
      OpType.CHAIN,
      { fn, nRounds },
      [this.graph],
      this.graph.shape
    );
    return new LazyResult(this.specs, newNode, this.prompts);
  }

  /** Shorthand for reduce('vote', axis) */
  vote(axis: number = 0): LazyResult {
    return this.reduce('vote', axis);
  }

  /** Shorthand for reduce('consensus', axis) */
  consensus(axis: number = 0, model?: string): LazyResult {
    return this.reduce('consensus', axis, { model });
  }

  /**
   * Print explanation of the computation graph.
   */
  explain(): string {
    const lines: string[] = ['Computation Graph:'];
    this.explainNode(this.graph, lines, 0);
    const explanation = lines.join('\n');
    console.log(explanation);
    return explanation;
  }

  private explainNode(node: GraphNode, lines: string[], depth: number): void {
    const indent = '  '.repeat(depth);
    const paramsStr = Object.entries(node.params)
      .filter(([k]) => k !== 'fn' && k !== 'predicate')
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    lines.push(`${indent}└─ ${node.opType}: shape=${JSON.stringify(node.shape)}, params=${JSON.stringify(paramsStr)}`);
    for (const parent of node.parents) {
      this.explainNode(parent, lines, depth + 1);
    }
  }

  /**
   * Execute the computation graph and return results.
   */
  async collect(options: {
    parallel?: boolean;
    maxWorkers?: number;
    progress?: boolean;
  } = {}): Promise<ResponseTensor> {
    const { parallel = true, maxWorkers } = options;

    if (this.computed && this.result !== undefined) {
      return this.result;
    }

    const executor = new GraphExecutor({
      parallel,
      maxWorkers: maxWorkers ?? this.specs.length,
      progress: options.progress ?? false
    });

    this.result = await executor.execute(this.graph, this.specs, this.prompts);
    this.computed = true;

    return this.result;
  }

  /** Collect and return as array */
  async toArray(): Promise<any[][]> {
    const tensor = await this.collect();
    return tensor.data;
  }

  compute = this.collect.bind(this);

  private computeReducedShape(axis: number): number[] | undefined {
    if (this.graph.shape === undefined) return undefined;
    const shape = [...this.graph.shape];
    if (axis < shape.length) {
      shape.splice(axis, 1);
    }
    return shape.length > 0 ? shape : [1];
  }
}

/**
 * NumPy-like array for model populations.
 *
 * Supports:
 * - LLMs (via provider/model name)
 * - sklearn models (fitted or specs)
 * - PyTorch models
 * - NPCs (from npcts)
 * - Custom model wrappers
 *
 * All operations are lazy until .collect() is called.
 */
export class NPCArray {
  private specs: ModelSpec[];
  private graph: GraphNode;

  constructor(
    specs: ModelSpec[],
    graph?: GraphNode
  ) {
    this.specs = specs;
    this.graph = graph ?? createGraphNode(
      OpType.SOURCE,
      { specs },
      [],
      [specs.length]
    );
  }

  /**
   * Create NPCArray from LLM model names.
   */
  static fromLLMs(
    models: string | string[],
    options: {
      providers?: string | string[];
      config?: Record<string, any>;
    } = {}
  ): NPCArray {
    const { providers, config = {} } = options;
    const modelList = Array.isArray(models) ? models : [models];

    let providerList: (string | undefined)[];
    if (providers === undefined) {
      providerList = new Array(modelList.length).fill(undefined);
    } else if (typeof providers === 'string') {
      providerList = new Array(modelList.length).fill(providers);
    } else {
      providerList = providers.length === 1
        ? new Array(modelList.length).fill(providers[0])
        : providers;
    }

    const specs: ModelSpec[] = modelList.map((model, i) => ({
      modelType: 'llm',
      modelRef: model,
      provider: providerList[i],
      config: { ...config }
    }));

    return new NPCArray(specs);
  }

  /**
   * Create NPCArray from NPC objects.
   */
  static fromNPCs(npcs: any | any[]): NPCArray {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];

    const specs: ModelSpec[] = npcList.map(npc => ({
      modelType: 'npc',
      modelRef: npc,
      provider: npc?.provider,
      config: { model: npc?.model }
    }));

    return new NPCArray(specs);
  }

  /**
   * Create NPCArray from sklearn models.
   */
  static fromSklearn(
    models: any | any[],
    options: { fitted?: boolean } = {}
  ): NPCArray {
    const { fitted = true } = options;
    const modelList = Array.isArray(models) ? models : [models];

    const specs: ModelSpec[] = modelList.map(model => ({
      modelType: 'sklearn',
      modelRef: model,
      config: { fitted }
    }));

    return new NPCArray(specs);
  }

  /**
   * Create NPCArray from PyTorch models.
   */
  static fromTorch(
    models: any | any[],
    options: { device?: string } = {}
  ): NPCArray {
    const { device = 'cpu' } = options;
    const modelList = Array.isArray(models) ? models : [models];

    const specs: ModelSpec[] = modelList.map(model => ({
      modelType: 'torch',
      modelRef: model,
      config: { device }
    }));

    return new NPCArray(specs);
  }

  /**
   * Create NPCArray from model specification objects.
   */
  static fromSpecs(
    specs: Array<{
      model: any;
      type?: ModelType;
      provider?: string;
      [key: string]: any;
    }>
  ): NPCArray {
    const modelSpecs: ModelSpec[] = specs.map(spec => {
      const { type = 'llm', model, provider, ...config } = spec;
      return {
        modelType: type,
        modelRef: model,
        provider,
        config
      };
    });

    return new NPCArray(modelSpecs);
  }

  /**
   * Create NPCArray from a matrix of model configurations.
   *
   * This is particularly useful for defining model arrays in Jinx templates
   * where you want explicit control over each model configuration.
   */
  static fromMatrix(
    matrix: Array<{
      model: any;
      type?: ModelType;
      provider?: string;
      [key: string]: any;
    }>
  ): NPCArray {
    const specs: ModelSpec[] = matrix.map(config => {
      const { type = 'llm', model, provider, ...extraConfig } = config;
      return {
        modelType: type,
        modelRef: model,
        provider,
        config: extraConfig
      };
    });

    return new NPCArray(specs);
  }

  /** Shape of the model array */
  get shape(): number[] {
    return [this.specs.length];
  }

  /** Model specifications */
  get specsList(): ModelSpec[] {
    return this.specs;
  }

  /** Number of models in array */
  get length(): number {
    return this.specs.length;
  }

  toString(): string {
    const types = this.specs.map(s => s.modelType);
    return `NPCArray(shape=[${this.shape}], types=[${types.join(', ')}])`;
  }

  /**
   * Queue inference across all models for given prompts.
   */
  infer(
    prompts: string | string[],
    options: Record<string, any> = {}
  ): LazyResult {
    const promptList = Array.isArray(prompts) ? prompts : [prompts];

    const newNode = createGraphNode(
      OpType.INFER,
      { prompts: promptList, ...options },
      [this.graph],
      [this.specs.length, promptList.length]
    );

    return new LazyResult(this.specs, newNode, promptList);
  }

  /**
   * Queue prediction for sklearn/ML models.
   */
  predict(
    X: any[],
    options: Record<string, any> = {}
  ): LazyResult {
    const newNode = createGraphNode(
      OpType.PREDICT,
      { X, ...options },
      [this.graph],
      [this.specs.length, X.length]
    );

    return new LazyResult(this.specs, newNode);
  }

  /**
   * Queue forward pass for PyTorch models.
   */
  forward(
    inputs: any,
    options: Record<string, any> = {}
  ): LazyResult {
    const newNode = createGraphNode(
      OpType.FORWARD,
      { inputs, ...options },
      [this.graph],
      [this.specs.length]
    );

    return new LazyResult(this.specs, newNode);
  }

  /**
   * Queue fitting for all models.
   */
  fit(
    X: any,
    y?: any,
    options: Record<string, any> = {}
  ): NPCArray {
    const newNode = createGraphNode(
      OpType.FIT,
      { X, y, ...options },
      [this.graph],
      this.shape
    );

    return new NPCArray(this.specs, newNode);
  }

  /**
   * Evolve the model population based on fitness scores.
   */
  evolve(
    fitnessScores: number[],
    options: {
      mutateFn?: (spec: ModelSpec) => ModelSpec;
      crossoverFn?: (a: ModelSpec, b: ModelSpec) => ModelSpec;
      selection?: 'tournament' | 'roulette' | 'rank';
      eliteRatio?: number;
    } = {}
  ): NPCArray {
    const { selection = 'tournament', eliteRatio = 0.1, mutateFn, crossoverFn } = options;

    const newNode = createGraphNode(
      OpType.EVOLVE,
      {
        fitnessScores,
        mutateFn,
        crossoverFn,
        selection,
        eliteRatio
      },
      [this.graph],
      this.shape
    );

    return new NPCArray(this.specs, newNode);
  }

  /**
   * Execute a Jinx workflow across all models in the array.
   */
  jinx(
    jinxName: string,
    inputs?: Record<string, any>,
    options: Record<string, any> = {}
  ): LazyResult {
    const newNode = createGraphNode(
      OpType.JINX,
      {
        jinxName,
        inputs: inputs ?? {},
        ...options
      },
      [this.graph],
      [this.specs.length]
    );

    return new LazyResult(this.specs, newNode);
  }
}

/**
 * Graph executor that handles:
 * - Topological ordering
 * - Parallel execution of independent nodes
 * - Caching of intermediate results
 */
class GraphExecutor {
  private parallel: boolean;
  private maxWorkers: number;
  private progress: boolean;
  private cache: Map<number, any> = new Map();

  constructor(options: {
    parallel: boolean;
    maxWorkers: number;
    progress: boolean;
  }) {
    this.parallel = options.parallel;
    this.maxWorkers = options.maxWorkers;
    this.progress = options.progress;
  }

  async execute(
    root: GraphNode,
    specs: ModelSpec[],
    prompts?: string[]
  ): Promise<ResponseTensor> {
    const ordered = this.topologicalSort(root);

    for (const node of ordered) {
      const nodeId = this.getNodeId(node);
      if (this.cache.has(nodeId)) {
        continue;
      }

      const parentResults = node.parents.map(p =>
        this.cache.get(this.getNodeId(p))
      );

      const result = await this.executeNode(node, specs, prompts, parentResults);
      this.cache.set(nodeId, result);
    }

    return this.cache.get(this.getNodeId(root))!;
  }

  private getNodeId(node: GraphNode): number {
    // Simple hash based on object reference
    return node as any;
  }

  private topologicalSort(root: GraphNode): GraphNode[] {
    const visited = new Set<number>();
    const ordered: GraphNode[] = [];

    const visit = (node: GraphNode) => {
      const id = this.getNodeId(node);
      if (visited.has(id)) return;
      visited.add(id);
      for (const parent of node.parents) {
        visit(parent);
      }
      ordered.push(node);
    };

    visit(root);
    return ordered;
  }

  private async executeNode(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined,
    parentResults: any[]
  ): Promise<ResponseTensor> {
    const handlers: Record<OpType, (
      node: GraphNode,
      specs: ModelSpec[],
      prompts: string[] | undefined,
      parents: any[]
    ) => Promise<ResponseTensor>> = {
      [OpType.SOURCE]: this.execSource.bind(this),
      [OpType.INFER]: this.execInfer.bind(this),
      [OpType.PREDICT]: this.execPredict.bind(this),
      [OpType.FORWARD]: this.execForward.bind(this),
      [OpType.FIT]: this.execFit.bind(this),
      [OpType.MAP]: this.execMap.bind(this),
      [OpType.FILTER]: this.execFilter.bind(this),
      [OpType.REDUCE]: this.execReduce.bind(this),
      [OpType.CHAIN]: this.execChain.bind(this),
      [OpType.EVOLVE]: this.execEvolve.bind(this),
      [OpType.JINX]: this.execJinx.bind(this)
    };

    const handler = handlers[node.opType];
    if (!handler) {
      throw new Error(`Unknown operation type: ${node.opType}`);
    }

    return handler(node, specs, prompts, parentResults);
  }

  private async execSource(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined
  ): Promise<ResponseTensor> {
    return {
      data: specs.map(s => [s.modelRef]),
      modelSpecs: specs,
      prompts,
      metadata: {},
      shape: [specs.length, 1]
    };
  }

  private async execInfer(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined
  ): Promise<ResponseTensor> {
    const promptsList = node.params.prompts ?? prompts ?? [];
    const extraKwargs = Object.fromEntries(
      Object.entries(node.params).filter(([k]) => k !== 'prompts')
    );

    const nModels = specs.length;
    const nPrompts = promptsList.length;

    // Create task grid
    const tasks: Array<[number, number, ModelSpec, string]> = [];
    for (let i = 0; i < nModels; i++) {
      for (let j = 0; j < nPrompts; j++) {
        tasks.push([i, j, specs[i], promptsList[j]]);
      }
    }

    const results: any[][] = Array(nModels).fill(null).map(() => Array(nPrompts).fill(null));

    if (this.parallel && tasks.length > 1) {
      // Execute in parallel with Promise.all and concurrency limit
      const executing: Promise<void>[] = [];
      let index = 0;

      for (const [i, j, spec, prompt] of tasks) {
        const promise = this.inferSingle(spec, prompt, extraKwargs)
          .then(result => { results[i][j] = result; })
          .catch(err => { results[i][j] = `Error: ${err.message}`; });

        executing.push(promise);

        if (executing.length >= this.maxWorkers) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(p => p === promise), 1);
        }
        index++;
      }

      await Promise.all(executing);
    } else {
      for (const [i, j, spec, prompt] of tasks) {
        try {
          results[i][j] = await this.inferSingle(spec, prompt, extraKwargs);
        } catch (err: any) {
          results[i][j] = `Error: ${err.message}`;
        }
      }
    }

    return {
      data: results,
      modelSpecs: specs,
      prompts: promptsList,
      metadata: { operation: 'infer', ...extraKwargs },
      shape: [nModels, nPrompts]
    };
  }

  private async inferSingle(
    spec: ModelSpec,
    prompt: string,
    kwargs: Record<string, any>
  ): Promise<string> {
    // Placeholder implementation - actual LLM call would be here
    // This would integrate with the existing npcts LLM infrastructure
    if (spec.modelType === 'llm') {
      return `[${spec.modelRef}] Response to: "${prompt.substring(0, 30)}..."`;
    } else if (spec.modelType === 'npc') {
      return `[NPC] Response to: "${prompt.substring(0, 30)}..."`;
    } else {
      throw new Error(`Cannot infer with model type: ${spec.modelType}`);
    }
  }

  private async execPredict(
    node: GraphNode,
    specs: ModelSpec[]
  ): Promise<ResponseTensor> {
    const X = node.params.X;
    const results: any[] = [];

    for (const spec of specs) {
      if (spec.modelType === 'sklearn') {
        const model = spec.modelRef;
        if (typeof model?.predict === 'function') {
          results.push([model.predict(X)]);
        } else {
          results.push([null]);
        }
      } else {
        results.push([null]);
      }
    }

    return {
      data: results,
      modelSpecs: specs,
      metadata: { operation: 'predict' },
      shape: [specs.length, X.length]
    };
  }

  private async execForward(
    node: GraphNode,
    specs: ModelSpec[]
  ): Promise<ResponseTensor> {
    const inputs = node.params.inputs;
    const results: any[] = [];

    for (const spec of specs) {
      if (spec.modelType === 'torch') {
        // Placeholder - actual torch integration would be here
        results.push([`[torch] forward pass`);
      } else {
        results.push([null]);
      }
    }

    return {
      data: results,
      modelSpecs: specs,
      metadata: { operation: 'forward' },
      shape: [specs.length, 1]
    };
  }

  private async execFit(
    node: GraphNode,
    specs: ModelSpec[]
  ): Promise<ResponseTensor> {
    const X = node.params.X;
    const y = node.params.y;
    const fittedSpecs: ModelSpec[] = [];

    for (const spec of specs) {
      if (spec.modelType === 'sklearn') {
        const model = structuredClone(spec.modelRef);
        if (typeof model?.fit === 'function') {
          model.fit(X, y);
        }
        fittedSpecs.push({
          ...spec,
          config: { ...spec.config, fitted: true }
        });
      } else {
        fittedSpecs.push(spec);
      }
    }

    return {
      data: fittedSpecs.map(s => [s.modelRef]),
      modelSpecs: fittedSpecs,
      metadata: { operation: 'fit' },
      shape: [specs.length, 1]
    };
  }

  private async execMap(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined,
    parents: any[]
  ): Promise<ResponseTensor> {
    const fn = node.params.fn;
    const parentResult = parents[0];

    if (!parentResult) {
      throw new Error('Map requires parent result');
    }

    const mapped = parentResult.data.map((row: any[]) =>
      row.map((item: any) => fn(item))
    );

    return {
      data: mapped,
      modelSpecs: parentResult.modelSpecs,
      prompts: parentResult.prompts,
      metadata: { ...parentResult.metadata, mapped: true },
      shape: parentResult.shape
    };
  }

  private async execFilter(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined,
    parents: any[]
  ): Promise<ResponseTensor> {
    const predicate = node.params.predicate;
    const parentResult = parents[0];

    if (!parentResult) {
      throw new Error('Filter requires parent result');
    }

    // Flatten, filter, then reshape
    const flatData = parentResult.data.flat();
    const flatSpecs = parentResult.modelSpecs;

    const filteredIndices: number[] = [];
    for (let i = 0; i < flatData.length; i++) {
      if (predicate(flatData[i])) {
        filteredIndices.push(i);
      }
    }

    const filteredData = filteredIndices.map(i => [flatData[i]]);
    const filteredSpecs = filteredIndices.map(i => flatSpecs[i % flatSpecs.length]);

    return {
      data: filteredData,
      modelSpecs: filteredSpecs,
      prompts: parentResult.prompts,
      metadata: { ...parentResult.metadata, filtered: true },
      shape: [filteredData.length, 1]
    };
  }

  private async execReduce(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined,
    parents: any[]
  ): Promise<ResponseTensor> {
    const method = node.params.method ?? 'vote';
    const axis = node.params.axis ?? 0;
    const parentResult = parents[0];

    if (!parentResult) {
      throw new Error('Reduce requires parent result');
    }

    const data = parentResult.data;
    let reduced: any[];

    if (method === 'vote') {
      reduced = this.reduceVote(data, axis);
    } else if (method === 'concat') {
      reduced = this.reduceConcat(data, axis);
    } else if (typeof method === 'function') {
      reduced = this.reduceCustom(data, axis, method);
    } else {
      throw new Error(`Unknown reduce method: ${method}`);
    }

    return {
      data: reduced.map(r => [r]),
      modelSpecs: axis === 0 ? [specs[0]] : specs,
      prompts,
      metadata: { ...parentResult.metadata, reduced: method },
      shape: axis === 0 ? [1, data[0].length] : [data.length, 1]
    };
  }

  private reduceVote(data: any[][], axis: number): any[] {
    if (axis === 0) {
      // Vote across models (reduce rows)
      const result: any[] = [];
      for (let col = 0; col < (data[0]?.length ?? 0); col++) {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
        const counts = new Map<string, number>();
        for (const v of values) {
          const key = String(v);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        let maxCount = 0;
        let winner: any = null;
        for (const [key, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            winner = values.find(v => String(v) === key);
          }
        }
        result.push(winner);
      }
      return result;
    } else {
      // Vote across prompts (reduce columns)
      return data.map(row => {
        const values = row.filter(v => v !== null && v !== undefined);
        const counts = new Map<string, number>();
        for (const v of values) {
          const key = String(v);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        let maxCount = 0;
        let winner: any = null;
        for (const [key, count] of counts) {
          if (count > maxCount) {
            maxCount = count;
            winner = values.find(v => String(v) === key);
          }
        }
        return winner;
      });
    }
  }

  private reduceConcat(data: any[][], axis: number): any[] {
    if (axis === 0) {
      const result: any[] = [];
      for (let col = 0; col < (data[0]?.length ?? 0); col++) {
        const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined);
        result.push(values.join('\n---\n'));
      }
      return result;
    } else {
      return data.map(row => row.filter(v => v !== null && v !== undefined).join('\n---\n'));
    }
  }

  private reduceCustom(
    data: any[][],
    axis: number,
    fn: (items: any[]) => any
  ): any[] {
    if (axis === 0) {
      const result: any[] = [];
      for (let col = 0; col < (data[0]?.length ?? 0); col++) {
        const values = data.map(row => row[col]);
        result.push(fn(values));
      }
      return result;
    } else {
      return data.map(row => fn(row));
    }
  }

  private async execChain(
    node: GraphNode,
    specs: ModelSpec[],
    prompts: string[] | undefined,
    parents: any[]
  ): Promise<ResponseTensor> {
    const fn = node.params.fn;
    const nRounds = node.params.nRounds ?? 1;
    const parentResult = parents[0];

    if (!parentResult) {
      throw new Error('Chain requires parent result');
    }

    let current = parentResult.data;

    // Simplified chain - actual implementation would need re-inference
    for (let round = 0; round < nRounds; round++) {
      const flatList = current.flat();
      const newPrompt = fn(flatList);
      // In real implementation, this would trigger new inferences
      current = current.map((row: any[]) =>
        row.map(() => `[chained] ${newPrompt.substring(0, 30)}...`)
      );
    }

    return {
      data: current,
      modelSpecs: specs,
      prompts,
      metadata: { ...parentResult.metadata, chained: nRounds },
      shape: parentResult.shape
    };
  }

  private async execEvolve(
    node: GraphNode,
    specs: ModelSpec[]
  ): Promise<ResponseTensor> {
    const fitnessScores = node.params.fitnessScores ?? [];
    const eliteRatio = node.params.eliteRatio ?? 0.1;

    const n = specs.length;
    const nElite = Math.max(1, Math.floor(n * eliteRatio));

    // Sort by fitness descending
    const indexed = fitnessScores.map((score: number, i: number) => ({ score, index: i }));
    indexed.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    const newSpecs: ModelSpec[] = [];
    for (let i = 0; i < nElite && i < indexed.length; i++) {
      newSpecs.push(specs[indexed[i].index]);
    }

    // Fill remaining with copies (simplified - real implementation would mutate)
    while (newSpecs.length < n) {
      const randomElite = newSpecs[Math.floor(Math.random() * nElite)];
      newSpecs.push({ ...randomElite });
    }

    return {
      data: newSpecs.map(s => [s.modelRef]),
      modelSpecs: newSpecs,
      metadata: { operation: 'evolve', generation: 1 },
      shape: [n, 1]
    };
  }

  private async execJinx(
    node: GraphNode,
    specs: ModelSpec[]
  ): Promise<ResponseTensor> {
    const jinxName = node.params.jinxName;
    const inputs = node.params.inputs ?? {};

    const results: string[] = [];

    // Simplified jinx execution
    for (const spec of specs) {
      if (spec.modelType === 'npc') {
        results.push(`[jinx:${jinxName}] NPC execution`);
      } else {
        results.push(`[jinx:${jinxName}] ${spec.modelRef}`);
      }
    }

    return {
      data: results.map(r => [r]),
      modelSpecs: specs,
      metadata: { operation: 'jinx', jinxName, ...inputs },
      shape: [specs.length, 1]
    };
  }
}

/**
 * Quick inference across model/prompt matrix.
 */
export async function inferMatrix(
  prompts: string[],
  models: string[],
  options: {
    providers?: string[];
    parallel?: boolean;
    maxWorkers?: number;
  } & Record<string, any> = {}
): Promise<ResponseTensor> {
  const { providers, ...kwargs } = options;
  const arr = NPCArray.fromLLMs(models, { providers });
  return arr.infer(prompts, kwargs).collect(options);
}

/**
 * Quick ensemble voting across models.
 */
export async function ensembleVote(
  prompt: string,
  models: string[],
  options: {
    providers?: string[];
    parallel?: boolean;
    maxWorkers?: number;
  } & Record<string, any> = {}
): Promise<string> {
  const { providers, ...kwargs } = options;
  const arr = NPCArray.fromLLMs(models, { providers });
  const result = await arr.infer(prompt).vote(0).collect(kwargs);
  return result.data[0]?.[0] ?? '';
}
