/**
 * Media Generation Module
 *
 * Provides image and video generation functions that mirror npcpy's llm_funcs.
 * These functions interface with AI image/video generation providers.
 */

// =============================================================================
// Types
// =============================================================================

export interface ImageGenOptions {
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  model?: string;
  provider?: 'openai' | 'stability' | 'replicate';
  apiKey?: string;
}

export interface VideoGenOptions {
  width?: number;
  height?: number;
  duration?: number; // in seconds
  fps?: number;
  model?: string;
  provider?: 'replicate';
  apiKey?: string;
}

export interface ImageGenResult {
  url: string;
  localPath?: string;
  revisedPrompt?: string;
  metadata?: {
    width: number;
    height: number;
    model: string;
    provider: string;
  };
}

export interface VideoGenResult {
  url: string;
  localPath?: string;
  metadata?: {
    width: number;
    height: number;
    duration: number;
    fps: number;
    model: string;
    provider: string;
  };
}

// =============================================================================
// Image Generation
// =============================================================================

/**
 * Generate an image from a text prompt.
 *
 * Mirrors npcpy.llm_funcs.gen_image()
 *
 * Supported providers:
 * - openai: DALL-E 2/3 (default)
 * - stability: Stability AI SDXL
 * - replicate: Replicate image models
 *
 * @param prompt - The text description of the image to generate
 * @param options - Generation options
 * @returns Promise with the generated image result
 * @throws Error if the provider is unsupported or the request fails
 *
 * @example
 * ```typescript
 * const result = await gen_image("A serene mountain landscape at sunset", {
 *   width: 1024,
 *   height: 1024,
 *   provider: 'openai'
 * });
 * console.log(result.url);
 * ```
 */
export async function gen_image(
  prompt: string,
  options: ImageGenOptions = {}
): Promise<ImageGenResult> {
  const {
    width = 1024,
    height = 1024,
    quality = 'standard',
    style = 'vivid',
    model,
    provider = 'openai',
    apiKey,
  } = options;

  const effectiveApiKey = apiKey || getApiKeyForProvider(provider);

  if (!effectiveApiKey) {
    throw new Error(
      `No API key provided for ${provider}. Set the appropriate environment variable or pass apiKey.`
    );
  }

  switch (provider) {
    case 'openai':
      return generateOpenAIImage(prompt, {
        width,
        height,
        quality,
        style,
        model: model || 'dall-e-3',
        apiKey: effectiveApiKey,
      });

    case 'stability':
      return generateStabilityImage(prompt, {
        width,
        height,
        apiKey: effectiveApiKey,
      });

    case 'replicate':
      return generateReplicateImage(prompt, {
        width,
        height,
        model: model || 'black-forest-labs/flux-schnell',
        apiKey: effectiveApiKey,
      });

    default:
      throw new Error(`Unsupported image provider: ${provider}`);
  }
}

/**
 * Generate an image using OpenAI's DALL-E API.
 */
async function generateOpenAIImage(
  prompt: string,
  options: Required<Pick<ImageGenOptions, 'width' | 'height' | 'quality' | 'style' | 'model' | 'apiKey'>>
): Promise<ImageGenResult> {
  const { width, height, quality, style, model, apiKey } = options;

  // Map dimensions to DALL-E sizes
  let size: string;
  if (width === 1024 && height === 1024) size = '1024x1024';
  else if (width === 1024 && height === 1792) size = '1024x1792';
  else if (width === 1792 && height === 1024) size = '1792x1024';
  else size = '1024x1024'; // Default to square

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality,
      style,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI image generation failed: ${error}`);
  }

  const data = await response.json();
  const imageData = data.data?.[0];

  if (!imageData?.url) {
    throw new Error('No image URL returned from OpenAI');
  }

  return {
    url: imageData.url,
    revisedPrompt: imageData.revised_prompt,
    metadata: {
      width,
      height,
      model: model === 'dall-e-2' ? 'dall-e-2' : 'dall-e-3',
      provider: 'openai',
    },
  };
}

/**
 * Generate an image using Stability AI API.
 */
async function generateStabilityImage(
  prompt: string,
  options: Required<Pick<ImageGenOptions, 'width' | 'height' | 'apiKey'>>
): Promise<ImageGenResult> {
  const { width, height, apiKey } = options;

  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        width,
        height,
        steps: 30,
        cfg_scale: 7,
        samples: 1,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI image generation failed: ${error}`);
  }

  const data = await response.json();
  const imageData = data.artifacts?.[0];

  if (!imageData?.base64) {
    throw new Error('No image data returned from Stability AI');
  }

  // Convert base64 to data URL
  const base64Url = `data:image/png;base64,${imageData.base64}`;

  return {
    url: base64Url,
    metadata: {
      width,
      height,
      model: 'stable-diffusion-xl-1024-v1-0',
      provider: 'stability',
    },
  };
}

