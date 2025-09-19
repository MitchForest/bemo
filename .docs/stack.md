# Bemo Stack — 2025 Snapshot

This document reflects the **current** state of the repo after the refactor. Treat it as the source of truth for new teammates and for future design docs.

## 1. Monorepo layout

```
repo/
├─ apps/
│  ├─ api/          # Bun + Hono API (OpenAPI, Better Auth, engine surface)
│  └─ web/          # Next.js 15 experience (dashboard previews + patterns)
├─ packages/
│  ├─ api-client/   # Typed client + high-level helpers (requestPlan, etc.)
│  ├─ auth/         # Better Auth config + demo fallback
│  ├─ curriculum/   # Skill graph + seeded content for dev mode
│  ├─ db/           # Kysely bindings, migrations, seeds
│  ├─ engine/       # Planner, memory, diagnostics, motivation, reports
│  ├─ schemas/      # Zod contracts (single source of truth)
│  └─ utils/        # Small helper library (generateId, chunk, etc.)
├─ turbo.json
├─ tsconfig.base.json
├─ biome.json
└─ README.md
```

Everything uses Bun workspaces + Turborepo for orchestration. TypeScript runs in `strict` mode everywhere.

## 2. Runtime story

| Layer | Technology | Notes |
| --- | --- | --- |
| API | Bun + Hono + `@hono/zod-openapi` | Routes are thin wrappers around engine calls. Auth stub kicks in automatically when `DATABASE_URL` is missing. |
| Engine | Pure TypeScript | Owns planning, memory updates, diagnostics, motivation, and reporting. Persists via Kysely *or* runtime seeds depending on env. |
| Database | Postgres (Supabase friendly) | Migrations + seeds live in `packages/db`. When the connection string is absent the engine uses deterministic in-memory stores. |
| Web | Next.js 15, Tailwind v4, shadcn/Radix | Dashboard previews fetch data via the shared API client helpers. |
| Client SDK | `@repo/api-client` | Ships helper functions (`requestPlan`, `requestStudentProfile`, `requestWeeklyReport`) so no consumer hits the API without validation. |

## 3. Dev mode without a database

- Curriculum seeds now include skills, task templates, content assets, diagnostic probes, motivation tracks, stickers, and joy breaks.
- Engine reads/writes everything through an in-memory map when `DATABASE_URL` is missing.
- Auth exports a deterministic demo session so `/api/` routes continue to work.
- The API client reuses the same schemas to validate responses, so the React app receives fully-typed data even in seed mode.

This keeps `bun run dev --filter @repo/api` + `bun run dev --filter @repo/web` snappy and eliminates the “Postgres not running” friction.

## 4. Supabase/Postgres mode

When you add a real connection string:

1. Run `bun run db:migrate` and `bun run db:seed` (curriculum seeds enter the database).
2. Engine automatically swaps to Kysely persistence.
3. Better Auth uses the shared Kysely instance (sessions, sign-in, sign-out).
4. API routes continue to work – they just call through to the same engine functions, which now hit Postgres.

## 5. Contracts & validation

- All schemas live in `packages/schemas`. They generate TypeScript types via `z.infer`.
- Engine, API, and web import the same contracts. Anything that drifts fails at compile-time (or runtime if the shape is wrong at the network boundary).
- `@repo/api-client` validates every response before returning it – its helpers throw `ApiClientError` with `status` + payload when something is off.

## 6. Tooling & linting

| Tool | Purpose |
| --- | --- |
| Biome | Formatting + linting (`bun run lint`). |
| Bun test | Engine tests (`bun test packages/engine`). |
| Turborepo | Task orchestration (`bun run dev`, `bun run typecheck`). |
| Tailwind v4 | Styling in `apps/web`. |
| TanStack Query v5 | Data orchestration in React. |
| Better Auth | Authentication (real DB mode) + demo fallback when DB disabled. |

## 7. Next steps

- Replace generated curriculum text with authored content.
- Extend reporting dashboards to surface the richer metadata (task intent, primary skill, latency metrics).
- Add integration tests that hit the Hono app now that the fallback is deterministic.

Everything is in place for day-one productivity: boot the repo, run the dev servers, and you get the same typed responses the production stack will return once Postgres is wired up.
