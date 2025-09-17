# @repo/schemas

Single source of truth for Zod schemas and TypeScript types across the Bemo platform, ensuring end-to-end type safety from database to UI.

## Overview

This package defines all shared data schemas using Zod, providing both runtime validation and compile-time TypeScript types. Every domain entity in Bemo flows through these schemas to guarantee consistent contracts between API endpoints, database operations, and React components.

## Key Features

- **Runtime Validation**: Zod schemas validate data at API boundaries
- **Type Inference**: Automatic TypeScript type generation with `z.infer`
- **OpenAPI Integration**: Schema annotations for automatic API documentation
- **Centralized Contracts**: Single definition prevents drift between services
- **Composable Schemas**: Shared building blocks for complex types

## Domain Schemas

### Common Types (`common.ts`)

Foundational enums and types used across domains:

```typescript
import { DomainSchema, GradeBandSchema, ItemTypeSchema } from "@repo/schemas";

// Learning domains
type Domain = "math" | "reading";

// Educational levels  
type GradeBand = "PreK" | "K" | "1";

// Assessment item types
type ItemType = "choice_text" | "choice_image" | "drag_drop" | "tap_to_count" | ...;

// Student response outcomes
type Result = "correct" | "incorrect" | "partial" | "skipped";
```

### Student Schemas (`student.ts`)

Student profiles, learning states, and progress tracking:

```typescript
import { StudentProfileSchema, StudentTopicStateSchema } from "@repo/schemas";

// Student profile with settings and motivation
const student = StudentProfileSchema.parse({
  id: "uuid",
  name: "Emma Smith", 
  grade: "K",
  motivationProfile: {
    preferMastery: true,
    preferCompetition: false,
  },
  settings: {
    dailyXpGoal: 30,
    soundEnabled: true,
  }
});

// Memory state for spaced repetition
const topicState = StudentTopicStateSchema.parse({
  studentId: "uuid",
  topicId: "uuid", 
  stability: 1.5,      // Memory half-life proxy
  strength: 0.8,       // Current confidence
  repNum: 5,           // Repetition count
  dueAt: "2024-01-15T00:00:00Z",
});
```

### Curriculum Schemas (`curriculum.ts`)

Learning topics, knowledge points, and assessment items:

```typescript
import { TopicSchema, KnowledgePointSchema, ItemSchema } from "@repo/schemas";

// Learning topic with prerequisites
const topic = TopicSchema.parse({
  id: "uuid",
  title: "Decode CVC words with short a",
  domain: "reading",
  strand: "Phonics", 
  gradeBand: "K",
  prerequisites: [
    { topicId: "uuid", gate: "AND" }
  ],
  expectedTimeSeconds: 240,
});

// Specific learning objective
const knowledgePoint = KnowledgePointSchema.parse({
  id: "uuid",
  topicId: "uuid",
  objective: "Blend and read -at words",
  workedExample: ["Sound out c-a-t", "Blend to say cat"],
  reteachSnippet: "Stretch sounds with blocks",
});

// Assessment item with rubric
const item = ItemSchema.parse({
  id: "uuid",
  knowledgePointId: "uuid",
  type: "choice_text",
  prompt: { text: 'Which word is "cat"?' },
  rubric: { type: "exact" },
  difficulty: 2,
});
```

### Task Schemas (`task.ts`)

Learning tasks and planning requests:

```typescript
import { TaskSchema, PlanRequestSchema } from "@repo/schemas";

// Learning task assigned to student
const task = TaskSchema.parse({
  id: "uuid",
  type: "lesson",
  topicIds: ["uuid"],
  estimatedMinutes: 5,
  xpValue: 20,
  modalities: ["tap", "voice"],
  reason: "frontier",
});

// Request for task planning
const planRequest = PlanRequestSchema.parse({
  studentId: "uuid",
  max: 5,
  includeSpeedDrills: true,
});
```

### Evidence Schemas (`evidence.ts`)

Student responses and learning evidence:

```typescript
import { EvidenceSchema, StudentResponseSchema } from "@repo/schemas";

// Student's response to an item
const response = StudentResponseSchema.parse({
  id: "uuid",
  studentId: "uuid", 
  itemId: "uuid",
  response: "cat",
  result: "correct",
  latencyMs: 2340,
  sessionId: "uuid",
});
```

### Authentication Schemas (`auth.ts`)

User accounts and session management:

