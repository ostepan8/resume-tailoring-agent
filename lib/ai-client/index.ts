/**
 * Unified AI Client
 * 
 * Provider-agnostic AI client that supports both Subconscious and OpenAI.
 * Switch providers by setting the AI_PROVIDER environment variable.
 * 
 * @example
 * ```typescript
 * import { getAIClient, DEFAULT_ENGINE } from '@/lib/ai-client';
 * 
 * const client = getAIClient();
 * const run = await client.run({
 *   engine: DEFAULT_ENGINE,
 *   input: { instructions: '...', tools: [] },
 *   options: { awaitCompletion: true },
 * });
 * console.log(run.result?.answer);
 * ```
 */

import type { AIClient, AIProvider } from './types';
import { OpenAIProvider } from './openai-provider';
import { SubconsciousProvider } from './subconscious-provider';

// Re-export types
export type {
  AIClient,
  AIRun,
  AIRunParams,
  AIRunInput,
  AIRunOptions,
  AIRunResult,
  AIProvider,
  Engine,
  RunStatus,
  Tool,
  PlatformTool,
  FunctionTool,
} from './types';

export { DEFAULT_ENGINE, ENGINE_TO_OPENAI_MODEL } from './types';

// Singleton client instance
let client: AIClient | null = null;
let currentProvider: AIProvider | null = null;

/**
 * Get the configured AI provider from environment.
 * Defaults to 'subconscious' if not set.
 */
export function getProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'openai') {
    return 'openai';
  }
  return 'subconscious'; // Default to Subconscious
}

/**
 * Get the unified AI client.
 * 
 * The provider is determined by the AI_PROVIDER environment variable:
 * - 'openai' (default): Uses OpenAI's API
 * - 'subconscious': Uses Subconscious API
 * 
 * The client is cached as a singleton for performance.
 */
export function getAIClient(): AIClient {
  const provider = getProvider();

  // Return cached client if provider hasn't changed
  if (client && currentProvider === provider) {
    return client;
  }

  // Create new client based on provider
  if (provider === 'subconscious') {
    client = new SubconsciousProvider();
  } else {
    client = new OpenAIProvider();
  }

  currentProvider = provider;
  return client;
}

/**
 * Helper to parse the answer from an AI response.
 * Handles both string and object answers.
 */
export function parseAnswer<T = unknown>(answer: unknown): T {
  if (typeof answer === 'string') {
    try {
      return JSON.parse(answer) as T;
    } catch {
      return answer as T;
    }
  }
  return answer as T;
}
