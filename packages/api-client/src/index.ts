import type { z } from "zod";

import {
  type PlanRequest,
  type PlanResponse,
  PlanResponseSchema,
  type StudentProfileSummary,
  StudentProfileSummarySchema,
  type WeeklyReport,
  WeeklyReportSchema,
} from "@repo/schemas";

export interface ApiClientOptions {
  baseUrl?: string;
  headers?: HeadersInit;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestQuery = Record<string, string | number | boolean | undefined>;

type ApiClient = {
  api: {
    plan: {
      $get(args?: { query?: PlanQueryParams }): Promise<Response>;
    };
    profile: {
      $get(args?: { query?: { studentId?: string } }): Promise<Response>;
    };
    report: {
      weekly: {
        $get(args?: { query?: { studentId?: string } }): Promise<Response>;
      };
    };
  };
};

function resolveBaseUrl(options?: ApiClientOptions): string {
  return (
    options?.baseUrl ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    "http://localhost:8000"
  );
}

/**
 * Creates a type-safe client bound to the API app definition.
 */
export const createApiClient = (options: ApiClientOptions = {}): ApiClient => {
  const baseUrl = resolveBaseUrl(options);
  const fetchImpl = options.fetch ?? fetch;
  const defaultHeaders = options.headers;

  const runRequest = async (
    path: string,
    init?: { query?: RequestQuery; requestInit?: RequestInit },
  ) => {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl);
    const query = init?.query;
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    return fetchImpl(url, {
      method: "GET",
      headers: {
        ...defaultHeaders,
        ...init?.requestInit?.headers,
      },
      ...init?.requestInit,
    });
  };

  return {
    api: {
      plan: {
        $get: async (args) => runRequest("/api/plan", { query: args?.query }),
      },
      profile: {
        $get: async (args) => runRequest("/api/profile", { query: args?.query }),
      },
      report: {
        weekly: {
          $get: async (args) => runRequest("/api/report/weekly", { query: args?.query }),
        },
      },
    },
  } satisfies ApiClient;
};

export const createClient = createApiClient;
export type { ApiClient };

export type PlanQueryParams = Partial<Record<keyof PlanRequest, string>>;

export function buildPlanQuery(params: {
  studentId?: string;
  max?: number;
  includeSpeedDrills?: boolean;
  includeDiagnostic?: boolean;
}): PlanQueryParams | undefined {
  const query: PlanQueryParams = {};

  if (params.studentId) {
    query.studentId = params.studentId;
  }
  if (typeof params.max === "number") {
    query.max = params.max.toString();
  }
  if (typeof params.includeSpeedDrills === "boolean") {
    query.includeSpeedDrills = params.includeSpeedDrills ? "true" : "false";
  }
  if (typeof params.includeDiagnostic === "boolean") {
    query.includeDiagnostic = params.includeDiagnostic ? "true" : "false";
  }

  return Object.keys(query).length > 0 ? query : undefined;
}

function selectClient(provided?: ApiClient, options?: ApiClientOptions): ApiClient {
  return provided ?? createApiClient(options);
}

export async function requestPlan(
  params: {
    client?: ApiClient;
    options?: ApiClientOptions;
    query?: PlanQueryParams;
  } & {
    studentId?: string;
    max?: number;
    includeSpeedDrills?: boolean;
    includeDiagnostic?: boolean;
  } = {},
): Promise<PlanResponse> {
  const { client: providedClient, options, query, ...rest } = params;
  const client = selectClient(providedClient, options);
  const resolvedQuery = query ?? buildPlanQuery(rest);

  const response = await client.api.plan.$get({ query: resolvedQuery });
  return handleApiResponse<PlanResponse>(
    response,
    PlanResponseSchema as unknown as z.ZodSchema<PlanResponse>,
  );
}

export async function requestStudentProfile(
  params: {
    client?: ApiClient;
    options?: ApiClientOptions;
    studentId?: string;
  } = {},
): Promise<StudentProfileSummary> {
  const { client: providedClient, options, studentId } = params;
  const client = selectClient(providedClient, options);
  const response = await client.api.profile.$get({
    query: studentId ? { studentId } : undefined,
  });
  return handleApiResponse<StudentProfileSummary>(
    response,
    StudentProfileSummarySchema as unknown as z.ZodSchema<StudentProfileSummary>,
  );
}

export async function requestWeeklyReport(
  params: {
    client?: ApiClient;
    options?: ApiClientOptions;
    studentId?: string;
  } = {},
): Promise<WeeklyReport> {
  const { client: providedClient, options, studentId } = params;
  const client = selectClient(providedClient, options);
  const response = await client.api.report.weekly.$get({
    query: studentId ? { studentId } : undefined,
  });
  return handleApiResponse<WeeklyReport>(
    response,
    WeeklyReportSchema as unknown as z.ZodSchema<WeeklyReport>,
  );
}

export async function handleApiResponse<T>(response: Response, schema: z.ZodSchema<T>): Promise<T>;
export async function handleApiResponse<T = unknown>(
  response: Response,
  schema?: z.ZodSchema<T>,
): Promise<T>;
export async function handleApiResponse<T = unknown>(
  response: Response,
  schema?: z.ZodSchema<T>,
): Promise<T> {
  const payload = await response
    .clone()
    .json()
    .catch(() => undefined);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? (payload as { message?: string }).message
        : undefined) || `Request failed with status ${response.status}`;
    throw new ApiClientError(message, response.status, payload);
  }

  if (!schema) {
    return (payload ?? (await response.text())) as T;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError("Response validation failed", response.status, parsed.error.flatten());
  }

  return parsed.data;
}
