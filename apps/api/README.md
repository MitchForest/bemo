# @repo/api

Bemo's Bun + Hono REST API with Better Auth, shared schemas, and auto-generated OpenAPI docs.

## Highlights

- **End-to-end types**: Every handler consumes/returns `@repo/schemas` Zod definitions.
- **Auth-aware**: Better Auth sessions available inside every route via `auth.api.getSession`.
- **Documentation-first**: OpenAPI, Swagger UI, and Scalar docs ship with the server.
- **Future-proof**: Engine calls are imported from `@repo/engine`, keeping business logic out of route files.

## Active route groups

| Route file | Base path | Description |
| ---------- | --------- | ----------- |
| `routes/plan.ts` | `/api/plan` | Learner playlists with stats, student state snapshots, and motivation preview. |
| `routes/evidence.ts` | `/api/evidence` | Evidence ingestion returning updated spaced-repetition state and XP. |
| `routes/diagnostic.ts` | `/api/diagnostic/*` | Fetch next math probe and submit answers with provisional mastery. |
| `routes/motivation.ts` | `/api/motivation*` | Motivation summary, leagues/squads, quests, time-back ledger, reward claiming, and digests. |
| `routes/profile.ts` | `/api/profile` | Dashboard-ready learner summary (mastery, plan, check charts). |
| `routes/reports.ts` | `/api/report/weekly` | Weekly XP/minutes digest with highlights and coach actions. |
| `routes/content.ts` | `/api/content/*` | Seeded content catalog (topics, practice activities, motivation assets, etc.). |
| `routes/auth.ts` | `/api/auth/*` | Better Auth handlers (proxied). |

## Running locally

```bash
bun install
bun run dev        # start API with Hono dev server
bun run build      # production build
bun run start      # run built server
bun run typecheck  # strict TypeScript check
```

Swagger and Scalar docs are served at:
- `http://localhost:3001/swagger`
- `http://localhost:3001/reference`
- Raw OpenAPI spec: `http://localhost:3001/doc`

## Adding a route

1. **Define schemas** (or reuse existing) in `@repo/schemas`.
2. **Create the Hono route** using `createRoute` and `.openapi(...)` for typed handlers.
3. **Import engine/business logic** from the relevant package—routes should stay thin.
4. **Register** the route in `src/app.ts` with `app.route("/", yourRoutes);`.

Example:
```ts
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { SomeSchema, SomeResponseSchema } from "@repo/schemas";
import { doWork } from "@repo/engine";

const app = new OpenAPIHono();

const someRoute = createRoute({
  method: "post",
  path: "/api/example",
  request: { body: { content: { "application/json": { schema: SomeSchema } } } },
  responses: { 200: { content: { "application/json": { schema: SomeResponseSchema } } } },
});

app.openapi(someRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const payload = c.req.valid("json");
  const result = await doWork({ studentId: session.user.id, payload });
  return c.json(result, 200);
});

export default app;
```

## Project structure

```
src/
├── app.ts              # Hono app + route registration
├── index.ts            # Bun entry point
├── openapi.ts          # Shared OpenAPI configuration
├── routes/             # Route groups (all OpenAPI-aware)
└── types.ts            # Env typings
```

## Testing & QA

The API relies on the engine's Bun tests and TypeScript checks:

```bash
bun test packages/engine               # ensures engine logic correctness
bun x tsc --noEmit -p apps/api         # route-level type checking
```

When wiring persistence back in, add integration tests that call the Hono handlers via `app.request`. For now the in-memory fallbacks mean no database is required in development.
