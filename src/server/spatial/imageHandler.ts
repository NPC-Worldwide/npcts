/**
 * Image Handler
 *
 * Handles image upload and storage.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface ImageUploadResult {
  filePath: string;
  fullPath: string;
  tempUrl?: string;
}

export interface ImageHandlerOptions {
  /** Base directory for storing images */
  imagesDir: string;
  /** Allowed file extensions */
  allowedExtensions?: string[];
  /** Max file size in bytes (default 10MB) */
  maxFileSize?: number;
}

// =============================================================================
// Image Handler
// =============================================================================

/**
 * Creates an image handler for file uploads
 */
export function createImageHandler(options: ImageHandlerOptions) {
  const {
    imagesDir,
    allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxFileSize = 10 * 1024 * 1024,
  } = options;

  /**
   * Ensure the images directory exists
   */
  async function ensureDir(): Promise<void> {
    await fs.mkdir(imagesDir, { recursive: true });
  }

  /**
   * Generate a unique filename
   */
  function generateFilename(originalName?: string): string {
    const timestamp = Date.now().toString();
    const randomStr = crypto.randomBytes(4).toString('hex');

    let extension = 'png';
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase().slice(1);
      if (allowedExtensions.includes(ext)) {
        extension = ext;
      }
    }

    return `${timestamp}_${randomStr}.${extension}`;
  }

  /**
   * Validate file extension
   */
  function validateExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return allowedExtensions.includes(ext);
  }

  /**
   * Save a buffer to a file
   */
  async function saveBuffer(
    buffer: Buffer,
    filename?: string
  ): Promise<ImageUploadResult> {
    await ensureDir();

    const finalFilename = filename || generateFilename();
    const fullPath = path.join(imagesDir, finalFilename);

    // Check file size
    if (buffer.length > maxFileSize) {
      throw new Error(`File too large. Max size is ${maxFileSize / 1024 / 1024}MB`);
    }

    // Validate extension if filename provided
    if (filename && !validateExtension(filename)) {
      throw new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
    }

    await fs.writeFile(fullPath, buffer);

    return {
      filePath: `/images/${finalFilename}`,
      fullPath,
    };
  }

  /**
   * Save a base64-encoded image
   */
  async function saveBase64(
    base64Data: string,
    filename?: string
  ): Promise<ImageUploadResult> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    return saveBuffer(buffer, filename);
  }

  /**
   * Delete an image
   */
  async function deleteImage(filename: string): Promise<void> {
    const fullPath = path.join(imagesDir, path.basename(filename));

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * List all images
   */
  async function listImages(): Promise<string[]> {
    try {
      await ensureDir();
      const files = await fs.readdir(imagesDir);
      return files.filter((f) => {
        const ext = path.extname(f).toLowerCase().slice(1);
        return allowedExtensions.includes(ext);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get the full path for an image filename
   */
  function getFullPath(filename: string): string {
    return path.join(imagesDir, path.basename(filename));
  }

  return {
    saveBuffer,
    saveBase64,
    deleteImage,
    listImages,
    getFullPath,
    generateFilename,
    validateExtension,
    imagesDir,
  };
}

// =============================================================================
// Express Middleware Helper
// =============================================================================

/**
 * Parse multipart form data for file uploads
 * This is a simple implementation - use multer for production
 */
export async function parseMultipartFormData(
  req: { headers: Record<string, string>; body: Buffer | string }
): Promise<{
  fields: Record<string, string>;
  files: Array<{ name: string; filename: string; data: Buffer }>;
}> {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);

  if (!boundaryMatch) {
    return { fields: {}, files: [] };
  }

  const boundary = boundaryMatch[1];
  const body = typeof req.body === 'string' ? Buffer.from(req.body) : req.body;
  const bodyStr = body.toString('binary');

  const parts = bodyStr.split(`--${boundary}`).slice(1, -1);

  const fields: Record<string, string> = {};
  const files: Array<{ name: string; filename: string; data: Buffer }> = [];

  for (const part of parts) {
    const [headerSection, ...contentParts] = part.split('\r\n\r\n');
    const content = contentParts.join('\r\n\r\n').replace(/\r\n$/, '');

    const dispositionMatch = headerSection.match(
      /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/
    );

    if (dispositionMatch) {
      const [, name, filename] = dispositionMatch;

      if (filename) {
        files.push({
          name,
          filename,
          data: Buffer.from(content, 'binary'),
        });
      } else {
        fields[name] = content;
      }
    }
  }

  return { fields, files };
}
