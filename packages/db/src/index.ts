import { Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { DB } from "./database-types";

const connectionString = process.env.DATABASE_URL || "";

// Create postgres client
const postgresClient = postgres(connectionString);

// Create Kysely instance with type safety
export const db = new Kysely<DB>({
  dialect: new PostgresJSDialect({
    postgres: postgresClient,
  }),
});

// Export types
export type { DB } from "./database-types";
export type Database = Kysely<DB>;

// Helper function to set app-level user for RLS
export async function setAppUser(userId: string) {
  await sql`SET LOCAL app.user_id = ${userId}`.execute(db);
}

// Transaction helper with automatic user setting
export async function withAppUser<T>(
  userId: string,
  callback: (trx: Kysely<DB>) => Promise<T>,
): Promise<T> {
  return await db.transaction().execute(async (trx) => {
    await sql`SET LOCAL app.user_id = ${userId}`.execute(trx);
    return await callback(trx);
  });
}
