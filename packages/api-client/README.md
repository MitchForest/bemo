# @repo/api-client

Thin, type-safe helpers for calling the Bemo API. Everything is powered by the shared Zod schemas, so every response is validated before it leaves this package—no Hono client plumbing required.

## Exports

| Export | Description |
| --- | --- |
| `createApiClient(options?)` | Returns lightweight fetch helpers scoped to the API base URL. |
| `buildPlanQuery(params)` | Utility to shape query parameters for the `/api/plan` endpoint. |
| `requestPlan(params)` | Fetches a plan and returns a validated `PlanResponse`. |
| `requestStudentProfile(params)` | Fetches `/api/profile` and returns a `StudentProfileSummary`. |
| `requestWeeklyReport(params)` | Fetches `/api/report/weekly` and returns a `WeeklyReport`. |
| `handleApiResponse(response, schema)` | Validates a raw `Response` with the provided schema, throwing a typed `ApiClientError` if anything is off. |
| `ApiClientError` | Error thrown when the API returns a non-2xx status or fails schema validation. |
| `PlanQueryParams` | Type describing the supported query string for the planner endpoint. |

## Quick example

```ts
import {
  requestPlan,
  requestStudentProfile,
  requestWeeklyReport,
} from "@repo/api-client";

const plan = await requestPlan({ studentId: "11111111-1111-4111-8111-111111111111", max: 5 });
const profile = await requestStudentProfile({ studentId: plan.motivation?.studentId ?? plan.studentStates?.[0]?.studentId });
const weeklyReport = await requestWeeklyReport({ studentId: plan.studentStates?.[0]?.studentId });
```

All three helpers validate their responses using the shared Zod schemas and return strongly typed data. If anything in the payload deviates (missing fields, wrong enum values, etc.), the helper throws an `ApiClientError` with the status code and validation issues.

## Error handling

```ts
import { requestPlan, ApiClientError } from "@repo/api-client";

try {
  await requestPlan({ studentId: "bad-id" });
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(error.status, error.message, error.payload);
  }
}
```

## Custom clients

If you need to reuse a client instance (for example in tests or worker environments), create one and pass it into the helpers:

```ts
import { createApiClient, requestPlan } from "@repo/api-client";

const client = createApiClient({ baseUrl: "https://staging-api.bemo.dev" });
const plan = await requestPlan({ client, studentId: "..." });
```

`createApiClient` also accepts `headers` and a custom `fetch` implementation for authenticated or server-side contexts.

## Design goals

- **No manual fetches** – every consumer goes through the helpers, keeping validation and error handling uniform.
- **Runtime safety** – schemas catch drift immediately and surface actionable errors.
- **Small surface area** – add new helpers only when the API gains new public endpoints.
