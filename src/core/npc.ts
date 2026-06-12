import yaml from 'js-yaml';

export interface NPCConfig {
  name: string;
  primary_directive?: string;
  model?: string;
  provider?: string;
  api_url?: string;
  api_key?: string;
  jinxes?: string[] | '*';
  mcp_servers?: string[];
  plain_system_message?: string;
  tools?: any[];
  memory?: any;
  [key: string]: any;
}

export interface TeamConfig {
  name?: string;
  model?: string;
  provider?: string;
  api_url?: string;
  api_key?: string;
  forenpc?: string;
  npcs?: string[];
  jinxes?: string[] | '*';
  mcp_servers?: string[];
  [key: string]: any;
}

export class Team {
  name: string;
  path: string;
  config: TeamConfig;
  npcs: Map<string, NPC> = new Map();
  forenpc: NPC | null = null;

  constructor(teamPath: string, config?: TeamConfig) {
    this.path = teamPath;
    this.config = config || {};
    this.name = this.config.name || this._dirName();
  }

  private _dirName(): string {
    return this.path.split(/[\\/]/).pop() || 'team';
  }

  get model(): string | undefined {
    return this.config.model;
  }

  get provider(): string | undefined {
    return this.config.provider;
  }

  get api_url(): string | undefined {
    return this.config.api_url;
  }

  get api_key(): string | undefined {
    return this.config.api_key;
  }

  addNPC(npc: NPC): void {
    this.npcs.set(npc.name, npc);
    npc.team = this;
    if (npc.name === this.config.forenpc) {
      this.forenpc = npc;
    }
  }
}

export class NPC {
  name: string;
  config: NPCConfig;
  team: Team | null = null;
  path: string | null = null;

  constructor(config: NPCConfig, filePath?: string) {
    this.config = config;
    this.name = config.name || 'unnamed';
    this.path = filePath || null;
  }

  get model(): string | undefined {
    return this.config.model || this.team?.model;
  }

  get provider(): string | undefined {
    return this.config.provider || this.team?.provider;
  }

  get api_url(): string | undefined {
    return this.config.api_url || this.team?.api_url;
  }

  get api_key(): string | undefined {
    return this.config.api_key || this.team?.api_key;
  }

  get primary_directive(): string | undefined {
    return this.config.primary_directive;
  }

  get jinxes(): string[] | '*' {
    return this.config.jinxes || [];
  }

  get mcp_servers(): string[] {
    return this.config.mcp_servers || [];
  }

  get plain_system_message(): string | undefined {
    return this.config.plain_system_message;
  }

  get tools(): any[] | undefined {
    return this.config.tools;
  }

  /**
   * Resolve model and provider using the same cascade as the backend:
   * explicit > NPC > team > null
   */
  resolveModelProvider(explicitModel?: string, explicitProvider?: string): {
    model: string | undefined;
    provider: string | undefined;
  } {
    let m = explicitModel;
    let p = explicitProvider;

    if (!m) m = this.model;
    if (!p) p = this.provider;

    return { model: m, provider: p };
  }
}

/**
 * Parse a .npc file (YAML) into an NPCConfig
 */
export function parseNPCFile(content: string): NPCConfig {
  const data = yaml.load(content) as Record<string, any>;
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

/**
 * Parse a team context file (.ctx or team.yaml) into a TeamConfig
 */
export function parseTeamFile(content: string): TeamConfig {
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

/**
 * Standalone model/provider resolver matching the backend logic.
 * Cascade: explicit > NPC > team > null
 */
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
    if (!p && npc.config.provider) p = npc.config.provider;
    if (!m && npc.config.model) m = npc.config.model;
    if (!m && npc.team?.model) m = npc.team.model;
    if (!p && npc.team?.provider) p = npc.team.provider;
  } else if (team) {
    if (!m && team.model) m = team.model;
    if (!p && team.provider) p = team.provider;
  }

  return { model: m, provider: p };
}
