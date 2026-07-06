import yaml from 'js-yaml';
import nunjucks from 'nunjucks';

let fsModule: typeof import('fs') | undefined;
let pathModule: typeof import('path') | undefined;
let osModule: typeof import('os') | undefined;
try {
  fsModule = require('fs');
  pathModule = require('path');
  osModule = require('os');
} catch {
}

function renderJinja(content: string, ctx: Record<string, any> = {}): string {
  const env = new nunjucks.Environment();
  env.addGlobal('Jinx', (name: string) => name);
  try {
    return env.renderString(content, ctx);
  } catch {
    return content;
  }
}

export function renderJinjaContent(content: string): string {
  return renderJinja(content);
}

export function loadYamlFile(filePath: string): any {
  if (!fsModule) throw new Error('fs not available');
  const content = fsModule.readFileSync(filePath, 'utf8');
  const rendered = renderJinja(content);
  return yaml.load(rendered);
}

export function loadYamlString(content: string): any {
  const rendered = renderJinja(content);
  return yaml.load(rendered);
}

export class Jinx {
  jinx_name: string = '';
  inputs: any[] = [];
  description: string = '';
  npc?: string;
  steps: any[] = [];
  file_context: string[] = [];
  _source_path?: string;
  permissions: Record<string, string> = {};
  parsed_files: Record<string, any> = {};

  constructor(jinx_data?: Record<string, any>, jinx_path?: string) {
    if (jinx_path) {
      this._load_from_file(jinx_path);
    } else if (jinx_data) {
      this._load_from_data(jinx_data);
    }
    this._raw_steps = JSON.parse(JSON.stringify(this.steps));
    if (!this.steps || !this.steps.every((s) => typeof s === 'object')) {
      this.steps = [];
    }
    if (this.file_context?.length) {
      this.parsed_files = this._parse_file_patterns(this.file_context);
    }
  }

  private _load_from_file(path: string): void {
    const data = loadYamlFile(path);
    if (!data) throw new Error(`Failed to load jinx from ${path}`);
    data._source_path = path;
    this._load_from_data(data);
  }

  private _load_from_data(jinx_data: Record<string, any>): void {
    if (!jinx_data || typeof jinx_data !== 'object')
      throw new Error('Invalid jinx data provided');
    if (!jinx_data.jinx_name)
      throw new Error("Missing 'jinx_name' in jinx definition");
    this.jinx_name = jinx_data.jinx_name;
    this.inputs = jinx_data.inputs || [];
    this.description = jinx_data.description || '';
    this.npc = jinx_data.npc;
    this.steps = jinx_data.steps || [];
    this.file_context = jinx_data.file_context || [];
    this._source_path = jinx_data._source_path;
  }

