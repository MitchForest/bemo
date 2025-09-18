import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE math_stage_code AS ENUM (
      'M0_FOUNDATIONS',
      'M1_PREK_CORE',
      'M2_PREK_STRETCH',
      'M3_K_CORE',
      'M4_G1_CORE'
    )
  `.execute(db);

  await db.schema.alterTable("topics").addColumn("stage_code", sql`math_stage_code`).execute();

  await db.schema
    .alterTable("check_charts")
    .addColumn("domain", sql`domain`, (col) => col.notNull().defaultTo(sql`'math'::domain`))
    .addColumn("grade_band", sql`grade_band`, (col) =>
      col.notNull().defaultTo(sql`'PreK'::grade_band`),
    )
    .addColumn("stage_code", sql`math_stage_code`)
    .addColumn("display_order", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable("check_chart_entries")
    .addColumn("display_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("topic_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("knowledge_point_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("icon_asset_id", "uuid", (col) => col.references("assets.id").onDelete("set null"))
    .addColumn("coach_only", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("celebration_copy", "text")
    .addColumn("threshold", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();

  await sql`
    UPDATE check_charts SET domain = CASE
      WHEN lower(title) LIKE '%reading%' THEN 'reading'::domain
      ELSE 'math'::domain
    END
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("check_chart_entries")
    .dropColumn("threshold")
    .dropColumn("celebration_copy")
    .dropColumn("coach_only")
    .dropColumn("icon_asset_id")
    .dropColumn("knowledge_point_ids")
    .dropColumn("topic_ids")
    .dropColumn("display_order")
    .execute();

  await db.schema
    .alterTable("check_charts")
    .dropColumn("display_order")
    .dropColumn("stage_code")
    .dropColumn("grade_band")
    .dropColumn("domain")
    .execute();

  await db.schema.alterTable("topics").dropColumn("stage_code").execute();

  await sql`DROP TYPE IF EXISTS math_stage_code`.execute(db);
}
