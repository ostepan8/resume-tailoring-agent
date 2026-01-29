/**
 * Unified AI Client Types
 * 
 * Provider-agnostic interface for AI operations.
 * Supports both Subconscious and OpenAI backends.
 */

import { SUBCONSCIOUS_MODEL } from "@/constants/subconscious";

// Engine types - matches Subconscious SDK
export type Engine = 'tim-small-preview' | 'tim-large' | 'tim-gpt-heavy' | 'timini' | (string & {});

// Run status - matches Subconscious SDK
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'timed_out';

// Tool types - matches Subconscious SDK
export type PlatformTool = {
  type: 'platform';
  id: string;
  options: Record<string, unknown>;
};

export type FunctionTool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type Tool = PlatformTool | FunctionTool;

// Run result
export type AIRunResult = {
  answer: string | unknown;
  reasoning?: unknown;
};

// Run object
export type AIRun = {
  runId: string;
  status?: RunStatus;
  result?: AIRunResult;
};

// Run input
export type AIRunInput = {
  instructions: string;
  tools?: Tool[];
  answerFormat?: Record<string, unknown>;
  reasoningFormat?: Record<string, unknown>;
};

// Run options
export type AIRunOptions = {
  awaitCompletion?: boolean;
};

// Run parameters
export type AIRunParams = {
  engine: Engine;
  input: AIRunInput;
  options?: AIRunOptions;
};

/**
 * Unified AI Client Interface
 * 
 * Both Subconscious and OpenAI providers implement this interface,
 * allowing seamless switching between providers.
 */
export interface AIClient {
  /**
   * Create a new run.
   * 
   * @param params - Run parameters including engine, input, and options
   * @returns The created run, with results if awaitCompletion is true
   */
  run(params: AIRunParams): Promise<AIRun>;

  /**
   * Get the current state of a run.
   * 
   * @param runId - The ID of the run to retrieve
   * @returns The current run state
   */
  get(runId: string): Promise<AIRun>;

  /**
   * Wait for a run to complete by polling.
   * 
   * @param runId - The ID of the run to wait for
   * @returns The completed run
   */
  wait(runId: string): Promise<AIRun>;
}

// Provider type
export type AIProvider = 'subconscious' | 'openai';

// Engine to OpenAI model mapping
export const ENGINE_TO_OPENAI_MODEL: Record<string, string> = {
  'tim-small-preview': 'gpt-4o-mini',
  'tim-large': 'gpt-4o',
  'tim-gpt-heavy': 'gpt-4o',
  'timini': 'gpt-4o-mini',
};

// Default engine - uses constant from central config
export const DEFAULT_ENGINE: Engine = SUBCONSCIOUS_MODEL;