  private _parse_file_patterns(patterns: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const pat of patterns) {
      result[pat] = true;
    }
    return result;
  }

  to_tool_def(): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const inp of this.inputs) {
      if (typeof inp === 'string') {
        properties[inp] = { type: 'string', description: `Parameter: ${inp}` };
        required.push(inp);
      } else if (typeof inp === 'object' && inp !== null) {
        const name = Object.keys(inp)[0];
        properties[name] = { type: 'string', description: `Parameter: ${name}` };
        required.push(name);
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

  render_first_pass(
    _jinja_env_for_macros: any,
    _all_jinx_callables: Record<string, any>
  ): void {
  }

  execute(
    _inputs: Record<string, any> = {},
    _context: Record<string, any> = {},
    _team?: any,
    _npc?: any
  ): any {
    throw new Error('Jinx.execute not implemented in npcts');
  }

  _execute_step(
    _step: any,
    _context: Record<string, any>,
    _team?: any,
    _npc?: any
  ): any {
    throw new Error('Jinx._execute_step not implemented in npcts');
  }

  _find_matching_files(
    _pattern: string,
    _base_path: string,
    _recursive = false
  ): string[] {
    return [];
  }

  _load_file_content(_file_path: string): string {
    return '';
  }

  _format_parsed_files_context(_parsed_files: Record<string, any>): string {
    return '';
  }

  to_dict(): Record<string, any> {
    return {
      jinx_name: this.jinx_name,
      description: this.description,
      inputs: this.inputs,
      npc: this.npc,
      steps: this.steps,
      file_context: this.file_context,
    };
  }

  save(directory?: string): void {
    if (!fsModule || !pathModule) throw new Error('fs/path not available');
    const dir = directory;
    if (!dir) throw new Error('No directory specified for save');
    const filePath = pathModule.join(dir, `${this.jinx_name}.jinx`);
    const yml = yaml.dump(this.to_dict(), { lineWidth: -1 });
    fsModule.writeFileSync(filePath, yml, 'utf8');
  static from_mcp(_mcp_tool: any): Jinx {
    throw new Error('Jinx.from_mcp not implemented in npcts');
  }

  setPermission(level: string): void {
    this.permissions[this.jinx_name] = level;
  }

  checkPermission(): string | undefined {
    return this.permissions[this.jinx_name];
  }
  static from_mcp(_mcp_tool: any): Jinx {
    throw new Error('Jinx.from_mcp not implemented in npcts');
  }
}

export class NPC {
  name: string = '';
  primary_directive?: string;
  model?: string;
  provider?: string;
  api_url?: string;
  api_key?: string;
  plain_system_message: boolean = false;
  jinxes_spec: string[] | '*' = [];
  jinxes_dict: Record<string, Jinx> = {};
  jinx_tool_catalog: Record<string, any> = {};
  tools: any[] = [];
  tool_map: Record<string, any> = {};
  tools_schema: any[] = [];
  mcp_servers: string[] = [];
  team: Team | null = null;
  npc_directory?: string;
  jinxes_directory?: string;
  memory_length: number = 20;
  memory_strategy: string = 'recent';
  shared_context: Record<string, any> = {};
  db_conn?: any;
  kg_data?: any;
  tables?: any;
  memory?: any;
  knowledge_manager?: any;
  knowledge_scopes: string[] = [];
  _extra_fields: Record<string, any> = {};
  use_global_jinxes: boolean = false;
  jinja_env?: any;
  _current_team?: Team;
  file?: string;

  constructor(options?: Record<string, any>) {
    const opts = options || {};
    const file = opts.file;
    const name = opts.name;
    const primary_directive = opts.primary_directive;

    if (!file && !name && !primary_directive) {
      throw new Error(
        "Either 'file' or 'name' and 'primary_directive' must be provided"
      );
    }

    this.team = opts.team || null;
    this.file = file;

    if (file) {
      if (String(file).endsWith('.npc')) {
        this._load_from_file(file);
      }
      if (pathModule) {
        const file_parent = pathModule.dirname(file);
        this.jinxes_directory = pathModule.join(file_parent, 'jinxes');
        this.npc_directory = file_parent;
      }
    } else {
      this.name = name || '';
      this.primary_directive = primary_directive;
      this.model = opts.model;
      this.provider = opts.provider;
      this.api_url = opts.api_url;
      this.api_key = opts.api_key;
      this._extra_fields = Object.fromEntries(
        Object.entries(opts).filter(
          ([k]) =>
            ![
              'file',
              'name',
              'primary_directive',
              'model',
              'provider',
              'api_url',
              'api_key',
              'jinxes',
              'tools',
              'plain_system_message',
              'team',
              'db_conn',
              'use_global_jinxes',
              'memory',
              'mcp_servers',
            ].includes(k)
        )
      );
      if (opts.use_global_jinxes) {
        this.jinxes_directory = undefined;
        this.use_global_jinxes = true;
      } else {
        this.jinxes_directory = undefined;
      }
      this.npc_directory = undefined;
    }

    if (opts.jinxes !== undefined) {
      this.jinxes_spec = opts.jinxes;
    }

    if (opts.tools) {
      this.tools = opts.tools;
      this.tools_schema = opts.tools;
    } else {
      this.tools = [];
      this.tool_map = {};
      this.tools_schema = [];
    }

    this.plain_system_message = opts.plain_system_message || false;
    this.use_global_jinxes = opts.use_global_jinxes || false;
    this.mcp_servers = opts.mcp_servers || [];
    this.memory_length = 20;
    this.memory_strategy = 'recent';

    this.db_conn = opts.db_conn;
    this.kg_data = null;
    this.tables = null;
    this.memory = null;
    this.knowledge_manager = null;
    this.knowledge_scopes = [];

    this.shared_context = {
      dataframes: {},
      current_data: null,
      computation_results: [],
      locals: {},
      memories: {},
      mcp_client: null,
      mcp_tools: [],
      mcp_tool_map: {},
      session_input_tokens: 0,
      session_output_tokens: 0,
      session_cost_usd: 0,
      turn_count: 0,
      current_mode: 'agent',
      attachments: [],
    };

    for (const [key, value] of Object.entries(this._extra_fields)) {
      (this as any)[key] = value;
    }
  }

  private _load_from_file(file_path: string): void {
    if (!fsModule) throw new Error('fs not available');
    const content = fsModule.readFileSync(file_path, 'utf8');
    const data = loadYamlString(content);
    if (!data) throw new Error(`Failed to load NPC from ${file_path}`);
    this.name = data.name || '';
    this.primary_directive = data.primary_directive;
    this.model = data.model;
    this.provider = data.provider;
    this.api_url = data.api_url;
    this.api_key = data.api_key;
    this.plain_system_message = data.plain_system_message || false;
    this.jinxes_spec = data.jinxes || [];
    this.mcp_servers = data.mcp_servers || [];
    this.tools = data.tools || [];
    this.memory = data.memory;
    this._extra_fields = Object.fromEntries(
      Object.entries(data).filter(
        ([k]) =>
          ![
            'name',
            'primary_directive',
            'model',
            'provider',
            'api_url',
            'api_key',
            'jinxes',
            'mcp_servers',
            'plain_system_message',
            'tools',
            'memory',
          ].includes(k)
      )
    );
    for (const [key, value] of Object.entries(this._extra_fields)) {
      (this as any)[key] = value;
    }
  }

  get npc_jinxes_directory(): string | undefined {
    return this.jinxes_directory;
  }

  initialize_jinxes(team_raw_jinxes?: Jinx[]): void {
    if (this.jinxes_spec === '*') {
      if (this.team && Object.keys(this.team.jinxes_dict).length) {
        Object.assign(this.jinxes_dict, this.team.jinxes_dict);
      }
      return;
    }

    const specs = Array.isArray(this.jinxes_spec) ? this.jinxes_spec : [];
    for (const jinx_spec of specs) {
      if (this.team && this.team.jinxes_dict[jinx_spec]) {
        this.jinxes_dict[jinx_spec] = this.team.jinxes_dict[jinx_spec];
      }
    }

    const team_jinxes_spec = this.team?.team_jinxes_spec;
    if (team_jinxes_spec && team_jinxes_spec !== '*' && this.team) {
      for (const jinx_spec of team_jinxes_spec) {
        if (this.team.jinxes_dict[jinx_spec] && !this.jinxes_dict[jinx_spec]) {
          this.jinxes_dict[jinx_spec] = this.team.jinxes_dict[jinx_spec];
        }
      }
    }

    if (
      this.npc_jinxes_directory &&
      fsModule &&
      fsModule.existsSync(this.npc_jinxes_directory)
    ) {
      const team_jinxes_dir = this.team?.team_path
        ? pathModule?.join(this.team.team_path, 'jinxes')
        : undefined;
      if (
        !team_jinxes_dir ||
        pathModule?.normalize(this.npc_jinxes_directory) !==
          pathModule?.normalize(team_jinxes_dir)
      ) {
        for (const j of load_jinxes_from_directory(this.npc_jinxes_directory)) {
          if (!this.jinxes_dict[j.jinx_name]) {
            this.jinxes_dict[j.jinx_name] = j;
          }
        }
      }
    }
  }

  get_memory_context(): any {
    throw new Error('NPC.get_memory_context not implemented in npcts');
  }

  enter_tool_use_loop(
    _request: any,
    _max_iterations = 3,
    _mcp_clients_cache?: Record<string, any>
  ): any {
    throw new Error('NPC.enter_tool_use_loop not implemented in npcts');
  }

  get_code_response(_task: string, _language = 'typescript'): string {
    throw new Error('NPC.get_code_response not implemented in npcts');
  }

  resolve_tools(_mcp_clients_cache?: Record<string, any>): {
    tools: any[];
    tool_map: Record<string, any>;
    mcp_tools: any[];
    mcp_tool_map: Record<string, any>;
  } {
    const tools: any[] = [];
    const tool_map: Record<string, any> = {};
    const mcp_tools: any[] = [];
    const mcp_tool_map: Record<string, any> = {};

    for (const [name, jinx] of Object.entries(this.jinxes_dict)) {
      const defn = jinx.to_tool_def();
      tools.push(defn);
      tool_map[name] = jinx;
    }

    if (this.tools?.length) {
      for (const t of this.tools) {
        tools.push(t);
        if (t.function?.name) {
          tool_map[t.function.name] = t;
        }
      }
    }

    if (this.tools_schema?.length) {
      for (const t of this.tools_schema) {
        tools.push(t);
        if (t.function?.name) {
          tool_map[t.function.name] = t;
        }
      }
    }

    return { tools, tool_map, mcp_tools, mcp_tool_map };
  }

  get_system_prompt(simple = false, tool_capable = false): string {
    const parts: string[] = [];
    if (this.primary_directive) {
      parts.push(this.primary_directive);
    }
    if (tool_capable && Object.keys(this.jinxes_dict).length) {
      const names = Object.keys(this.jinxes_dict).join(', ');
      parts.push(`Available jinxes: ${names}`);
    }
    return parts.join('\n\n');
  }

  get_llm_response(
    _messages: any[],
    _model?: string,
    _provider?: string,
    _stream = false
  ): any {
    throw new Error('NPC.get_llm_response not implemented in npcts');
  }

  search_my_memories(_query: string, _limit = 10): string {
    throw new Error('NPC.search_my_memories not implemented in npcts');
  }

  query_database(_sql_query: string): string {
    throw new Error('NPC.query_database not implemented in npcts');
  }

  think_step_by_step(_problem: string): string {
    throw new Error('NPC.think_step_by_step not implemented in npcts');
  }

  write_code(_task: string, _language = 'typescript'): string {
    throw new Error('NPC.write_code not implemented in npcts');
  }

  create_planning_state(_goal: string): Record<string, any> {
    throw new Error('NPC.create_planning_state not implemented in npcts');
  }

  generate_todos(
    _user_goal: string,
    _planning_state: Record<string, any>,
    _additional_context = ''
  ): Record<string, any>[] {
    throw new Error('NPC.generate_todos not implemented in npcts');
  }

  should_break_down_todo(_todo: Record<string, any>): boolean {
    return false;
  }

  generate_subtodos(_todo: Record<string, any>): Record<string, any>[] {
    throw new Error('NPC.generate_subtodos not implemented in npcts');
  }

  execute_planning_item(
    _item: Record<string, any>,
    _planning_state: Record<string, any>,
    _context = ''
  ): Record<string, any> {
    throw new Error('NPC.execute_planning_item not implemented in npcts');
  }

  get_planning_context_summary(_planning_state: Record<string, any>): string {
    return '';
  }

  compress_planning_state(_messages: any[]): string {
    return '';
  }

  decompress_planning_state(_compressed_state: string): Record<string, any> {
    return {};
  }

  run_planning_loop(
    _user_goal: string,
    _interactive = true
  ): Record<string, any> {
    throw new Error('NPC.run_planning_loop not implemented in npcts');
  }

  execute_jinx(
    _jinx_name: string,
    _inputs: Record<string, any> = {},
    _context: Record<string, any> = {}
  ): any {
    throw new Error('NPC.execute_jinx not implemented in npcts');
  }

  check_llm_command(
    _input_text: string,
    _context: Record<string, any> = {}
  ): any {
    throw new Error('NPC.check_llm_command not implemented in npcts');
  }

  run(_input_text: string, ..._kwargs: any[]): any {
    throw new Error('NPC.run not implemented in npcts');
  }

  handle_agent_pass(
    _target_npc: NPC,
    _command: string,
    ..._kwargs: any[]
  ): any {
    throw new Error('NPC.handle_agent_pass not implemented in npcts');
  }

  execute_jinx_command(_command: string, ..._kwargs: any[]): any {
    throw new Error('NPC.execute_jinx_command not implemented in npcts');
  }

  to_dict(): Record<string, any> {
    const d: Record<string, any> = {
      name: this.name,
      primary_directive: this.primary_directive,
      model: this.model,
      provider: this.provider,
      api_url: this.api_url,
      api_key: this.api_key,
      jinxes: this.jinxes_spec,
      mcp_servers: this.mcp_servers,
      plain_system_message: this.plain_system_message,
      tools: this.tools,
      memory: this.memory,
      ...this._extra_fields,
    };
    for (const [k, v] of Object.entries(d)) {
      if (v === undefined) delete d[k];
    }
    return d;
  }

  save(directory?: string): void {
    if (!fsModule || !pathModule) throw new Error('fs/path not available');
    const dir = directory || this.npc_directory;
    if (!dir) throw new Error('No directory specified for save');
    const filePath = pathModule.join(dir, `${this.name}.npc`);
    const dict = this.to_dict();
    const yml = yaml.dump(dict, { lineWidth: -1 });
    fsModule.writeFileSync(filePath, yml, 'utf8');
  }

  __str__(): string {
    return `NPC(${this.name})`;
  }
}

export class Team {
  name: string = 'custom_team';
  team_path?: string;
  npcs: Record<string, NPC> = {};
  sub_teams: Record<string, Team> = {};
  jinxes_dict: Record<string, Jinx> = {};
  _raw_jinxes_list: Jinx[] = [];
  jinx_tool_catalog: Record<string, any> = {};
  jinja_env_for_first_pass?: any;
  db_conn?: any;
  model?: string;
  provider?: string;
  api_url?: string;
  api_key?: string;
  forenpc: NPC | null = null;
  forenpc_name?: string;
  skills_directory?: string;
  _jinx_path_map: Record<string, string> = {};
  context: string = '';
  shared_context: Record<string, any> = {};
  mcp_servers: string[] = [];
  databases: any[] = [];
  team_jinxes_spec?: string[] | '*';

  constructor(options?: Record<string, any>) {
    const opts = options || {};
    this.model = opts.model;
    this.provider = opts.provider;
    this.api_url = opts.api_url;
    this.api_key = opts.api_key;
    this._team_jinxes = opts.team_jinxes;

    this.npcs = {};
    this.sub_teams = {};
    this.jinxes_dict = {};
    this._raw_jinxes_list = [];
    this.jinx_tool_catalog = {};
    this.db_conn = opts.db_conn;
    this.team_path = opts.team_path
      ? pathModule?.resolve(opts.team_path) || opts.team_path
      : undefined;
    this.databases = [];
    this.mcp_servers = [];
    this.forenpc = null;
    this.forenpc_name = undefined;
    this.skills_directory = undefined;

    if (this.team_path) {
      this.name = this.team_path.split(/[\\/]/).pop() || 'team';
      this._load_from_directory_and_initialize_forenpc();
    } else if (opts.npcs && Array.isArray(opts.npcs)) {
      this.name = 'custom_team';
      for (const npc_obj of opts.npcs) {
        this.npcs[npc_obj.name] = npc_obj;
        npc_obj.team = this;
      }
      if (opts.jinxes && Array.isArray(opts.jinxes)) {
        for (const jinx_item of opts.jinxes) {
          if (jinx_item instanceof Jinx) {
            this._raw_jinxes_list.push(jinx_item);
          } else if (typeof jinx_item === 'object' && jinx_item !== null) {
            this._raw_jinxes_list.push(new Jinx(jinx_item));
          }
        }
      }
      this._determine_forenpc_from_provided_npcs(
        opts.npcs,
        opts.forenpc
      );
    } else {
      this.name = 'custom_team';
      this._create_default_forenpc();
    }

    this.context = '';
    this.shared_context = {
      intermediate_results: {},
      dataframes: {},
      memories: {},
      execution_history: [],
      context: '',
    };

    if (this.team_path) {
      this._load_team_context_into_shared_context();
    } else if (this.forenpc) {
      if (!this.context) {
        this.context = `Team '${this.name}' with forenpc '${this.forenpc.name}'`;
        this.shared_context.context = this.context;
      }
    }

    this._perform_first_pass_jinx_rendering();
    this.jinx_tool_catalog = build_jinx_tool_catalog(this.jinxes_dict);
    for (const npc_obj of Object.values(this.npcs)) {
      npc_obj.initialize_jinxes(this._raw_jinxes_list);
    }
  }

  private _team_jinxes?: Jinx[];

  private _load_from_directory_and_initialize_forenpc(): void {
    if (!this.team_path || !fsModule) return;
    if (!fsModule.existsSync(this.team_path)) {
      throw new Error(`Team directory not found: ${this.team_path}`);
    }

    this._load_team_context_file();

    if (this._team_jinxes) {
      this._raw_jinxes_list.push(...this._team_jinxes);
    }

    const jinxes_dir = pathModule?.join(this.team_path, 'jinxes');
    if (jinxes_dir && fsModule.existsSync(jinxes_dir)) {
      for (const jinx_obj of load_jinxes_from_directory(jinxes_dir)) {
        this._raw_jinxes_list.push(jinx_obj);
      }
    }

    if (this.skills_directory) {
      let skills_path = this.skills_directory;
      if (!pathModule?.isAbsolute(skills_path) && this.team_path) {
        skills_path = pathModule.join(this.team_path, skills_path);
      }
      if (fsModule.existsSync(skills_path)) {
        for (const jinx_obj of load_jinxes_from_directory(skills_path)) {
          this._raw_jinxes_list.push(jinx_obj);
        }
      }
    }

    this._jinx_path_map = {};
    for (const jinx_obj of this._raw_jinxes_list) {
      if (jinx_obj.jinx_name in this._jinx_path_map) continue;
      const source = jinx_obj._source_path;
      if (source && jinxes_dir) {
        const rel = source
          .replace(jinxes_dir + (pathModule?.sep || '/'), '')
          .replace(/\.jinx$/, '');
        this._jinx_path_map[jinx_obj.jinx_name] = rel;
      }
    }

    if (fsModule.existsSync(this.team_path)) {
      const entries = fsModule.readdirSync(this.team_path);
      for (const entry of entries) {
        if (!entry.endsWith('.npc')) continue;
        try {
          const npc = new NPC({ file: pathModule?.join(this.team_path, entry) });
          this.add_npc(npc);
        } catch {
        }
      }
    }

    this._determine_forenpc_from_provided_npcs(
      Object.values(this.npcs),
      this.forenpc_name
    );
  }

  private _load_team_context_file(): void {
    if (!this.team_path || !fsModule || !pathModule) return;
    try {
      const files = fsModule.readdirSync(this.team_path);
      for (const fname of files) {
        if (fname.endsWith('.ctx')) {
          const ctxFile = pathModule.join(this.team_path, fname);
          const data = loadYamlFile(ctxFile);
          if (!data || typeof data !== 'object') return;
          if (data.model) this.model = data.model;
          if (data.provider) this.provider = data.provider;
          if (data.api_url) this.api_url = data.api_url;
          if (data.api_key) this.api_key = data.api_key;
          if (data.forenpc) this.forenpc_name = data.forenpc;
          if (data.npcs && Array.isArray(data.npcs)) {
          }
          if (data.jinxes !== undefined) {
            this.team_jinxes_spec = data.jinxes;
          }
          if (data.mcp_servers && Array.isArray(data.mcp_servers)) {
            this.mcp_servers = data.mcp_servers;
          }
          if (data.skills_directory) this.skills_directory = data.skills_directory;
          return;
        }
      }
    } catch {
    }
  }

  private _load_team_context_into_shared_context(): void {
    if (!this.context && this.forenpc) {
      this.context = `Team '${this.name}' with forenpc '${this.forenpc.name}'`;
    }
    this.shared_context.context = this.context;
  }

  private _determine_forenpc_from_provided_npcs(
    npcs_list: NPC[],
    forenpc_arg?: string | NPC | null
  ): void {
    if (forenpc_arg) {
      if (typeof forenpc_arg === 'string') {
        if (this.npcs[forenpc_arg]) {
          this.forenpc = this.npcs[forenpc_arg];
          this.forenpc_name = forenpc_arg;
        }
      } else if (forenpc_arg instanceof NPC) {
        this.forenpc = forenpc_arg;
        this.forenpc_name = forenpc_arg.name;
      }
    }
    if (!this.forenpc) {
      const names = Object.keys(this.npcs);
      if (names.length) {
        this.forenpc = this.npcs[names[0]];
        this.forenpc_name = this.forenpc.name;
      }
    }
  }

  private _create_default_forenpc(): void {
    this.forenpc = new NPC({
      name: 'forenpc',
      primary_directive: 'You are the forenpc of an NPC team',
    });
    this.forenpc_name = 'forenpc';
    this.npcs['forenpc'] = this.forenpc;
    this.forenpc.team = this;
  }

  private _perform_first_pass_jinx_rendering(): void {
    for (const jinx_obj of this._raw_jinxes_list) {
      this.jinxes_dict[jinx_obj.jinx_name] = jinx_obj;
    }
  }

  add_npc(npc: NPC): void {
    this.npcs[npc.name] = npc;
    npc.team = this;
    if (this.forenpc_name && npc.name === this.forenpc_name) {
      this.forenpc = npc;
    }
  }

  get_forenpc(): NPC | null {
    return this.forenpc;
  }

  get_npc(npc_ref: string | NPC): NPC | null {
    if (typeof npc_ref === 'string') {
      return this.npcs[npc_ref] || null;
    }
    if (npc_ref instanceof NPC) {
      return this.npcs[npc_ref.name] || null;
    }
    return null;
  }

  update_context(_messages: any[]): void {
  }

  _load_sub_teams(): void {
  }

  _resolve_team_jinxes_spec(): void {
  }

  _load_agents_from_md(_path: string): void {
  }

  _load_agents_from_dir(_agents_dir: string): void {
  }

  _register_or_prompt_agent(
    _name: string,
    _directive: string,
    _source_path: string
  ): void {
  }

  _register_md_agent(
    _name: string,
    _directive: string,
    _model?: string,
    _provider?: string,
    _jinxes_spec?: any,
    _source_path?: string
  ): void {
  }

  orchestrate(_request: any, _max_iterations = 3): any {
    throw new Error('Team.orchestrate not implemented in npcts');
  }

  to_dict(): Record<string, any> {
    return {
      name: this.name,
      model: this.model,
      provider: this.provider,
      api_url: this.api_url,
      api_key: this.api_key,
      forenpc: this.forenpc_name,
      npcs: Object.keys(this.npcs),
      jinxes: Object.keys(this.jinxes_dict),
      mcp_servers: this.mcp_servers,
    };
  }

  save(directory?: string): void {
    if (!fsModule || !pathModule) throw new Error('fs/path not available');
    const dir = directory || this.team_path;
    if (!dir) throw new Error('No directory specified for save');
    const ctxFile = pathModule.join(dir, 'team.ctx');
    const dict = this.to_dict();
    const yml = yaml.dump(dict, { lineWidth: -1 });
    fsModule.writeFileSync(ctxFile, yml, 'utf8');
  }

  static from_directory(team_path: string): Team {
    return new Team({ team_path });
  }
}

function scanJinxDirectory(dir: string, prefix = ''): Jinx[] {
  if (!fsModule) return [];
  const out: Jinx[] = [];
  try {
    const entries = fsModule.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = entry.name;
      const relPath = prefix ? `${prefix}/${full}` : full;
      if (entry.isDirectory()) {
        out.push(...scanJinxDirectory(`${dir}/${full}`, relPath));
      } else if (full.endsWith('.jinx')) {
        try {
          const j = new Jinx(undefined, `${dir}/${full}`);
          out.push(j);
        } catch {
        }
      }
    }
  } catch {
  }
  return out;
}

export function load_jinxes_from_directory(directory: string): Jinx[] {
  return scanJinxDirectory(directory);
}

function updateFieldInYaml(content: string, field: string, newValue: any): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (match && match[2] === field) {
      const indent = match[1];
      if (Array.isArray(newValue)) {
        result.push(`${indent}${field}:`);
        for (const item of newValue) {
          result.push(`${indent}  - ${item}`);
        }
      } else if (typeof newValue === 'string' && newValue.includes('\n')) {
        result.push(`${indent}${field}: |2`);
        for (const sub of newValue.split('\n')) {
          result.push(`${indent}  ${sub}`);
        }
      } else {
        result.push(`${indent}${field}: ${newValue}`);
      }
      i++;
      const targetIndent = match[1].length;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === '') {
          i++;
          continue;
        }
        const nextIndent = next.length - next.trimStart().length;
        if (nextIndent <= targetIndent) break;
        i++;
      }
      continue;
    }
    result.push(line);
    i++;
  }
  return result.join('\n');
}

