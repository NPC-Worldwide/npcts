/**
 * HTTP Adapters for Spatial Services
 *
 * Provides HTTP-based implementations of spatial service interfaces
 * for communication with a backend server.
 */

import type {
  SpatialConfigClient,
  CommandExecutionClient,
  ImageUploadClient,
  SpatialWorldConfig,
  CommandResult,
  RunningApp,
  ImageUploadResult,
} from '../../core/spatial';

// =============================================================================
// Spatial Config Client
// =============================================================================

export interface HttpSpatialConfigClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

/**
 * Creates an HTTP-based spatial config client
 */
export function createHttpSpatialConfigClient(
  options: HttpSpatialConfigClientOptions | string
): SpatialConfigClient {
  const { baseUrl, headers = {} } =
    typeof options === 'string' ? { baseUrl: options } : options;

  return {
    async loadConfig(): Promise<SpatialWorldConfig | null> {
      try {
        const response = await fetch(`${baseUrl}/api/spatial/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle case where backend returns a message instead of config
        if (data.message && !data.rooms) {
          return null;
        }

        return data as SpatialWorldConfig;
      } catch (error) {
        console.error('Error loading spatial config:', error);
        return null;
      }
    },

    async saveConfig(config: SpatialWorldConfig): Promise<void> {
      const response = await fetch(`${baseUrl}/api/spatial/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.status}`);
      }
    },
  };
}

// =============================================================================
// Command Execution Client
// =============================================================================

export interface HttpCommandClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Creates an HTTP-based command execution client
 */
export function createHttpCommandClient(
  options: HttpCommandClientOptions | string
): CommandExecutionClient {
  const {
    baseUrl,
    headers = {},
    timeout = 30000,
  } = typeof options === 'string' ? { baseUrl: options } : options;

  return {
    async executeCommand(command: string): Promise<CommandResult> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${baseUrl}/api/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ command }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return {
            error: `HTTP error: ${response.status}`,
            exitCode: response.status,
          };
        }

        const data = await response.json();
        return {
          stdout: data.stdout,
          stderr: data.stderr,
          error: data.error,
          exitCode: data.exitCode ?? 0,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            error: 'Command timed out',
            exitCode: -1,
          };
        }
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          exitCode: -1,
        };
      }
    },

    async getRunningApps(): Promise<RunningApp[]> {
      try {
        const response = await fetch(`${baseUrl}/api/running-apps`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        });

        if (!response.ok) {
          return [];
        }

        const data = await response.json();

        // Handle array of strings (legacy format)
        if (Array.isArray(data) && typeof data[0] === 'string') {
          return data.map((name: string) => ({ name }));
        }

        return data as RunningApp[];
      } catch (error) {
        console.error('Error fetching running apps:', error);
        return [];
      }
    },

    async killProcess(pid: number): Promise<void> {
      const response = await fetch(`${baseUrl}/api/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ pid }),
      });

      if (!response.ok) {
        throw new Error(`Failed to kill process: ${response.status}`);
      }
    },
  };
}

// =============================================================================
// Image Upload Client
// =============================================================================

export interface HttpImageUploadClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  fieldName?: string;
}

/**
 * Generates a hashed filename for uploaded images
 */
function generateHashedFilename(file: File | Blob, originalName?: string): string {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2, 7);

  let extension = 'png';

  if (originalName) {
    const parts = originalName.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        extension = ext;
      }
    }
  } else if (file instanceof File && file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        extension = ext;
      }
    }
  } else if (file.type) {
    const mimeExt = file.type.split('/')[1];
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(mimeExt)) {
      extension = mimeExt;
    }
  }

  return `${timestamp}_${randomString}.${extension}`;
}

/**
 * Creates an HTTP-based image upload client
 */
export function createHttpImageUploadClient(
  options: HttpImageUploadClientOptions | string
): ImageUploadClient {
  const {
    baseUrl,
    headers = {},
    fieldName = 'image',
  } = typeof options === 'string' ? { baseUrl: options } : options;

  return {
    async uploadImage(
      file: File | Blob,
      filename?: string
    ): Promise<ImageUploadResult> {
      const finalFilename = filename || generateHashedFilename(file);

      const formData = new FormData();
      formData.append(fieldName, file, finalFilename);

      const response = await fetch(`${baseUrl}/api/upload-image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload image: ${response.status}`);
      }

      const data = await response.json();

      return {
        filePath: data.filePath || finalFilename,
        tempUrl: data.tempUrl || URL.createObjectURL(file),
      };
    },

    async uploadFromBlobUrl(blobUrl: string): Promise<ImageUploadResult> {
      // Fetch the blob from the URL
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      // Upload the blob
      return this.uploadImage(blob);
    },
  };
}

// =============================================================================
// Combined Service Factory
// =============================================================================

export interface HttpSpatialServicesOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  commandTimeout?: number;
}

/**
 * Creates all spatial HTTP services at once
 */
export function createHttpSpatialServices(
  options: HttpSpatialServicesOptions | string
) {
  const opts = typeof options === 'string' ? { baseUrl: options } : options;

  return {
    config: createHttpSpatialConfigClient(opts),
    command: createHttpCommandClient({
      ...opts,
      timeout: opts.commandTimeout,
    }),
    image: createHttpImageUploadClient(opts),
  };
}
