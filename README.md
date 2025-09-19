# Bemo Monorepo

A strict, type-safe workspace for the Bemo learning platform. Everything runs on Bun, Hono, Next.js, and a common set of Zod contracts so the API, engine, and UI always agree.

## Contents

| Path | Purpose |
| --- | --- |
| `apps/api` | Hono REST API (Bun runtime) exposing the engine and curriculum contracts. |
| `apps/web` | Next.js 15 web experience powered by TanStack Query and the shared client. |
| `packages/api-client` | Typed HTTP client + helpers for talking to the API. |
| `packages/auth` | Better Auth wiring with a DB-backed mode and a dev stub. |
| `packages/curriculum` | Canonical curriculum seeds, IDs, and lookup helpers. |
| `packages/db` | Postgres (Supabase) access layer, migrations, and seed script. |
| `packages/engine` | Adaptive learning engine, motivation system, and profile/report builders. |
| `packages/schemas` | Zod schemas + inferred TypeScript types consumed by every workspace. |
| `packages/utils` | Small shared helper library (ID generation, array guards, etc.). |

## Quick start

```bash
bun install
bun run dev --filter @repo/api    # start the API on http://localhost:8000
bun run dev --filter @repo/web    # start the Next.js app on http://localhost:3000
```

You can run the stack without a database: the engine falls back to rich in-memory seeds, authentication returns a demo student session, and the API publishes the same schema. To persist state, set `DATABASE_URL` (Supabase/Postgres) and run migrations:

```bash
bun run db:migrate   # apply migrations across workspaces
bun run db:seed      # load curriculum data into Postgres
```

## Common scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Runs all dev servers via Turborepo. Use `--filter` to scope. |
| `bun run build` | Builds every workspace. |
| `bun run typecheck` | Strict TypeScript across the repo. |
| `bun run lint` | Biome lint/format check. |
| `bun run test` | Aggregated test runner (currently engine-focused). |
| `bun run db:migrate` | Runs all database migrations. |
| `bun run db:codegen` | Regenerates Kysely TypeScript types from Postgres. |

## End-to-end type safety

All contracts live in `packages/schemas`. A typical flow looks like this:

1. **Define contracts** – add or update Zod schemas in `@repo/schemas`. Types are inferred automatically via `z.infer`.
2. **Use in the API** – import the schema into `apps/api` routes. Hono + `zod-openapi` enforce the request/response shapes and surface them in Swagger/Scalar docs.
3. **Call from clients** – use helpers from `@repo/api-client` (e.g. `requestPlan`, `requestStudentProfile`). These functions validate responses at runtime and return the inferred types to TypeScript callers.
4. **Render in React** – `apps/web` wraps the requests in TanStack Query hooks so components receive typed data with loading/error states handled for free.

If any shape drifts, compilation breaks or the runtime validator throws immediately. There are no ad-hoc fetches or hand-written DTOs.

## Engine + curriculum in development

- Curriculum seeds live in `packages/curriculum/src`. They provide deterministic IDs, check charts, quests, joy breaks, and sample assets so the engine and app can run without a database.
- `packages/engine/src/data.ts` transparently swaps between Postgres-backed storage and in-memory maps depending on whether `DATABASE_URL` is present.
- `bun test packages/engine` exercises the core planner, motivation system, diagnostics, and evidence ingestion entirely offline.

## API client helpers

`@repo/api-client` wraps the Hono RPC client and ships high-level helpers:

```ts
import { requestPlan, requestStudentProfile } from "@repo/api-client";

const plan = await requestPlan({ studentId: "1111...", max: 5 });
const profile = await requestStudentProfile("1111...");
```

You can still create a raw client if you need lower-level access, but the helpers keep the happy path consistent for React and any future consumers.

## Styling & UI conventions

- Shadcn + Radix primitives live under `apps/web/src/components/ui`. They mirror the new design tokens and never ship unused variants.
- Higher-level patterns (`journey-section`, dashboards, graphs) sit inside `apps/web/src/components/patterns` and `.../dashboard`.
- Tailwind 4 powers styling; use the `cn` helper from `apps/web/src/lib/utils.ts` to merge classes.

## Auth modes

- With `DATABASE_URL` set, Better Auth runs against Postgres using the shared Kysely instance.
- Without it, the auth package returns a deterministic demo session so local flows work instantly. The `/api/auth/*` routes respond with a 200 JSON message telling you auth is stubbed.

## Code quality

- Biome enforces formatting and linting (`bun run lint`).
- TypeScript runs in `strict` mode everywhere.
- The repo intentionally has zero dead code paths; if a helper/component is unused, delete it.
- Tests currently cover the engine. Extend coverage as you add persistence or UI logic.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| API crashes with Postgres errors | Configure `DATABASE_URL` or run without a database (engine falls back to in-memory seeds). |
| Auth routes return 503 | Expected if `DATABASE_URL` is missing—use the demo session or provide the connection string. |
| TypeScript says `client` is `unknown` | Use the high-level helpers in `@repo/api-client` instead of accessing the raw Hono client. |

## Contributing

1. Keep schemas the source of truth. Every new contract starts in `@repo/schemas`.
2. Prefer the shared helpers (API client, utils) over ad-hoc utilities.
3. Make sure `bun run typecheck` and `bun run lint` pass before opening a PR.
4. Update relevant READMEs when behaviour changes—documentation is part of the contract.
