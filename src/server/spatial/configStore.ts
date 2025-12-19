/**
 * Configuration Store
 *
 * Handles loading and saving spatial world configuration to disk.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { SpatialWorldConfig } from '../../core/spatial';

// =============================================================================
// Config Store Interface
// =============================================================================

export interface ConfigStore {
  load(): Promise<SpatialWorldConfig | null>;
  save(config: SpatialWorldConfig): Promise<void>;
  getConfigPath(): string;
  getImagesPath(): string;
}

// =============================================================================
// File-based Config Store
// =============================================================================

export interface FileConfigStoreOptions {
  /** Base directory for storing config (defaults to ~/.bloomos) */
  baseDir?: string;
  /** Config filename (defaults to config.json) */
  configFilename?: string;
}

/**
 * Creates a file-based configuration store
 */
export function createFileConfigStore(
  options: FileConfigStoreOptions = {}
): ConfigStore {
  const {
    baseDir = path.join(os.homedir(), '.bloomos'),
    configFilename = 'config.json',
  } = options;

  const configPath = path.join(baseDir, configFilename);
  const imagesPath = path.join(baseDir, 'data', 'user_data', 'images');

  return {
    async load(): Promise<SpatialWorldConfig | null> {
      try {
        // Ensure directories exist
        await fs.mkdir(baseDir, { recursive: true });

        // Check if config exists
        try {
          await fs.access(configPath);
        } catch {
          // Config doesn't exist, return null
          return null;
        }

        // Read and parse config
        const content = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(content) as SpatialWorldConfig;
      } catch (error) {
        console.error('Error loading config:', error);
        return null;
      }
    },

    async save(config: SpatialWorldConfig): Promise<void> {
      try {
        // Ensure directory exists
        await fs.mkdir(baseDir, { recursive: true });

        // Write config
        await fs.writeFile(
          configPath,
          JSON.stringify(config, null, 2),
          'utf-8'
        );
      } catch (error) {
        console.error('Error saving config:', error);
        throw error;
      }
    },

    getConfigPath(): string {
      return configPath;
    },

    getImagesPath(): string {
      return imagesPath;
    },
  };
}

// =============================================================================
// Default Config
// =============================================================================

/**
 * Creates a default spatial world configuration
 */
export function createDefaultConfig(): SpatialWorldConfig {
  return {
    userCharacter: {
      name: 'Player',
      x: 400,
      y: 300,
      width: 50,
      height: 50,
      spriteSheets: {
        up: [],
        down: [],
        left: [],
        right: [],
      },
    },
    rooms: {
      Room1: {
        name: 'Room1',
        walls: {
          topWall: {
            orientation: 'horizontal',
            x: 0,
            y: 0,
            width: 100,
            height: 7,
            style: 'brick',
          },
          bottomWall: {
            orientation: 'horizontal',
            x: 0,
            y: 93,
            width: 100,
            height: 7,
            style: 'brick',
          },
          leftWall: {
            orientation: 'vertical',
            x: 0,
            y: 0,
            width: 1.5,
            height: 100,
            style: 'brick',
          },
          rightWall: {
            orientation: 'vertical',
            x: 98.5,
            y: 0,
            width: 1.5,
            height: 100,
            style: 'brick',
          },
        },
        doors: {},
        applications: {},
      },
    },
    appIcons: {},
  };
}
