# @repo/db

Postgres database layer with Kysely SQL builder, migrations, and row-level security (RLS) for the Bemo platform.

## Overview

This package provides type-safe database access using Kysely, a TypeScript-first SQL query builder. It includes migration management, automatic type generation, and row-level security for multi-tenant data isolation.

## Key Features

- **Type-Safe Queries**: Kysely provides compile-time SQL type checking
- **Automatic Type Generation**: Database schema types generated from PostgreSQL
- **Migration Management**: Version-controlled schema changes
- **Row-Level Security**: Multi-tenant data isolation with RLS policies
- **Transaction Support**: Safe concurrent operations with ACID guarantees
- **Connection Pooling**: Efficient database connection management

## Architecture

```
src/
├── index.ts           # Main database instance and helpers
├── kysely.ts          # Kysely client configuration  
├── database-types.ts  # Auto-generated TypeScript types
├── migrate.ts         # Migration runner
└── migrations/        # Migration files
    ├── 001_initial_schema.ts
    └── 002_row_level_security.ts
```

## Core Exports

### Database Instance

```typescript
import { db } from "@repo/db";
import type { DB, Database } from "@repo/db";

// Main Kysely instance with full type safety
const students = await db
  .selectFrom("students")
  .where("grade", "=", "K")
  .selectAll()
  .execute();

// Type alias for transaction contexts
type Database = Kysely<DB>;
```

### RLS Helpers

```typescript
import { setAppUser, withAppUser } from "@repo/db";

// Set user context for row-level security
await setAppUser("user-uuid");

// Execute queries with automatic user context
const result = await withAppUser("user-uuid", async (trx) => {
  return await trx
    .selectFrom("students") 
    .where("user_id", "=", "user-uuid") // RLS automatically enforces this
    .selectAll()
    .execute();
});
```

## Usage Patterns

### Basic Queries

```typescript
import { db } from "@repo/db";

// Select with type safety
const students = await db
  .selectFrom("students")
  .select(["id", "name", "grade"])
  .where("grade", "=", "K")
  .execute();
// Type: { id: string; name: string; grade: string; }[]

// Insert with validation
const newStudent = await db
  .insertInto("students")
  .values({
    id: crypto.randomUUID(),
    name: "Emma Smith",
    grade: "K",
    user_id: "parent-uuid",
    created_at: new Date(),
    updated_at: new Date(),
  })
  .returningAll()
  .executeTakeFirstOrThrow();

// Update operations
await db
  .updateTable("students")
  .set({ 
    name: "Emma Johnson",
    updated_at: new Date(),
  })
  .where("id", "=", studentId)
  .execute();

// Complex joins
const studentProgress = await db
  .selectFrom("students")
  .innerJoin("student_topic_states", "students.id", "student_topic_states.student_id")
  .innerJoin("topics", "student_topic_states.topic_id", "topics.id")
  .select([
    "students.name",
    "topics.title",
    "student_topic_states.stability",
    "student_topic_states.strength",
  ])
  .where("students.grade", "=", "K")
  .execute();
```

### Transactions

```typescript
import { db } from "@repo/db";

// Manual transaction management
const result = await db.transaction().execute(async (trx) => {
  // All operations use the same transaction
  const student = await trx
    .insertInto("students")
    .values(studentData)
    .returningAll()
    .executeTakeFirstOrThrow();

  await trx
    .insertInto("student_stats")
    .values({
      student_id: student.id,
      total_xp: 0,
      current_streak: 0,
    })
    .execute();

  return student;
});

// With RLS user context
const secureResult = await withAppUser(userId, async (trx) => {
  // RLS policies automatically applied
  return await trx
    .selectFrom("students")
    .selectAll()
    .execute();
});
```

### Advanced Queries

```typescript
// Aggregations
const stats = await db
  .selectFrom("student_responses")
  .select([
    "student_id",
    db.fn.count("id").as("total_responses"),
    db.fn.countAll().filterWhere("result", "=", "correct").as("correct_count"),
    db.fn.avg("latency_ms").as("avg_latency"),
  ])
  .where("created_at", ">=", startDate)
  .groupBy("student_id")
  .execute();

// Subqueries
const recentlyActive = await db
  .selectFrom("students")
  .selectAll()
  .where("id", "in", (qb) =>
    qb
      .selectFrom("student_responses")
      .select("student_id")
      .where("created_at", ">=", yesterday)
      .distinct()
  )
  .execute();

// Window functions
const rankedTopics = await db
  .selectFrom("student_topic_states")
  .select([
    "topic_id",
    "stability",
    db.fn<number>()
      .over((ob) => ob.partitionBy("student_id").orderBy("stability", "desc"))
      .as("rank"),
  ])
  .execute();
```

## Schema Management

### Migrations

Create new migrations:

```bash
# Generate migration file
bun run migrate:make add_new_table

# Apply migrations
bun run migrate:up
bun run migrate:latest

# Rollback migration  
bun run migrate:down
```

Example migration:

