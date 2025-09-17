# @repo/web

Bemo's web application built with Next.js 15, React 19, and TanStack Query for a fully type-safe frontend experience.

## Overview

This is the main web interface for the Bemo learning platform, featuring:
- Server-side rendering with Next.js App Router
- Type-safe API integration via `@repo/api-client`
- Data orchestration with TanStack Query
- Accessible UI components from Shadcn/Radix
- Tailwind CSS for styling

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI (Radix primitives)
- **Data Fetching**: TanStack Query
- **API Client**: Type-safe Hono client
- **Authentication**: Better Auth client

## Development

```bash
# Run development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Type check
bun run typecheck
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   ├── providers.tsx     # Client providers
│   └── (routes)/         # Feature routes
├── components/            # React components
│   ├── ui/              # Shadcn UI components
│   └── features/        # Feature-specific components
├── lib/                  # Utilities and helpers
│   ├── api/            # API client setup
│   │   ├── client.ts  # Hono client instance
│   │   └── endpoints.ts # Typed API functions
│   └── utils.ts       # Helper functions
└── hooks/               # Custom React hooks
```

## Adding New Features

### 1. Create API Endpoint Helper

```typescript
// lib/api/endpoints.ts
import { createApiClient, handleApiResponse } from "@repo/api-client";
import { StudentResponseSchema, type Student } from "@repo/schemas";

const client = createApiClient();

export async function getStudents(params?: { grade?: string }) {
  const response = await client.api.students.$get({
    query: params,
  });
  
  return handleApiResponse(response, StudentResponseSchema);
}

export async function createStudent(data: Student) {
  const response = await client.api.students.$post({
    json: data,
  });
  
  return handleApiResponse(response, StudentResponseSchema);
}
```

### 2. Create React Query Hooks

```typescript
// hooks/use-students.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, createStudent } from "@/lib/api/endpoints";

export function useStudents(params?: { grade?: string }) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => getStudents(params),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
```

### 3. Use in Components

```typescript
// app/students/page.tsx
"use client";

import { useStudents } from "@/hooks/use-students";

export default function StudentsPage() {
  const { data, isLoading, error } = useStudents();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.data.map(student => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  );
}
```

## Component Patterns

### Server Components (Default)

```typescript
// Fetch data on server
async function StudentList() {
  const students = await getStudents();
  
  return (
    <ul>
      {students.data.map(s => <li key={s.id}>{s.name}</li>)}
    </ul>
  );
}
```

### Client Components (Interactive)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InteractiveForm() {
  const [value, setValue] = useState("");
  // Interactive logic
}
```

## Styling Conventions

### Using Tailwind CSS

```tsx
// Utility-first approach
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold">Title</h2>
</div>
```

### Using cn() Helper

```tsx
import { cn } from "@/lib/utils";

<Button 
  className={cn(
    "default-styles",
    isActive && "active-styles",
    className
  )}
/>
```

## Data Flow

1. **Define schemas** in `@repo/schemas`
2. **Create API endpoints** in `@repo/api`
3. **Add endpoint helpers** in `lib/api/endpoints.ts`
4. **Create React Query hooks** in `hooks/`
5. **Use hooks in components**

This ensures end-to-end type safety from database to UI.

## Authentication

Using Better Auth client:

```typescript
// lib/auth/client.ts
import { createAuthClient } from "@repo/auth/client";

export const auth = createAuthClient();

// In components
import { useSession } from "@repo/auth/react";

export function UserProfile() {
  const { data: session } = useSession();
  
  if (!session) return <LoginButton />;
  
  return <div>Welcome, {session.user.name}</div>;
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

```bash
# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run E2E tests
bun run test:e2e
```

## Best Practices

1. **Use Server Components by default** - Only use "use client" when needed
2. **Colocate related code** - Keep components, hooks, and utilities together
3. **Type everything** - Leverage TypeScript for safety
4. **Use React Query for data** - No manual fetch in useEffect
5. **Follow accessibility guidelines** - Use semantic HTML and ARIA attributes
6. **Optimize images** - Use Next.js Image component
7. **Handle errors gracefully** - Use error boundaries and fallbacks
8. **Keep components small** - Single responsibility principle

## Performance

- **Code splitting** - Automatic with dynamic imports
- **Image optimization** - Next.js Image component
- **Font optimization** - Next.js font loading
- **Prefetching** - Link component prefetches routes
- **Caching** - React Query handles data caching
- **Static generation** - Pages are statically generated when possible

## Deployment

Build and deploy with:

```bash
# Build production bundle
bun run build

# Start production server
bun run start
```

For containerization:

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
RUN bun install --production
CMD ["bun", "run", "start"]
```