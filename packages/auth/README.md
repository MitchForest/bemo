# @repo/auth

Authentication wiring for the Bemo monorepo. The package offers a single Better Auth instance that can run in two modes:

- **Database-backed** – when `DATABASE_URL` is present we bootstrap Better Auth against the shared Kysely connection from `@repo/db` and expose the full API surface.
- **Demo stub** – in local/dev environments without a database we return a deterministic demo session so the API and web app keep working without any setup.

## What ships today

- `auth` – the Better Auth instance used by the API. In stub mode it behaves like a logged-in student and responds with a friendly JSON payload explaining that auth is disabled.
- `authEnabled` – boolean flag so callers can branch their behaviour (e.g. hide sign-in forms when running in stub mode).
- `authClient`, `signIn`, `signUp`, `signOut` – thin helpers from `better-auth/client` so client apps can talk to `/api/auth/*`.

There are **no** role-based helpers, permission middleware, or custom tables yet. Add them to the package before documenting them.

## Server usage

```ts
import { auth, authEnabled } from "@repo/auth";

// Mount the handler inside the API (apps/api/src/app.ts)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Check sessions inside routes
const session = await auth.api.getSession({ headers: c.req.raw.headers });
if (!session) {
  return c.json({ error: "Unauthorized" }, 401);
}
```

When running without a database the call above resolves to the demo student (`11111111-1111-4111-8111-111111111111`) so downstream code still exercises the engine.

## Client usage

```ts
import { authClient, signIn, signUp, signOut } from "@repo/auth";

await signIn.email({ email, password });
await signOut();

// You can also access the underlying Better Auth client
const session = await authClient.session.get();
```

The client automatically points to `${NEXT_PUBLIC_API_URL}/api/auth` when the env var is set, otherwise it falls back to relative `/api/auth` paths for local Next.js development.

## Environment

Set these variables when you want persistence:

```env
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8000
AUTH_SECRET=super-secret
```

With `DATABASE_URL` omitted the package switches to demo mode, requires no extra secrets, and never touches Postgres.

## Development checklist

1. Keep schema definitions in `packages/schemas/src/auth.ts` in sync with any new auth responses.
2. When introducing new Better Auth features (roles, providers, etc.), implement them in `src/server.ts` first, then document them here.
3. Verify both modes: run `bun run dev --filter @repo/api` with and without `DATABASE_URL` to ensure the fallback continues to work.

Auth is either fully on or completely stubbed—there is intentionally no partial configuration to avoid confusing consumers.
