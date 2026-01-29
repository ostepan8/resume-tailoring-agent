import { Subconscious } from "subconscious";
import { SUBCONSCIOUS_BASE_URL, SUBCONSCIOUS_MODEL } from "@/constants/subconscious";

// Singleton client instance
let client: Subconscious | null = null;

export function getSubconsciousClient(): Subconscious {
  if (!client) {
    const apiKey = process.env.SUBCONSCIOUS_API_KEY;

    if (!apiKey) {
      throw new Error("SUBCONSCIOUS_API_KEY environment variable is not set");
    }

    const baseUrl = process.env.SUBCONSCIOUS_BASE_URL || SUBCONSCIOUS_BASE_URL;

    client = new Subconscious({
      apiKey,
      baseUrl,
    });
  }

  return client;
}

// Re-export engine constant for backward compatibility
export const DEFAULT_ENGINE = SUBCONSCIOUS_MODEL;

/**
 * Parse the answer from a TIM-large response.
 * When answerFormat is NOT used, the answer is returned as a JSON string.
 * This function handles both cases for safety.
 */
export function parseAnswer<T = unknown>(answer: unknown): T {
  if (typeof answer === "string") {
    return JSON.parse(answer) as T;
  }
  return answer as T;
}

// Helper to create a run with standard options
export async function createAgentRun(
  instructions: string,
  options?: {
    awaitCompletion?: boolean;
  }
) {
  const client = getSubconsciousClient();

  const run = await client.run({
    engine: DEFAULT_ENGINE,
    input: {
      instructions,
      tools: [{ type: "platform", id: "parallel_search", options: {} }],
    },
    options: {
      awaitCompletion: options?.awaitCompletion !== false,
    },
  });

  return run;
}
