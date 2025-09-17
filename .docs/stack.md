**Short answer:** Yes—a monorepo is the right choice here. With your stack (Bun + Hono API, Next.js web, Tailwind v4 + shadcn/ui, Zod/OpenAPI, TanStack Query, Supabase DB, Better‑Auth, Biome, Turborepo), you’ll get fast local dev, end‑to‑end type safety, and clean separation of app surfaces from reusable engine/curriculum packages.

Below is a **drop‑in blueprint** (folders, configs, code stubs, and decisions) you can hand to your team to scaffold the repo and start shipping.

---

## 1) Monorepo layout (Turborepo + Bun workspaces)

```
repo/
├─ apps/
│  ├─ web/                  # Next.js (kid UI + coach UI)
│  ├─ api/                  # Hono + Bun API (engine, auth, OpenAPI)
│  └─ ios/                  # SwiftUI app (later; typed client SDK)
├─ packages/
│  ├─ engine/               # Learning engine (scheduler, FIRe-like model)
│  ├─ curriculum/           # Topics, KPs, item templates, seed data
│  ├─ schemas/              # Zod models + OpenAPI metadata
│  ├─ db/                   # Drizzle + Supabase migrations + RLS helpers
│  ├─ auth/                 # Better-Auth server config + client hooks
│  ├─ api-client/           # Generated typed client (hc / OpenAPI)
│  ├─ configs/              # shared tsconfig, biome, tailwind tokens
│  └─ utils/                # shared utilities (id gen, telemetry, etc.)
├─ turbo.json
├─ package.json
├─ tsconfig.base.json
└─ biome.json
```

**Why this shape works**

* **Hono “RPC + OpenAPI”**: Hono has a typed client (`hc`) and first‑class Zod/OpenAPI integrations; serve pretty, live docs with Scalar/Swagger for external SDKs. ([Hono][1])
* **Tailwind v4 + shadcn/ui**: v4 brings new config + utilities and official upgrade tooling; shadcn has documented v4 support. ([Tailwind CSS][2])
* **TanStack Query v5** is the current “React Query,” with stable APIs. ([TanStack][3])
* **Supabase + RLS**: Use Postgres Row‑Level Security; if not using Supabase Auth, set an app‑level session variable per request (defense‑in‑depth). ([Supabase][4])
* **Better‑Auth**: Framework‑agnostic auth that runs in Hono/Next and supports Postgres/Drizzle out of the box. ([Hono][5])
* **Turborepo + Bun**: Turborepo supports workspaces and remote caching; Bun is fine as the package manager/runner. (Note: Bun’s hoisting differs from pnpm; be aware in monorepos.) ([Turborepo][6])

---

## 2) Root config (ready to paste)

**package.json (root)**

```json
{
  "name": "learning-monorepo",
  "private": true,
  "packageManager": "bun@1.1.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "biome check .",
    "format": "biome format . --write",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.6.3",
    "@types/node": "^20.11.30",
    "biome": "^2.1.0"
  }
}
```

**turbo.json**

```json
{
  "globalDependencies": [".env", "tsconfig.base.json"],
  "pipeline": {
    "dev": { "persistent": true, "cache": false },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "typecheck": { "dependsOn": ["^typecheck"], "outputs": [] },
    "lint": { "outputs": [] },
    "test": { "outputs": [".coverage/**"] }
  }
}
```

*Turborepo docs cover pipelines & filtering; remote cache is optional but helpful.* ([Turborepo][7])

**tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@repo/schemas/*": ["packages/schemas/src/*"],
      "@repo/engine/*": ["packages/engine/src/*"],
      "@repo/db/*": ["packages/db/src/*"],
      "@repo/auth/*": ["packages/auth/src/*"],
      "@repo/utils/*": ["packages/utils/src/*"]
    }
  }
}
```

**biome.json (root)**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "formatter": { "enabled": true },
  "linter": { "enabled": true },
  "organizeImports": { "enabled": true },
  "files": { "ignore": ["**/dist/**", "**/.next/**"] }
}
```

*Biome v2 provides fast lint/format and type‑aware rules; keep `tsc` for builds/DTs.* ([Biome][8])

---

## 3) API app (`apps/api`) — Hono + Zod + OpenAPI + Better‑Auth

**Why Hono here**

* Tiny, fast, type‑safe; great OpenAPI & client tooling (`@hono/zod-openapi`, `hono-openapi`, `@hono/swagger-ui`/Scalar). ([Hono][9])

**Dependencies**

```
bun add hono @hono/zod-openapi hono-openapi @hono/swagger-ui @scalar/hono-api-reference
bun add zod @tanstack/query-core # server-side usage if needed
bun add drizzle-orm drizzle-kit pg
bun add better-auth
```

**`apps/api/src/app.ts` (skeleton)**

```ts
import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { auth } from '@repo/auth/server'
import { planRequestSchema, planResponseSchema, evidenceSchema } from '@repo/schemas'
import { getPlan, submitEvidence } from '@repo/engine'

export type AppType = typeof app
const app = new OpenAPIHono()

// Auth routes (Better-Auth)
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

// /plan route
const planRoute = createRoute({
  method: 'get',
  path: '/api/plan',
  request: { query: planRequestSchema.openapi({ example: { max: 5 } }) },
  responses: {
    200: {
      description: 'Next tasks',
      content: { 'application/json': { schema: planResponseSchema } }
    }
  },
  tags: ['Learning']
})
app.openapi(planRoute, async (c) => {
  const user = await auth.api.getSession({ request: c.req.raw }) // typed user
  if (!user?.session) return c.json({ error: 'Unauthorized' }, 401)
  const query = planRequestSchema.parse(Object.fromEntries(new URL(c.req.url).searchParams))
  const data = await getPlan({ studentId: user.session.user.id, ...query })
  return c.json(data)
})

// /evidence route
const evidenceRoute = createRoute({
  method: 'post',
  path: '/api/evidence',
  request: { body: { content: { 'application/json': { schema: evidenceSchema } } } },
  responses: { 200: { description: 'OK' } },
  tags: ['Learning']
})
app.openapi(evidenceRoute, async (c) => {
  const user = await auth.api.getSession({ request: c.req.raw })
  if (!user?.session) return c.json({ error: 'Unauthorized' }, 401)
  const body = evidenceSchema.parse(await c.req.json())
  await submitEvidence(user.session.user.id, body) // updates DB & model
  return c.json({ ok: true })
})

// Serve OpenAPI UI
app.doc('/doc', {
  openapi: '3.1.0',
  info: { title: 'Learning API', version: '1.0.0' }
})
app.get('/swagger', swaggerUI({ url: '/doc' }))
app.get('/reference', Scalar({ url: '/doc', pageTitle: 'Learning API' }))

export default app
```

* **Docs UIs**: you can expose `/swagger` or `/reference` (Scalar) for a beautiful reference. ([Hono][10])

**Typed client for any frontend**

```ts
// packages/api-client/src/index.ts
import type { AppType } from 'apps/api/src/app'
import { hc } from 'hono/client'
export const createClient = (base = process.env.NEXT_PUBLIC_API_URL!) => hc<AppType>(base)
```

*Hono’s `hc` yields end‑to‑end types.* ([Hono][1])

---

## 4) Auth package (`packages/auth`) — Better‑Auth + Drizzle (Supabase DB)

**Server setup** (`packages/auth/src/server.ts`)

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@repo/db'
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  session: { cookie: { secure: true } },
  // add social providers when ready
})
```

* Better‑Auth supports Postgres & Drizzle; Hono example wiring is official. ([Better Auth][11])

**Client hooks** (`packages/auth/src/client.ts`)

```ts
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({ baseURL: '/api/auth' })
```

> **Note on Supabase + Better‑Auth.**
> If you use **Supabase Auth**, RLS “just works” with `auth.uid()` in policies. If you insist on **Better‑Auth** (your preference), do **server‑side DB access** through the API and set an **app session variable** for RLS at the start of each request (`SET LOCAL app.user_id = $1`). See §6 for the exact policy pattern. ([Supabase][4])

---

## 5) Database package (`packages/db`) — Supabase PG + Drizzle + RLS

**Drizzle + Supabase** (official guide) ([Drizzle ORM][12])

* `drizzle.config.ts` points to the Supabase connection string.
* `schema.ts` contains tables (`students`, `topics`, `student_topic_state`, `evidence_events`, …).
* Migrations via `drizzle-kit`.

**RLS pattern when not using Supabase Auth**

* Create custom **GUC** variable `app.user_id` and set it per request/transaction:

  ```sql
  -- In your app transaction
  SET LOCAL app.user_id = '00000000-0000-0000-0000-000000000001';
  ```

* Policies reference `current_setting('app.user_id', true)`:

  ```sql
  ALTER TABLE evidence_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "owner_can_rw" ON evidence_events
  USING (student_id = current_setting('app.user_id', true)::uuid)
  WITH CHECK (student_id = current_setting('app.user_id', true)::uuid);
  ```

  *This pattern is common for app‑managed identities (no PostgREST JWTs required).* ([PostgreSQL][13])

* If you **do** use Supabase Auth later, switch policies to `auth.uid()` and use `@supabase/ssr` in Next 15+. ([Supabase][14])

---

## 6) Shared schemas (`packages/schemas`) — Zod as the single source of truth

**`src/index.ts`**

```ts
import { z } from '@hono/zod-openapi'

export const TaskSchema = z.object({
  task_id: z.string().openapi({ example: "tsk_123" }),
  type: z.enum(['lesson','review','quiz','speed_drill','diagnostic']),
  topic_ids: z.array(z.string()),
  estimated_minutes: z.number().int().min(1),
  xp_value: z.number().int().min(1)
})
export const planRequestSchema = z.object({ max: z.number().int().min(1).max(5).default(3) })
export const planResponseSchema = z.object({ tasks: z.array(TaskSchema) })
export const EvidenceEventSchema = z.object({
  topic_id: z.string(),
  kp_id: z.string().optional(),
  item_id: z.string(),
  result: z.enum(['correct','incorrect','partial','skipped']),
  latency_ms: z.number().int().nonnegative(),
  hints_used: z.number().int().nonnegative().default(0)
})
export const evidenceSchema = z.object({ task_id: z.string(), events: z.array(EvidenceEventSchema) })
export type Task = z.infer<typeof TaskSchema>
```

* Using `@hono/zod-openapi` lets you validate & auto‑generate OpenAPI. ([Hono][9])

---

## 7) The learning engine (`packages/engine`) — schedule + update

**`src/index.ts` (API surface)**

```ts
import type { Task } from '@repo/schemas'
import { pickCompressedReviews, pickFrontierLessons, scoreTasks } from './selector'
import { updateMemoryFromEvidence } from './model'

export async function getPlan({ studentId, max = 3 }: { studentId: string; max?: number }) {
  const due = await loadDueTopics(studentId)
  const compressed = pickCompressedReviews(due)      // greedy cover on encompassing edges
  const frontier = await pickFrontierLessons(studentId)
  const ranked = scoreTasks([...compressed, ...frontier]).slice(0, max)
  return { tasks: ranked satisfies Task[] }
}

export async function submitEvidence(studentId: string, payload: any) {
  await updateMemoryFromEvidence(studentId, payload) // updates StudentTopicState + due_at
}
```

This package is **framework‑agnostic**; it touches DB only through `packages/db` helpers.

---

## 8) Web app (`apps/web`) — Next + Tailwind v4 + shadcn/ui + TanStack Query

**Dependencies**

```
bun add next @tanstack/react-query
bun add tailwindcss @tailwindcss/postcss @tailwindcss/cli
bun add clsx tailwind-merge
bun add shadcn-ui # use current docs for v4-compatible init
```

* **Tailwind v4 upgrade tool** exists and uses new CSS‑first config; shadcn has a v4 migration guide and templates. ([Tailwind CSS][2])

**`app/providers.tsx`**

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { authClient } from '@repo/auth/client'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient())
  // authClient can expose hooks or you can wrap it here
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

*TanStack Query v5 install/docs.* ([TanStack][3])

**Fetching typed `/plan`**

```tsx
import { createClient } from '@repo/api-client'
import { useQuery } from '@tanstack/react-query'

export function TodayPlan() {
  const api = createClient(process.env.NEXT_PUBLIC_API_URL)
  const { data, isLoading } = useQuery({
    queryKey: ['plan'],
    queryFn: async () => (await api.api.plan.$get()).json()
  })
  if (isLoading) return <div>Loading…</div>
  return (
    <div className="space-y-3">
      {data?.tasks?.map(t => (
        <div key={t.task_id} className="rounded border p-4">
          <div className="text-lg font-semibold">{t.type}</div>
          <div className="text-sm opacity-70">{t.estimated_minutes} min · {t.xp_value} XP</div>
        </div>
      ))}
    </div>
  )
}
```

**Tailwind v4 setup (CSS‑first)**

* Use the **upgrade tool** or new CLI; v4 changes `@tailwind` directives and utilities—follow the official guide. ([Tailwind CSS][2])

---

## 9) iPad app (`apps/ios`) — SwiftUI with typed client

* Generate a **TypeScript→OpenAPI→Swift** SDK (via the `/doc` spec) or consume the Hono `hc` spec to generate OpenAPI, then Swift client. (Hono docs + Speakeasy/Scalar can help with SDK generation.) ([Speakeasy][15])
* Keep game UIs local; call `/plan` & `/evidence`.

---

## 10) Auth + RLS decision tree (practical)

**Option A (simplest with RLS):** Use **Supabase Auth** for first release; Next.js uses `@supabase/ssr`, policies use `auth.uid()`. ([Supabase][14])

**Option B (your preference, Better‑Auth):**

1. All DB access from clients goes **through the API** (no direct Supabase client in browser).
2. At the start of each request/transaction, API sets:

   ```sql
   SET LOCAL app.user_id = $1;
   ```
3. RLS policies use `current_setting('app.user_id', true)` for `USING/WITH CHECK`. ([Database Administrators Stack Exchange][16])

This gives you Better‑Auth’s DX while keeping **defense‑in‑depth** at the DB layer (RLS). Supabase RLS docs explain concepts; the custom GUC pattern is standard Postgres. ([Supabase][17])

---

## 11) Dev & CI quality bar

* **Pre‑commit**: `biome check --apply`
* **CI steps**: `turbo run typecheck lint build test` with remote cache.
* **Preview**: Deploy `apps/web` to Vercel; `apps/api` to your Bun runtime host (Railway/Fly/CF Workers; Hono supports many targets).
* **Docs**: Expose `/reference` (Scalar) + `/doc` (OpenAPI JSON) from API for partners. ([Hono][18])

---

## 12) Gotchas & tips

* **Bun in monorepos**: Node resolution/hoisting differs from pnpm; keep shared deps declared at the right layers; prefer explicit `dependencies` in packages to avoid invisible root hoists. ([Reddit][19])
* **Tailwind v4**: Some utilities were renamed and config moved; run the **upgrade tool** and review changes (e.g., gradient utilities, shadow scales). ([Tailwind CSS][2])
* **TanStack Query**: Name is “TanStack Query v5,” not “React Query” in package names (`@tanstack/react-query`). ([Npm][20])
* **Better‑Auth + Drizzle**: Ensure UUID types match Postgres (`uuid`); if you see non‑standard IDs, configure the adapter to use UUID v4. (Community threads note this footgun.) ([Stack Overflow][21])

---

## 13) What to build in each package (first 2 sprints)

**`packages/engine`**

* Implement: stability/strength updates; implicit credit via “encompassing”; review compression (greedy set cover); simple interference cooldown.
* Public API: `getPlan()`, `submitEvidence()`, `runDiagnosticProbe()`.

**`packages/curriculum`**

* Seed: 50 Topics/subject with 2–3 KPs each; include **random‑start** counting/alphabet items; **speech** and **tracing** item kinds; speed‑drill decks for facts/HFW.

**`packages/schemas`**

* Finalize Zod models for: Topic, KP, Item, Task, EvidenceEvent, StudentTopicState.

**`packages/db`**

* Drizzle schema; migrations; **RLS policies** (Option A or B); helper to `SET LOCAL app.user_id` per request.

**`apps/api`**

* Routes: `/plan`, `/evidence`, `/diagnostic/*`; `/doc`, `/swagger`, `/reference`; Better‑Auth handler.

**`apps/web`**

* Kid “Today” screen (3 cards); big buttons; TTS; mic and tracing prototypes; TanStack Query wiring; coach dashboard MVP.

---

## 14) Quick start (commands)

```bash
# 0) bootstrap
bun install

# 1) dev all apps
bun run dev

# 2) build everything
bun run build

# 3) lint & types
bun run lint
bun run typecheck
```

---

## 15) References you’ll care about

* **Hono RPC & OpenAPI** (typed client `hc`, Zod/OpenAPI examples, Swagger/Scalar): ([Hono][1])
* **Tailwind v4** (upgrade tool, breaking changes); **shadcn/ui v4 notes**: ([Tailwind CSS][2])
* **TanStack Query v5** (install/docs): ([TanStack][3])
* **Supabase RLS** (Postgres policies) + **custom GUC variable pattern** for app‑level auth: ([Supabase][4])
* **Better‑Auth** (installation, Drizzle adapter, Hono integration): ([Better Auth][22])

---

### TL;DR recommendation

* **Yes** to monorepo with **Turbo** and **Bun**.
* **Hono API** with **Zod/OpenAPI** + **Scalar** docs; **hc** gives you typed clients everywhere.
* **Next** web app with **Tailwind v4** + **shadcn/ui**; use **TanStack Query**.
* **Supabase DB** + **Drizzle**; **RLS** via either **Supabase Auth** (simplest) or **Better‑Auth + `SET LOCAL app.user_id`** (your preference).
* Put **engine, schemas, curriculum** in shared packages so your iPad and web apps can consume the **same, type‑safe** contracts.

If you want, I can supply a **repo starter zip** with these files laid out (including a working `/plan` endpoint and a Next page that renders the three cards).

[1]: https://hono.dev/docs/guides/rpc?utm_source=chatgpt.com "RPC"
[2]: https://tailwindcss.com/docs/upgrade-guide "Upgrade guide - Getting started - Tailwind CSS"
[3]: https://tanstack.com/query/v5/docs/react/installation?utm_source=chatgpt.com "Installation | TanStack Query React Docs"
[4]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[5]: https://hono.dev/examples/better-auth "Better Auth - Hono"
[6]: https://turborepo.com/docs/crafting-your-repository/structuring-a-repository?utm_source=chatgpt.com "Structuring a repository"
[7]: https://turborepo.com/docs/reference/configuration?utm_source=chatgpt.com "Configuring turbo.json"
[8]: https://biomejs.dev/blog/biome-v2/?utm_source=chatgpt.com "Biome v2—codename: Biotype"
[9]: https://hono.dev/examples/zod-openapi?utm_source=chatgpt.com "Zod OpenAPI"
[10]: https://hono.dev/examples/swagger-ui?utm_source=chatgpt.com "Swagger UI"
[11]: https://www.better-auth.com/docs/adapters/drizzle?utm_source=chatgpt.com "Drizzle ORM Adapter"
[12]: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase?utm_source=chatgpt.com "Drizzle with Supabase Database"
[13]: https://www.postgresql.org/docs/current/functions-admin.html?utm_source=chatgpt.com "17: 9.28. System Administration Functions - PostgreSQL"
[14]: https://supabase.com/docs/guides/auth/auth-helpers/nextjs?utm_source=chatgpt.com "Supabase Auth with the Next.js App Router"
[15]: https://www.speakeasy.com/openapi/frameworks/hono?utm_source=chatgpt.com "How To Generate an OpenAPI Document With Hono"
[16]: https://dba.stackexchange.com/questions/162731/row-level-security-with-a-single-db-user-and-connection-pooling?utm_source=chatgpt.com "Row level security with a single DB user and connection pooling"
[17]: https://supabase.com/features/row-level-security?utm_source=chatgpt.com "Authorization via Row Level Security | Supabase Features"
[18]: https://hono.dev/examples/scalar "Scalar - Hono"
[19]: https://www.reddit.com/r/bun/comments/1jmybuu/in_monorepos_how_do_you_deal_with_the_issues_with/?utm_source=chatgpt.com "In monorepos, how do you deal with the issues ..."
[20]: https://www.npmjs.com/package/%40tanstack/react-query?utm_source=chatgpt.com "tanstack/react-query"
[21]: https://stackoverflow.com/questions/79220373/how-to-configure-better-auths-drizzleadapter-to-generate-supabase-compatible-uu?utm_source=chatgpt.com "How to configure Better Auth's DrizzleAdapter to generate ..."
[22]: https://www.better-auth.com/docs/installation?utm_source=chatgpt.com "Installation"
