/**
 * Core utility functions for npcts
 */

/**
 * Generate a unique ID string
 * @returns A random 9-character alphanumeric string
 */
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

/**
 * Hash an array of context objects for caching/comparison
 * @param contexts - Array of context objects with type, path/url, and content
 * @returns Base64 encoded hash string
 */
export const hashContext = (contexts: Array<{ type: string; path?: string; url?: string; content?: string }>): string => {
    const contentString = contexts
        .map(ctx => `${ctx.type}:${ctx.path || ctx.url}:${ctx.content?.substring(0, 100) || ''}`)
        .join('|');
    return btoa(contentString);
};
