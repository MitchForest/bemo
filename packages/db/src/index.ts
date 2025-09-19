import { Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { DB } from "./database-types";

let dbInstance: Kysely<DB> | null = null;
let pgClient: ReturnType<typeof postgres> | null = null;

function assertDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Provide a Supabase/Postgres connection string to enable persistence.",
    );
  }
  return connectionString;
}

function createDb(): Kysely<DB> {
  const connectionString = assertDatabaseUrl();
  pgClient = postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT ?? 30),
    prepare: true,
  });

  return new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: pgClient,
    }),
  });
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb(): Kysely<DB> {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export async function destroyDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
  if (pgClient) {
    await pgClient.end({ timeout: 5 });
    pgClient = null;
  }
}

// Export types
export type { DB } from "./database-types";
export type Database = Kysely<DB>;

// Helper function to set app-level user for RLS
export async function setAppUser(userId: string) {
  const db = getDb();
  await sql`SET LOCAL app.user_id = ${userId}`.execute(db);
}

// Transaction helper with automatic user setting
export async function withAppUser<T>(
  userId: string,
  callback: (trx: Kysely<DB>) => Promise<T>,
): Promise<T> {
  const db = getDb();
  return await db.transaction().execute(async (trx) => {
    await sql`SET LOCAL app.user_id = ${userId}`.execute(trx);
    return await callback(trx);
  });
}
