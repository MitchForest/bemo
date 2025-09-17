import { hc } from "hono/client";
import type { z } from "zod";

// Import the app type from API
import type { AppType } from "../../../apps/api/src/app";

/**
 * Type-safe API client using Hono's RPC client
 * This provides end-to-end type safety from API routes to client calls
 */
export const createApiClient = (
  baseUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  options?: RequestInit,
) => {
  return hc<AppType>(baseUrl, {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, {
        ...options,
        ...init,
        headers: {
          ...options?.headers,
          ...init?.headers,
        },
      });
    },
  });
};

// Keep backward compatibility
export const createClient = createApiClient;

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Helper to handle API responses with consistent error handling
 * and runtime validation using Zod schemas
 */
export async function handleApiResponse<T>(
  response: Response,
  schema?: z.ZodSchema<T>,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  const json = await response.json();

  // If a schema is provided, validate the response
  if (schema) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Response validation failed: ${parsed.error.message}`);
    }
    return { data: parsed.data };
  }

  return { data: json };
}

/**
 * Re-export commonly used types
 */
export type { AppType } from "../../../apps/api/src/app";