export function parseNPCFile(content: string): Record<string, any> {
  const rendered = renderJinja(content);
  const data = (yaml.load(rendered) as Record<string, any>) || {};
  return {
    name: data.name || '',
    primary_directive: data.primary_directive,
    model: data.model,
    provider: data.provider,
    api_url: data.api_url,
    api_key: data.api_key,
    jinxes: data.jinxes,
    mcp_servers: data.mcp_servers,
    plain_system_message: data.plain_system_message,
    tools: data.tools,
    memory: data.memory,
    ...Object.fromEntries(
      Object.entries(data).filter(
        ([k]) =>
          ![
            'name',
            'primary_directive',
            'model',
            'provider',
            'api_url',
            'api_key',
            'jinxes',
            'mcp_servers',
            'plain_system_message',
            'tools',
            'memory',
          ].includes(k)
      )
    ),
  };
}

export function saveNPCFile(originalContent: string, npc: Record<string, any>): string {
  const rendered = renderJinja(originalContent);
  const current = (yaml.load(rendered) as Record<string, any>) || {};
  let content = originalContent;

  const scalarFields = [
    'name',
    'model',
    'provider',
    'api_url',
    'api_key',
  ] as const;
  for (const field of scalarFields) {
    if (field in npc && npc[field] !== current[field]) {
      content = updateFieldInYaml(content, field, npc[field]);
    }
  }

  if (
    'primary_directive' in npc &&
    npc.primary_directive !== current.primary_directive
  ) {
    content = updateFieldInYaml(
      content,
      'primary_directive',
      npc.primary_directive
    );
  }

  if ('jinxes' in npc && Array.isArray(npc.jinxes)) {
    const jinxValues = npc.jinxes.map((j: any) => {
      if (typeof j === 'string' && /^[a-zA-Z0-9_]+$/.test(j)) {
        return `{{ Jinx('${j}') }}`;
      }
      return String(j);
    });
    content = updateFieldInYaml(content, 'jinxes', jinxValues);
  }

  return content;
}