```typescript
import { UserSchema, SessionSchema } from "@repo/schemas";

// User account
const user = UserSchema.parse({
  id: "uuid",
  email: "parent@example.com",
  role: "parent",
  profileId: "uuid",
});
```

## Usage Patterns

### 1. API Route Definition

```typescript
// apps/api/src/routes/students.ts
import { createRoute } from "@hono/zod-openapi";
import { StudentProfileSchema } from "@repo/schemas";

const getStudentRoute = createRoute({
  method: "get",
  path: "/api/students/:id",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: StudentProfileSchema,
        },
      },
    },
  },
});

app.openapi(getStudentRoute, async (c) => {
  const student = await getStudent(c.req.param("id"));
  // Runtime validation ensures type safety
  return c.json(StudentProfileSchema.parse(student));
});
```

### 2. Database Operations

```typescript
// Type-safe database insertions
import { db } from "@repo/db";
import { StudentProfileSchema, type StudentProfile } from "@repo/schemas";

async function createStudent(data: StudentProfile) {
  // Validate input
  const validated = StudentProfileSchema.parse(data);
  
  // Insert with type safety
  return await db
    .insertInto("students")
    .values(validated)
    .returningAll()
    .executeTakeFirstOrThrow();
}
```

### 3. Client-Side Validation

```typescript
// apps/web/components/StudentForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StudentProfileSchema } from "@repo/schemas";

export function StudentForm() {
  const form = useForm({
    resolver: zodResolver(StudentProfileSchema),
  });
  
  // Form is automatically validated against schema
}
```

### 4. API Client Helpers

```typescript
// apps/web/lib/api/students.ts
import { createApiClient, handleApiResponse } from "@repo/api-client";
import { StudentProfileSchema } from "@repo/schemas";

const client = createApiClient();

export async function getStudent(id: string) {
  const response = await client.api.students[":id"].$get({
    param: { id },
  });
  
  // Response is validated against schema
  return handleApiResponse(response, StudentProfileSchema);
}
```

## Schema Composition

Schemas are designed for composition and reuse:

```typescript
// Base response envelope
const ResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  meta: z.object({
    total: z.number().optional(),
    page: z.number().optional(),
  }).optional(),
});

// Paginated student list
const StudentsResponseSchema = ResponseSchema(z.array(StudentProfileSchema));
```

## OpenAPI Integration

All schemas include OpenAPI metadata for automatic documentation:

```typescript
export const StudentProfileSchema = z
  .object({
    name: z.string().min(1).max(100),
    grade: z.string(),
  })
  .openapi({
    description: "Student profile",
    example: {
      name: "Emma Smith",
      grade: "K",
    },
  });
```

## Development Workflow

### Adding New Schemas

1. **Define the schema** with Zod and OpenAPI annotations:

```typescript
// src/newDomain.ts
export const NewEntitySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
  })
  .openapi({
    description: "New entity",
    example: { id: "uuid", name: "Example" },
  });

export type NewEntity = z.infer<typeof NewEntitySchema>;
```

2. **Export from index**:

```typescript
// src/index.ts
export * from "./newDomain";
```

3. **Use across the application**:

```typescript
// API routes use for validation
app.openapi(route, (c) => c.json(NewEntitySchema.parse(data)));

// Database operations use for type safety
await db.insertInto("table").values(validated);

// React components use for forms
const form = useForm({ resolver: zodResolver(NewEntitySchema) });
```

### Schema Evolution

When updating schemas:

1. **Update the Zod definition**
2. **Run type checking**: `bun run typecheck`
3. **Update database migrations** if needed
4. **Test API endpoints** for validation
5. **Update component types** automatically flow through

## Type Safety Guarantees

This package ensures:

- **API contracts** match exactly between client and server
- **Database types** align with application logic
- **Form validation** uses the same rules as API validation
- **Runtime errors** catch type mismatches early
- **Refactoring safety** prevents breaking changes

## Best Practices

1. **Schema-first development**: Define schemas before implementation
2. **Comprehensive validation**: Include all constraints in schemas
3. **Meaningful errors**: Use descriptive validation messages
4. **Composition over duplication**: Reuse common patterns
5. **OpenAPI documentation**: Include examples and descriptions
6. **Type inference**: Let TypeScript infer types from schemas

## Scripts

```bash
# Type check schemas
bun run typecheck

# Build package
bun run build
```

## Dependencies

- **zod**: Runtime validation and type inference
- **@hono/zod-openapi**: OpenAPI integration for Hono routes

This package is the foundation of Bemo's type safety, ensuring data integrity and developer confidence across the entire platform.