/**
 * Generate an image using Replicate API.
 */
async function generateReplicateImage(
  prompt: string,
  options: Required<Pick<ImageGenOptions, 'width' | 'height' | 'model' | 'apiKey'>>
): Promise<ImageGenResult> {
  const { width, height, model, apiKey } = options;

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version: model,
      input: {
        prompt,
        width,
        height,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate image generation failed: ${error}`);
  }

  const data = await response.json();

  if (!data.output?.[0]) {
    throw new Error('No image URL returned from Replicate');
  }

  return {
    url: data.output[0],
    metadata: {
      width,
      height,
      model,
      provider: 'replicate',
    },
  };
}

// =============================================================================
// Video Generation
// =============================================================================

/**
 * Generate a video from a text prompt or image.
 *
 * Mirrors npcpy.llm_funcs.gen_video()
 *
 * Currently supports Replicate video models.
 *
 * @param prompt - The text description of the video to generate, or an image URL/path
 * @param options - Generation options
 * @returns Promise with the generated video result
 * @throws Error if the provider is unsupported or the request fails
 *
 * @example
 * ```typescript
 * const result = await gen_video("A serene mountain landscape at sunset", {
 *   width: 1024,
 *   height: 576,
 *   duration: 4,
 *   provider: 'replicate'
 * });
 * console.log(result.url);
 * ```
 */
export async function gen_video(
  prompt: string,
  options: VideoGenOptions = {}
): Promise<VideoGenResult> {
  const {
    width = 1024,
    height = 576,
    duration = 4,
    fps = 24,
    model,
    provider = 'replicate',
    apiKey,
  } = options;

  const effectiveApiKey = apiKey || getApiKeyForProvider(provider);

  if (!effectiveApiKey) {
    throw new Error(
      `No API key provided for ${provider}. Set the appropriate environment variable or pass apiKey.`
    );
  }

  switch (provider) {
    case 'replicate':
      return generateReplicateVideo(prompt, {
        width,
        height,
        duration,
        fps,
        model: model || 'stable-video-diffusion',
        apiKey: effectiveApiKey,
      });

    default:
      throw new Error(`Unsupported video provider: ${provider}`);
  }
}

/**
 * Generate a video using Replicate API.
 */
async function generateReplicateVideo(
  prompt: string,
  options: Required<VideoGenOptions>
): Promise<VideoGenResult> {
  const { width, height, duration, fps, model, apiKey } = options;

  const isImageInput = prompt.startsWith('http') || prompt.startsWith('data:');

  const input: Record<string, unknown> = {
    width,
    height,
    fps,
    num_frames: duration * fps,
  };

  if (isImageInput) {
    input.image = prompt;
  } else {
    input.prompt = prompt;
  }

  const modelMapping: Record<string, string> = {
    'stable-video-diffusion': 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9bb0e5d0468a9a5ac3',
    'svd': 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9bb0e5d0468a9a5ac3',
  };

  const version = modelMapping[model] || model;

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      version,
      input,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Replicate video generation failed: ${error}`);
  }

  const data = await response.json();

  if (!data.output) {
    throw new Error('No video URL returned from Replicate');
  }

  // Handle different output formats from Replicate
  const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;

  return {
    url: videoUrl,
    metadata: {
      width,
      height,
      duration,
      fps,
      model: version,
      provider: 'replicate',
    },
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get API key for a provider from environment or config.
 */
function getApiKeyForProvider(provider: string): string | undefined {
  const envVars: Record<string, string[]> = {
    openai: ['OPENAI_API_KEY', 'NPCSH_OPENAI_API_KEY'],
    stability: ['STABILITY_API_KEY', 'NPCSH_STABILITY_API_KEY'],
    replicate: ['REPLICATE_API_TOKEN', 'NPCSH_REPLICATE_API_TOKEN'],
  };

  const keys = envVars[provider];
  if (!keys) return undefined;

  for (const key of keys) {
    const value = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (value) return value;
  }

  return undefined;
}

/**
 * Check if image generation is available (has required API keys).
 */
export function isImageGenAvailable(): boolean {
  return !!(
    getApiKeyForProvider('openai') ||
    getApiKeyForProvider('stability') ||
    getApiKeyForProvider('replicate')
  );
}

/**
 * Check if video generation is available (has required API keys).
 */
export function isVideoGenAvailable(): boolean {
  return !!getApiKeyForProvider('replicate');
}
