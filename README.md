# Bemo

Bemo is a fully type-safe AI-powered adaptive learning platform built in a Bun-powered Turborepo. Every workspace is designed to share contracts, enforce accessibility, and keep the API surface consistent from database to React components.

## Repository Layout

| Path | Description |
| ---- | ----------- |
| `apps/api` | Bun + Hono REST API with Better Auth, OpenAPI documentation, and Kysely-backed handlers. |
| `apps/web` | Next.js 15 application using React 19, Tailwind CSS, Shadcn/Radix primitives, and TanStack Query. |
| `packages/api-client` | Type-safe Hono RPC client with runtime validation helpers. |
| `packages/auth` | Better Auth configuration shared across API and web apps. |
| `packages/curriculum` | Learning curriculum domain logic and business rules. |
| `packages/db` | Postgres access layer (Kysely client, transactions, migrations, RLS). |
| `packages/engine` | Core learning engine with adaptive algorithms and evidence processing. |
| `packages/schemas` | Single source of truth for Zod schemas, TypeScript types, and API contracts. |
| `packages/utils` | Shared utilities and helper functions. |

## Tech Stack at a Glance

- **Runtime & Tooling**: Bun ≥ 1.1, Turborepo, strict TypeScript, Biome formatting/linting.
- **Frontend**: Next.js App Router, Server Components where possible, Tailwind CSS, Shadcn UI abstractions over Radix primitives, TanStack React Query for data orchestration.
- **Backend**: Hono HTTP framework with Zod OpenAPI, Better Auth, PostgreSQL via Kysely (with row-level security).
- **Shared Contracts**: All types and response envelopes come from `@repo/schemas` Zod schemas to guarantee parity between API and UI.

## Development Workflow

```bash
bun install          # install dependencies
cp .env.example .env # configure environment

bun run dev          # run all workspaces (api + web)
bun run build        # build everything
bun run typecheck    # strict TS across the monorepo
bun run lint         # Biome lint/format checks
bun run format       # Auto-fix formatting issues

bun run db:migrate   # apply database migrations
bun run db:codegen   # regenerate Kysely types after schema changes
```

Use Turbo filters to scope commands:

```bash
bun run --filter @repo/api dev
bun run --filter @repo/web typecheck
```

## End-to-End Type Safety

Bemo enforces a single contract for every domain entity through the `packages/schemas` workspace. A new route or mutation should follow this template:

### 1. Define/Extend Schemas
In `packages/schemas`, add or update the Zod schema and export inferred types:

```typescript
// packages/schemas/src/student.ts
export const StudentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  grade: z.enum(['pre-k', 'kindergarten', 'grade-1']),
  // ...
});

export type Student = z.infer<typeof StudentSchema>;

// API response envelope
export const StudentResponseSchema = z.object({
  data: StudentSchema,
  meta: z.object({ /* ... */ }).optional(),
});
```

### 2. Implement API Handler
In `apps/api`, parse input using the shared schema:

```typescript
// apps/api/src/routes/students.ts
import { createRoute } from "@hono/zod-openapi";
import { StudentSchema, StudentResponseSchema } from "@repo/schemas";

const getStudentRoute = createRoute({
  method: "get",
  path: "/api/students/:id",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StudentResponseSchema,
        },
      },
      description: "Student details",
    },
  },
});

app.openapi(getStudentRoute, async (c) => {
  const student = await getStudent(c.req.param("id"));
  return c.json(StudentResponseSchema.parse({ data: student }));
});
```

### 3. Expose Client Helper
In `apps/web/lib/api/endpoints.ts`:

```typescript
import { createApiClient, handleApiResponse } from "@repo/api-client";
import { StudentResponseSchema } from "@repo/schemas";

const client = createApiClient();

export async function getStudent(id: string) {
  const response = await client.api.students[":id"].$get({
    param: { id },
  });
  return handleApiResponse(response, StudentResponseSchema);
}
```

### 4. Use in React with TanStack Query
```typescript
// apps/web/app/students/[id]/page.tsx
import { useQuery } from "@tanstack/react-query";
import { getStudent } from "@/lib/api/endpoints";

export default function StudentPage({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student", params.id],
    queryFn: () => getStudent(params.id),
  });
  
  // TypeScript knows data.data is Student type
}
```

This loop guarantees that if any shape diverges, compilation or runtime parsing fails immediately in both API and UI layers.

## Tooling Primer

- **Kysely**: Type-safe SQL builder for TypeScript. We use it to talk to Postgres without writing raw SQL. Kysely infers return types from column selections.
- **Zod**: Runtime validation on top of TypeScript types. Schemas defined in `@repo/schemas` guard API inputs/outputs and power `z.infer` for static types.
- **Hono + Zod OpenAPI**: Combines Hono's lightweight routing with OpenAPI documentation generation. Routes are self-documenting and type-safe.
- **TanStack React Query**: Data orchestration layer in the React app. Manages caching, loading states, background refetching, and error handling.
- **Shadcn UI & Radix**: Accessible, unstyled primitives wrapped with Tailwind classes for consistent UI.
- **Better Auth**: Authentication solution with built-in session management, social logins, and security best practices.

## Database Conventions

- **Migrations**: Live in `packages/db/migrations`. Use descriptive names with timestamps.
- **Row-Level Security**: All tables should have RLS policies. Use `user_id` and `org_id` for multi-tenant isolation.
- **Type Generation**: After schema changes, run `bun run db:codegen` to regenerate TypeScript types.
- **Transactions**: Wrap related operations in transactions using Kysely's transaction helpers.

## Project Policies

- **No direct fetches**: All API calls go through the typed client in `@repo/api-client`.
- **Schema-first development**: Define Zod schemas before implementing features.
- **React Query only**: No ad-hoc `useEffect` fetchers for data loading.
- **Strict linting/formatting**: Biome enforces consistent code style.
- **Accessibility first**: Use Radix primitives and proper ARIA attributes.
- **Type safety everywhere**: From database queries to API responses to React props.

## Adding a Feature Checklist

1. [ ] Define/update schemas in `@repo/schemas`
2. [ ] Create migrations if needed and regenerate database types
3. [ ] Implement the Hono route with OpenAPI documentation
4. [ ] Add typed endpoint helpers in the web app
5. [ ] Create React Query hooks for data fetching
6. [ ] Build UI components using the hooks
7. [ ] Run `bun run typecheck` and `bun run lint`
8. [ ] Update relevant README sections

## API Documentation

When the API is running, documentation is available at:

- **Swagger UI**: http://localhost:3001/swagger
- **Scalar Reference**: http://localhost:3001/reference  
- **OpenAPI JSON**: http://localhost:3001/openapi.json

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bemo

# Auth
AUTH_SECRET=your-secret-key

# API
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# Development
NODE_ENV=development
```

## Scripts Reference

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Start all apps in development mode |
| `bun run build` | Build all packages and apps |
| `bun run typecheck` | Type check entire monorepo |
| `bun run lint` | Check code style with Biome |
| `bun run format` | Auto-fix code style issues |
| `bun run test` | Run test suites |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:codegen` | Generate TypeScript types from DB |

## Contributing

1. Follow the type-safe development flow outlined above
2. Ensure all checks pass: `bun run typecheck && bun run lint`
3. Write tests for new functionality
4. Update documentation for API changes
5. Keep schemas as the single source of truth