import { Kysely } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { DB } from "./database-types";

const connectionString = process.env.DATABASE_URL || "";

// Create postgres client for Kysely
const kyselyClient = postgres(connectionString);

// Create Kysely instance with type safety
export const kyselyDb = new Kysely<DB>({
  dialect: new PostgresJSDialect({
    postgres: kyselyClient,
  }),
});

// Helper types for table names
export type TableName = keyof DB;
export type SelectFrom<T extends TableName> = DB[T];
