/**
 * Command Executor
 *
 * Handles shell command execution with proper error handling.
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import type { CommandResult, RunningApp } from '../../core/spatial';

const execPromise = promisify(exec);

// =============================================================================
// Command Execution
// =============================================================================

export interface ExecuteCommandOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Run in background (detached) */
  background?: boolean;
}

/**
 * Execute a shell command and return the result
 */
export async function executeCommand(
  command: string,
  options: ExecuteCommandOptions = {}
): Promise<CommandResult> {
  const {
    cwd = os.homedir(),
    env = process.env as Record<string, string>,
    timeout = 30000,
    background = false,
  } = options;

  try {
    if (background) {
      // Run in background (detached)
      const child = spawn(command, [], {
        cwd,
        env,
        shell: true,
        detached: true,
        stdio: 'ignore',
      });

      // Unref to allow parent to exit independently
      child.unref();

      return {
        stdout: `Command started in background (PID: ${child.pid})`,
        exitCode: 0,
      };
    }

    // Run synchronously and wait for result
    const { stdout, stderr } = await execPromise(command, {
      cwd,
      env,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'killed' in error && error.killed) {
      return {
        error: 'Command timed out',
        exitCode: -1,
      };
    }

    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout?.trim(),
      stderr: err.stderr?.trim(),
      error: err.message,
      exitCode: err.code ?? -1,
    };
  }
}

// =============================================================================
// Running Apps Detection
// =============================================================================

/**
 * Get list of running applications (platform-specific)
 */
export async function getRunningApps(): Promise<RunningApp[]> {
  const platform = os.platform();

  try {
    let command: string;

    if (platform === 'darwin') {
      // macOS
      command = 'ps -eo pid,pcpu,pmem,comm | head -20';
    } else if (platform === 'linux') {
      // Linux
      command = 'ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -20';
    } else if (platform === 'win32') {
      // Windows
      command =
        'powershell -Command "Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 | Format-Table -Property Id,CPU,Name -AutoSize"';
    } else {
      return [];
    }

    const { stdout } = await execPromise(command);
    const lines = stdout.trim().split('\n').slice(1); // Skip header

    const apps: RunningApp[] = lines
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) return null;

        const pid = parseInt(parts[0], 10);
        const cpuUsage = parseFloat(parts[1]);
        const memoryUsage = parseFloat(parts[2]);
        const name = parts.slice(3).join(' ');

        if (isNaN(pid)) return null;

        return {
          name,
          pid,
          cpuUsage: isNaN(cpuUsage) ? undefined : cpuUsage,
          memoryUsage: isNaN(memoryUsage) ? undefined : memoryUsage,
        } as RunningApp;
      })
      .filter((app): app is RunningApp => app !== null);

    return apps;
  } catch (error) {
    console.error('Error getting running apps:', error);
    return [];
  }
}

/**
 * Kill a process by PID
 */
export async function killProcess(pid: number): Promise<void> {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      await execPromise(`taskkill /PID ${pid} /F`);
    } else {
      await execPromise(`kill -9 ${pid}`);
    }
  } catch (error) {
    console.error(`Error killing process ${pid}:`, error);
    throw error;
  }
}

// =============================================================================
// Application Launcher
// =============================================================================

/**
 * Launch an application by name (cross-platform)
 */
export async function launchApplication(
  appName: string,
  args: string[] = []
): Promise<CommandResult> {
  const platform = os.platform();
  let command: string;

  if (platform === 'darwin') {
    // macOS - use open command
    command = `open -a "${appName}" ${args.join(' ')}`;
  } else if (platform === 'linux') {
    // Linux - try xdg-open or direct execution
    command = `${appName} ${args.join(' ')}`;
  } else if (platform === 'win32') {
    // Windows - use start command
    command = `start "" "${appName}" ${args.join(' ')}`;
  } else {
    return {
      error: `Unsupported platform: ${platform}`,
      exitCode: -1,
    };
  }

  return executeCommand(command, { background: true });
}
