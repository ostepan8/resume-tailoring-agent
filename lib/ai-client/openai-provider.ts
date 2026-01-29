/**
 * OpenAI Provider
 * 
 * Implements the AIClient interface using OpenAI's API.
 * Provides a drop-in replacement for Subconscious when needed.
 */

import OpenAI from 'openai';
import type { AIClient, AIRun, AIRunParams, Engine } from './types';
import { ENGINE_TO_OPENAI_MODEL } from './types';

// In-memory store for completed runs (since OpenAI doesn't have run IDs)
const runStore = new Map<string, AIRun>();

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  return `openai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map Subconscious engine to OpenAI model
 */
function engineToModel(engine: Engine): string {
  return ENGINE_TO_OPENAI_MODEL[engine] || 'gpt-4o';
}

/**
 * OpenAI Provider implementing the AIClient interface
 */
export class OpenAIProvider implements AIClient {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.client = new OpenAI({ apiKey: key });
  }

  /**
   * Create a new run using OpenAI's chat completions API.
   * 
   * Since OpenAI is synchronous, the run completes immediately.
   * The awaitCompletion option is effectively always true.
   */
  async run(params: AIRunParams): Promise<AIRun> {
    const runId = generateRunId();
    const model = engineToModel(params.engine);

    try {
      // Build the system message
      const systemMessage = `You are a helpful AI assistant. Follow the instructions carefully and provide accurate, well-structured responses.`;

      // Call OpenAI
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: params.input.instructions },
        ],
        temperature: 0.7,
        max_tokens: 16000,
      });

      const answer = response.choices[0]?.message?.content || '';

      const completedRun: AIRun = {
        runId,
        status: 'succeeded',
        result: {
          answer,
        },
      };

      // Store the run for later retrieval
      runStore.set(runId, completedRun);

      return completedRun;
    } catch (error) {
      console.error('OpenAI run error:', error);

      const failedRun: AIRun = {
        runId,
        status: 'failed',
        result: undefined,
      };

      runStore.set(runId, failedRun);

      // If awaitCompletion is false, return the failed run
      // Otherwise, throw the error
      if (params.options?.awaitCompletion === false) {
        return failedRun;
      }
      throw error;
    }
  }

  /**
   * Get the current state of a run.
   * 
   * Since OpenAI runs complete synchronously, this returns the stored result.
   */
  async get(runId: string): Promise<AIRun> {
    const run = runStore.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return run;
  }

  /**
   * Wait for a run to complete.
   * 
   * Since OpenAI runs complete synchronously, this just returns the stored result.
   */
  async wait(runId: string): Promise<AIRun> {
    return this.get(runId);
  }
}
