# @repo/api

Bemo's REST API built with Hono, Better Auth, and Zod OpenAPI for complete type safety and auto-generated documentation.

## Overview

This API serves as the backend for the Bemo learning platform, providing:
- RESTful endpoints with OpenAPI documentation
- Authentication via Better Auth
- Type-safe database access via Kysely
- Runtime validation with Zod schemas
- Automatic API documentation generation

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono with Zod OpenAPI
- **Authentication**: Better Auth
- **Database**: PostgreSQL via Kysely
- **Validation**: Zod schemas from `@repo/schemas`
- **Documentation**: Swagger UI & Scalar

## Development

```bash
# Run in development mode with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type check
bun run typecheck
```

## API Documentation

When running, documentation is available at:
- **Swagger UI**: http://localhost:3001/swagger
- **Scalar Docs**: http://localhost:3001/reference
- **OpenAPI JSON**: http://localhost:3001/openapi.json

## Project Structure

```
src/
├── index.ts           # Server entry point
├── app.ts            # Hono app configuration
├── openapi.ts        # OpenAPI setup
├── types.ts          # TypeScript types
├── middleware/       # Custom middleware
│   ├── auth.ts      # Authentication middleware
│   └── rls.ts       # Row-level security context
├── routes/          # API route handlers
│   ├── auth.ts     # Auth endpoints
│   ├── students.ts # Student management
│   ├── plan.ts     # Learning plans
│   └── evidence.ts # Evidence submission
└── services/        # Business logic
    └── ...
```

## Adding New Routes

### 1. Define the OpenAPI Route

```typescript
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { StudentSchema, StudentResponseSchema } from "@repo/schemas";

export const createStudentRoute = createRoute({
  method: "post",
  path: "/api/students",
  tags: ["Students"],
  summary: "Create a new student",
  request: {
    body: {
      content: {
        "application/json": {
          schema: StudentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: StudentResponseSchema,
        },
      },
      description: "Student created successfully",
    },
    400: {
      description: "Invalid request",
    },
  },
});
```

### 2. Implement the Handler

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { withDbContext } from "@/middleware/rls";

const app = new OpenAPIHono();

app.openapi(createStudentRoute, async (c) => {
  const data = c.req.valid("json");
  
  const student = await withDbContext(
    { userId: c.get("userId") },
    async (trx) => {
      // Database operations with RLS context
      return await createStudent(trx, data);
    }
  );

  return c.json(
    StudentResponseSchema.parse({
      data: student,
      meta: { created: new Date().toISOString() },
    }),
    201
  );
});
```

### 3. Register in Main App

```typescript
// app.ts
import studentRoutes from "./routes/students";

app.route("/", studentRoutes);
```

## Middleware

### Authentication
All protected routes automatically verify JWT tokens:

```typescript
app.use("/api/*", authMiddleware);
```

### Row-Level Security Context
Database operations should use the RLS context helper:

```typescript
await withDbContext(
  { userId, orgId },
  async (trx) => {
    // Operations run with RLS context
  }
);
```

## Error Handling

Errors are automatically formatted as:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Environment Variables

Required environment variables:

```env
PORT=3001
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_URL=http://localhost:3001
```

## Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

## Best Practices

1. **Always use schemas from `@repo/schemas`** for validation
2. **Wrap database operations** in `withDbContext` for RLS
3. **Document all routes** with OpenAPI specifications
4. **Return consistent response envelopes** with `data` and optional `meta`
5. **Handle errors gracefully** with proper HTTP status codes
6. **Use middleware** for cross-cutting concerns
7. **Keep business logic** in service layers, not route handlers

## Security

- JWT-based authentication via Better Auth
- Row-level security enforced at database level
- Input validation with Zod schemas
- Rate limiting on sensitive endpoints
- CORS configuration for frontend origin

## Deployment

The API is designed to run on Bun runtime:

```bash
# Build production bundle
bun run build

# Run production server
bun run dist/index.js
```

For containerization:

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
CMD ["bun", "run", "dist/index.js"]
```