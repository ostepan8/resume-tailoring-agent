/**
 * Subconscious Provider
 * 
 * Implements the AIClient interface by wrapping the Subconscious SDK.
 * This is a thin adapter that delegates to the existing SDK.
 */

import { Subconscious } from 'subconscious';
import type { AIClient, AIRun, AIRunParams } from './types';

/**
 * Subconscious Provider implementing the AIClient interface
 */
export class SubconsciousProvider implements AIClient {
  private client: Subconscious;

  constructor(apiKey?: string, baseUrl?: string) {
    const key = apiKey || process.env.SUBCONSCIOUS_API_KEY;
    const url = baseUrl || process.env.SUBCONSCIOUS_BASE_URL;

    if (!key) {
      throw new Error('SUBCONSCIOUS_API_KEY environment variable is not set');
    }

    const options: { apiKey: string; baseUrl?: string } = { apiKey: key };
    if (url) {
      options.baseUrl = url;
    }

    this.client = new Subconscious(options);
  }

  /**
   * Create a new run using Subconscious API.
   */
  async run(params: AIRunParams): Promise<AIRun> {
    const result = await this.client.run({
      engine: params.engine,
      input: {
        instructions: params.input.instructions,
        tools: params.input.tools,
        // Type cast needed as our generic type is looser than SDK's OutputSchema
        answerFormat: params.input.answerFormat as Parameters<typeof this.client.run>[0]['input']['answerFormat'],
        reasoningFormat: params.input.reasoningFormat as Parameters<typeof this.client.run>[0]['input']['reasoningFormat'],
      },
      options: params.options,
    });

    return {
      runId: result.runId,
      status: result.status,
      result: result.result ? {
        answer: result.result.answer,
        reasoning: result.result.reasoning,
      } : undefined,
    };
  }

  /**
   * Get the current state of a run.
   */
  async get(runId: string): Promise<AIRun> {
    const result = await this.client.get(runId);

    return {
      runId: result.runId,
      status: result.status,
      result: result.result ? {
        answer: result.result.answer,
        reasoning: result.result.reasoning,
      } : undefined,
    };
  }

  /**
   * Wait for a run to complete by polling.
   */
  async wait(runId: string): Promise<AIRun> {
    const result = await this.client.wait(runId);

    return {
      runId: result.runId,
      status: result.status,
      result: result.result ? {
        answer: result.result.answer,
        reasoning: result.result.reasoning,
      } : undefined,
    };
  }
}