export function parseTeamFile(content: string): Record<string, any> {
  const data = yaml.load(content) as Record<string, any>;
  return {
    name: data.name,
    model: data.model,
    provider: data.provider,
    api_url: data.api_url,
    api_key: data.api_key,
    forenpc: data.forenpc,
    npcs: data.npcs,
    jinxes: data.jinxes,
    mcp_servers: data.mcp_servers,
    ...Object.fromEntries(
      Object.entries(data).filter(
        ([k]) =>
          ![
            'name',
            'model',
            'provider',
            'api_url',
            'api_key',
            'forenpc',
            'npcs',
            'jinxes',
            'mcp_servers',
          ].includes(k)
      )
    ),
  };
}

export function build_jinx_tool_catalog(
  jinxes: Record<string, Jinx>
): Record<string, any> {
  const catalog: Record<string, any> = {};
  for (const [name, jinx] of Object.entries(jinxes)) {
    catalog[name] = jinx.to_tool_def();
  }
  return catalog;
}

export function jinx_to_tool_def(jinx_obj: Jinx): any {
  return jinx_obj.to_tool_def();
}

export function match_jinx_spec_to_names(
  jinx_spec: string,
  team_jinxes_dict: Record<string, Jinx>,
  _jinxes_base_dir: string,
  _jinx_path_map?: Record<string, string>
): string[] {
  if (jinx_spec === '*') return Object.keys(team_jinxes_dict);
  return [jinx_spec].filter((n) => n in team_jinxes_dict);
}