```typescript
// migrations/003_add_assessments.ts
import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("assessments")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("student_id", "uuid", (col) => 
      col.references("students.id").onDelete("cascade").notNull()
    )
    .addColumn("topic_id", "uuid", (col) =>
      col.references("topics.id").onDelete("cascade").notNull()
    )
    .addColumn("score", "decimal(5,4)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => 
      col.defaultTo(db.fn.now()).notNull()
    )
    .execute();

  // Add RLS policy
  await db.schema
    .raw(`
      ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY assessments_user_isolation ON assessments
      USING (student_id IN (
        SELECT id FROM students WHERE user_id = current_setting('app.user_id')::uuid
      ));
    `)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("assessments").execute();
}
```

### Type Generation

After schema changes, regenerate TypeScript types:

```bash
# Regenerate database types from PostgreSQL schema
bun run codegen
```

This updates `src/database-types.ts` with current table definitions:

```typescript
// Auto-generated from database schema
export interface DB {
  students: {
    id: string;
    name: string;
    grade: string;
    user_id: string;
    created_at: Date;
    updated_at: Date;
  };
  topics: {
    id: string;
    title: string;
    domain: "math" | "reading";
    grade_band: "PreK" | "K" | "1";
  };
  // ... other tables
}
```

## Row-Level Security (RLS)

RLS ensures data isolation in multi-tenant scenarios:

### User Context

```typescript
import { setAppUser, withAppUser } from "@repo/db";

// Set user for subsequent queries
await setAppUser(userId);

// Scoped user context (recommended)
await withAppUser(userId, async (trx) => {
  // All queries in this block automatically filtered by user_id
  const myStudents = await trx
    .selectFrom("students")
    .selectAll()
    .execute(); // Only returns students belonging to current user
});
```

### Policy Examples

```sql
-- Students can only see their own records
CREATE POLICY students_user_isolation ON students
USING (user_id = current_setting('app.user_id')::uuid);

-- Coaches can see students they're assigned to
CREATE POLICY students_coach_access ON students
USING (
  user_id = current_setting('app.user_id')::uuid 
  OR current_setting('app.user_id')::uuid = ANY(coach_ids)
);

-- Topic states follow student visibility
CREATE POLICY topic_states_student_access ON student_topic_states
USING (student_id IN (
  SELECT id FROM students WHERE user_id = current_setting('app.user_id')::uuid
));
```

## Performance Optimization

### Query Optimization

```typescript
// Use selective columns
const lightweightStudents = await db
  .selectFrom("students")
  .select(["id", "name", "grade"]) // Only fetch needed columns
  .execute();

// Efficient pagination
const paginatedResults = await db
  .selectFrom("students")
  .selectAll()
  .orderBy("created_at", "desc")
  .limit(20)
  .offset(page * 20)
  .execute();

// Index usage with proper WHERE clauses
const recentResponses = await db
  .selectFrom("student_responses")
  .selectAll()
  .where("created_at", ">=", yesterday) // Uses created_at index
  .where("student_id", "=", studentId)   // Uses student_id index
  .execute();
```

### Connection Pooling

The package automatically handles connection pooling through the postgres client:

```typescript
// Configured in src/index.ts
const postgresClient = postgres(connectionString, {
  max: 20,           // Maximum connections
  idle_timeout: 30,  // Close idle connections after 30s
  connect_timeout: 10, // Connection timeout
});
```

## Testing

### Test Database Setup

```typescript
// test/setup.ts
import { db } from "@repo/db";

beforeEach(async () => {
  // Run in transaction that's rolled back
  await db.transaction().execute(async (trx) => {
    // Test operations
    await trx.insertInto("students").values(testData).execute();
    
    // Automatically rolled back
  });
});
```

### Mocking

```typescript
// Use Kysely's transaction interface for mocking
const mockDb = {
  selectFrom: jest.fn(),
  insertInto: jest.fn(),
  updateTable: jest.fn(),
} as unknown as Database;
```

## Environment Configuration

Required environment variables:

```env
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/bemo_dev

# For testing
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/bemo_test
```

## Scripts Reference

```bash
# Type checking
bun run typecheck

# Build package  
bun run build

# Migration management
bun run migrate:make <name>    # Create new migration
bun run migrate:up             # Apply one migration
bun run migrate:down           # Rollback one migration  
bun run migrate:latest         # Apply all pending migrations

# Type generation
bun run codegen               # Regenerate TypeScript types
```

## Best Practices

1. **Use transactions** for related operations
2. **Set user context** for RLS to work properly
3. **Select specific columns** instead of `selectAll()` when possible
4. **Use proper indexes** for WHERE clauses and JOINs
5. **Validate inputs** with schemas before database operations
6. **Handle errors gracefully** with try/catch blocks
7. **Test with realistic data** to catch performance issues

## Dependencies

- **kysely**: TypeScript-first SQL query builder
- **kysely-postgres-js**: PostgreSQL dialect for Kysely
- **postgres**: High-performance PostgreSQL client
- **kysely-codegen**: Automatic type generation
- **tsx**: TypeScript execution for migrations

This package provides the foundation for all database operations in Bemo, ensuring type safety, security, and performance across the platform.