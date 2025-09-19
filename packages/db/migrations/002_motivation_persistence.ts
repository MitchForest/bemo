import { type Kysely, sql } from "kysely";

type DB = unknown;

export async function up(db: Kysely<DB>): Promise<void> {
  await db.schema
    .createTable("student_league_memberships")
    .addColumn("student_id", "uuid", (col) =>
      col.primaryKey().references("students.id").onDelete("cascade"),
    )
    .addColumn("league_id", "uuid", (col) => col.notNull())
    .addColumn("squad_id", "uuid")
    .addColumn("joined_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("student_quests")
    .addColumn("student_id", "uuid", (col) =>
      col.primaryKey().references("students.id").onDelete("cascade"),
    )
    .addColumn("quests", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .alterTable("time_back_ledger")
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("time_back_ledger_student_id_idx")
    .on("time_back_ledger")
    .column("student_id")
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropIndex("time_back_ledger_student_id_idx").execute();
  await db.schema.alterTable("time_back_ledger").dropColumn("updated_at").execute();
  await db.schema.dropTable("student_quests").execute();
  await db.schema.dropTable("student_league_memberships").execute();
}