export function extract_jinx_inputs(_args: any[], _jinx: Jinx): Record<string, any> {
  return {};
}

export function resolveModelProvider(
  npc?: NPC,
  team?: Team,
  explicitModel?: string,
  explicitProvider?: string
): {
  model: string | undefined;
  provider: string | undefined;
} {
  let m = explicitModel;
  let p = explicitProvider;

  if (m && p) {
    return { model: m, provider: p };
  }

  if (npc) {
    if (!p && npc.provider) p = npc.provider;
    if (!m && npc.model) m = npc.model;
    if (!m && npc.team?.model) m = npc.team.model;
    if (!p && npc.team?.provider) p = npc.team.provider;
  } else if (team) {
    if (!m && team.model) m = team.model;
    if (!p && team.provider) p = team.provider;
  }

  return { model: m, provider: p };
}

export function resolveTeamPath(teamYamlPath: string, teamKey: string): string | null {
  if (!fsModule || !pathModule || !osModule) {
    throw new Error('fs/path/os not available');
  }
  const resolvedPath = pathModule.resolve(osModule.homedir(), teamYamlPath);
  if (!fsModule.existsSync(resolvedPath)) return null;
  const content = fsModule.readFileSync(resolvedPath, 'utf8');
  const data = yaml.load(content) as Record<string, any>;
  const teams = data?.teams || {};
  const rawPath = teams[teamKey];
  if (!rawPath) return null;
  return String(rawPath).replace(/^~(?=\/|$)/, osModule.homedir());
}

export function loadRegisteredTeams(teamYamlPath: string): Record<string, string> {
  if (!fsModule || !pathModule || !osModule) {
    throw new Error('fs/path/os not available');
  }
  const resolvedPath = pathModule.resolve(osModule.homedir(), teamYamlPath);
  if (!fsModule.existsSync(resolvedPath)) return {};
  const content = fsModule.readFileSync(resolvedPath, 'utf8');
  const data = yaml.load(content) as Record<string, any>;
  const teams: Record<string, string> = {};
  for (const [k, v] of Object.entries(data?.teams || {})) {
    teams[k] = String(v).replace(/^~(?=\/|$)/, osModule.homedir());
  }
  return teams;
}
