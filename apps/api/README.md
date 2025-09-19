# @repo/api

Bun + Hono API for the Bemo platform. Every route is wired to the shared schemas, so the engine, curriculum, and client stay in sync.

## Highlights

- **Zero-setup dev mode** – without `DATABASE_URL` the API serves seeded data, the engine works entirely in-memory, and auth returns a deterministic demo session.
- **Typed contracts** – requests and responses are validated with the same Zod schemas used by the engine and React app.
- **First-class docs** – OpenAPI JSON, Swagger UI, and Scalar reference are generated directly from the route definitions.
- **Thin routes** – business logic lives in `@repo/engine`; routes simply validate, authorise, and map inputs.

## Endpoints

| File | Path | Notes |
| --- | --- | --- |
| `routes/plan.ts` | `/api/plan` | Learner plan with tasks, stats, and motivation preview. |
| `routes/evidence.ts` | `/api/evidence` | Submit evidence events and receive updated skill states. |
| `routes/diagnostic.ts` | `/api/diagnostic/*` | Fetch/submit adaptive diagnostic probes. |
| `routes/motivation.ts` | `/api/motivation*` | Motivation summary, quests, leagues, time-back ledger. |
| `routes/profile.ts` | `/api/profile` | Student profile including mastery, plan snapshot, check charts. |
| `routes/reports.ts` | `/api/report/weekly` | Weekly digest for adults (XP, minutes, highlights). |
| `routes/content.ts` | `/api/content/*` | Curriculum, assets, and motivation catalogues. |
| `routes/auth.ts` | `/api/auth/*` | Better Auth handler (returns a stub session when auth is disabled). |

## Local development

```bash
bun install
bun run dev --filter @repo/api  # http://localhost:8000
```

Docs are available at:

- Swagger UI: http://localhost:8000/swagger
- Scalar reference: http://localhost:8000/reference
- OpenAPI JSON: http://localhost:8000/doc

### Database vs. in-memory mode

| Scenario | Behaviour |
| --- | --- |
| `DATABASE_URL` set | Routes read/write through Kysely. Better Auth uses the shared Postgres connection. |
| `DATABASE_URL` missing | Engine + API fall back to rich curriculum seeds. Auth returns a demo session (the routes stay open for local development). |

Migrations, seed data, and type generation all live in `packages/db`.

## Adding a route

1. Define/extend the contract in `@repo/schemas`.
2. Implement the route using `createRoute` from `@hono/zod-openapi`.
3. Delegate to the engine/curriculum packages—avoid embedding business logic in the route.
4. Register the route in `src/app.ts`.

```ts
const sampleRoute = createRoute({
  method: "post",
  path: "/api/sample",
  request: { body: { content: { "application/json": { schema: SampleRequestSchema } } } },
  responses: { 200: { content: { "application/json": { schema: SampleResponseSchema } } } },
});

app.openapi(sampleRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const payload = c.req.valid("json");
  const result = await doSampleWork({ studentId: session.user.id, payload });
  return c.json(result, 200);
});
```

## Structure

```
src/
├── app.ts      # Hono instance + route registration
├── index.ts    # Bun entry point
├── routes/     # Route groups
└── (docs via app.ts) # OpenAPI configuration lives alongside the app wiring
```

## Quality gates

```bash
bun x tsc --noEmit -p apps/api          # route-level type checking
bun test packages/engine                # engine logic + in-memory mode
```

When persistence-specific behaviour is added, add dedicated tests that hit the Hono app via `app.request()`.
