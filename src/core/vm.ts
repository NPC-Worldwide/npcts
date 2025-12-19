/**
 * VM Management Module
 *
 * Provides interfaces and utilities for managing virtual machines.
 * This is separate from the spatial UI components.
 */

// =============================================================================
// Types
// =============================================================================

export interface VMConfig {
  name: string;
  uri?: string; // e.g., "qemu:///system"
  type?: 'qemu' | 'virtualbox' | 'vmware' | 'custom';
  command?: string; // Custom command to launch
}

export interface VMState {
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  cpu?: number;
  memory?: number;
}

export interface VMClient {
  listVMs(): Promise<VMState[]>;
  startVM(name: string): Promise<void>;
  stopVM(name: string): Promise<void>;
  openVM(name: string): Promise<void>;
  getVMStatus(name: string): Promise<VMState>;
}

export interface VMCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

// =============================================================================
// HTTP VM Client
// =============================================================================

export interface HttpVMClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

/**
 * Creates an HTTP-based VM client
 */
export function createHttpVMClient(
  options: HttpVMClientOptions | string
): VMClient {
  const { baseUrl, headers = {} } =
    typeof options === 'string' ? { baseUrl: options } : options;

  return {
    async listVMs(): Promise<VMState[]> {
      try {
        const response = await fetch(`${baseUrl}/api/vm/list`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });

        if (!response.ok) {
          return [];
        }

        return await response.json();
      } catch (error) {
        console.error('Error listing VMs:', error);
        return [];
      }
    },

    async startVM(name: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/vm/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start VM: ${response.status}`);
      }
    },

    async stopVM(name: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/vm/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Failed to stop VM: ${response.status}`);
      }
    },

    async openVM(name: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/vm/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Failed to open VM: ${response.status}`);
      }
    },

    async getVMStatus(name: string): Promise<VMState> {
      const response = await fetch(`${baseUrl}/api/vm/status/${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        return { name, status: 'unknown' };
      }

      return await response.json();
    },
  };
}

// =============================================================================
// Command-based VM Client (for local execution)
// =============================================================================

export interface CommandVMClientOptions {
  executeCommand: (command: string) => Promise<VMCommandResult>;
  type?: 'qemu' | 'virtualbox' | 'vmware';
  uri?: string;
}

/**
 * Creates a command-based VM client for local VM management
 */
export function createCommandVMClient(
  options: CommandVMClientOptions
): VMClient {
  const {
    executeCommand,
    type = 'qemu',
    uri = 'qemu:///system',
  } = options;

  const getListCommand = () => {
    switch (type) {
      case 'qemu':
        return `virsh -c ${uri} list --all`;
      case 'virtualbox':
        return 'VBoxManage list vms';
      case 'vmware':
        return 'vmrun list';
      default:
        return '';
    }
  };

  const getStartCommand = (name: string) => {
    switch (type) {
      case 'qemu':
        return `virsh -c ${uri} start ${name}`;
      case 'virtualbox':
        return `VBoxManage startvm "${name}" --type headless`;
      case 'vmware':
        return `vmrun start "${name}"`;
      default:
        return '';
    }
  };

  const getStopCommand = (name: string) => {
    switch (type) {
      case 'qemu':
        return `virsh -c ${uri} shutdown ${name}`;
      case 'virtualbox':
        return `VBoxManage controlvm "${name}" poweroff`;
      case 'vmware':
        return `vmrun stop "${name}"`;
      default:
        return '';
    }
  };

  const getOpenCommand = (name: string) => {
    switch (type) {
      case 'qemu':
        return `virt-viewer --connect ${uri} ${name}`;
      case 'virtualbox':
        return `VBoxManage startvm "${name}"`;
      case 'vmware':
        return `vmrun start "${name}"`;
      default:
        return '';
    }
  };

  return {
    async listVMs(): Promise<VMState[]> {
      const cmd = getListCommand();
      if (!cmd) return [];

      const result = await executeCommand(cmd);
      if (!result.success || !result.output) return [];

      // Parse output based on type
      const vms: VMState[] = [];
      const lines = result.output.split('\n');

      if (type === 'qemu') {
        // Skip header lines, parse virsh list output
        for (const line of lines.slice(2)) {
          const match = line.match(/^\s*(\d+|-)\s+(\S+)\s+(\S+)/);
          if (match) {
            const [, , vmName, state] = match;
            vms.push({
              name: vmName,
              status: state === 'running' ? 'running' : 'stopped',
            });
          }
        }
      }

      return vms;
    },

    async startVM(name: string): Promise<void> {
      const cmd = getStartCommand(name);
      if (!cmd) throw new Error(`Unsupported VM type: ${type}`);

      const result = await executeCommand(cmd);
      if (!result.success) {
        throw new Error(result.error || 'Failed to start VM');
      }
    },

    async stopVM(name: string): Promise<void> {
      const cmd = getStopCommand(name);
      if (!cmd) throw new Error(`Unsupported VM type: ${type}`);

      const result = await executeCommand(cmd);
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop VM');
      }
    },

    async openVM(name: string): Promise<void> {
      const cmd = getOpenCommand(name);
      if (!cmd) throw new Error(`Unsupported VM type: ${type}`);

      const result = await executeCommand(cmd);
      if (!result.success) {
        throw new Error(result.error || 'Failed to open VM');
      }
    },

    async getVMStatus(name: string): Promise<VMState> {
      const vms = await this.listVMs();
      const vm = vms.find((v) => v.name === name);
      return vm || { name, status: 'unknown' };
    },
  };
}

// =============================================================================
// Default VM configurations
// =============================================================================

export const DEFAULT_VM_CONFIGS: Record<string, VMConfig> = {
  qemu: {
    name: 'QEMU/KVM',
    type: 'qemu',
    uri: 'qemu:///system',
  },
  virtualbox: {
    name: 'VirtualBox',
    type: 'virtualbox',
  },
  vmware: {
    name: 'VMware',
    type: 'vmware',
  },
};
