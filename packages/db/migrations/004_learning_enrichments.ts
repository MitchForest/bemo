import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE asset_type AS ENUM ('audio', 'image', 'video', 'animation', 'document', 'manipulative', 'tts_script', 'interactive', 'other')
  `.execute(db);
  await sql`
    CREATE TYPE lesson_step_kind AS ENUM (
      'coach_prompt',
      'student_action',
      'modeling',
      'manipulative_setup',
      'guided_practice',
      'independent_practice',
      'reflection',
      'celebration',
      'transition'
    )
  `.execute(db);
  await sql`
    CREATE TYPE practice_activity_type AS ENUM (
      'manipulative',
      'game',
      'speed_drill',
      'story_read',
      'movement',
      'breathing',
      'interactive_quiz',
      'custom'
    )
  `.execute(db);
  await sql`
    CREATE TYPE micro_game_genre AS ENUM ('arcade', 'puzzle', 'simulation', 'story', 'creative', 'movement')
  `.execute(db);
  await sql`
    CREATE TYPE reward_type AS ENUM ('badge', 'sticker', 'joy_break', 'time_back', 'unlockable')
  `.execute(db);
  await sql`
    CREATE TYPE modality_type AS ENUM ('voice', 'tap', 'trace', 'type', 'drag')
  `.execute(db);

  await db.schema
    .createTable("assets")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("type", sql`asset_type`, (col) => col.notNull())
    .addColumn("uri", "text", (col) => col.notNull())
    .addColumn("alt_text", "text")
    .addColumn("locale", "text", (col) => col.notNull().defaultTo("en"))
    .addColumn("duration_ms", "integer")
    .addColumn("transcript", "text")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("micro_games")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("genre", sql`micro_game_genre`, (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("domain", sql`domain`)
    .addColumn("engine_hooks", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("io_schema", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("ui", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("micro_games_slug_key", ["slug"])
    .execute();

  await db.schema
    .createTable("practice_activities")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("knowledge_point_id", "uuid", (col) =>
      col.references("knowledge_points.id").onDelete("set null"),
    )
    .addColumn("topic_id", "uuid", (col) => col.references("topics.id").onDelete("set null"))
    .addColumn("type", sql`practice_activity_type`, (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("micro_game_id", "uuid", (col) =>
      col.references("micro_games.id").onDelete("set null"),
    )
    .addColumn("config", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("expected_minutes", "integer")
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .alterTable("lesson_sections")
    .addColumn("step_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("practice_activity_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .execute();

  await db.schema
    .createTable("lesson_steps")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("section_id", "uuid", (col) =>
      col.notNull().references("lesson_sections.id").onDelete("cascade"),
    )
    .addColumn("kind", sql`lesson_step_kind`, (col) => col.notNull())
    .addColumn("title", "text")
    .addColumn("script", "text")
    .addColumn("student_action", "text")
    .addColumn("modality", sql`modality_type`)
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("cues", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("duration_seconds", "integer")
    .addColumn("transition_to", "uuid")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("motivation_tracks")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("target_xp", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("cadence", "text", (col) => col.notNull().defaultTo("daily"))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("motivation_rewards")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("track_id", "uuid", (col) =>
      col.references("motivation_tracks.id").onDelete("cascade"),
    )
    .addColumn("type", sql`reward_type`, (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("threshold", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("icon", "text")
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("check_charts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("icon", "text")
    .addColumn("color", "text")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("check_chart_entries")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("chart_id", "uuid", (col) =>
      col.notNull().references("check_charts.id").onDelete("cascade"),
    )
    .addColumn("sequence", "integer", (col) => col.notNull())
    .addColumn("statement", "text", (col) => col.notNull())
    .addColumn("topic_id", "uuid", (col) => col.references("topics.id").onDelete("set null"))
    .addColumn("knowledge_point_id", "uuid", (col) =>
      col.references("knowledge_points.id").onDelete("set null"),
    )
    .addColumn("badge_id", "uuid", (col) =>
      col.references("motivation_rewards.id").onDelete("set null"),
    )
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();

  await db.schema
    .createTable("joy_breaks")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("duration_seconds", "integer", (col) => col.notNull().defaultTo(120))
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("assets_org_idx").on("assets").column("organization_id").execute();
  await db.schema
    .createIndex("practice_type_idx")
    .on("practice_activities")
    .column("type")
    .execute();
  await db.schema
    .createIndex("lesson_steps_section_idx")
    .on("lesson_steps")
    .column("section_id")
    .execute();
  await db.schema
    .createIndex("check_chart_chart_idx")
    .on("check_chart_entries")
    .column("chart_id")
    .execute();
  await db.schema
    .createIndex("rewards_track_idx")
    .on("motivation_rewards")
    .column("track_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("rewards_track_idx").execute();
  await db.schema.dropIndex("check_chart_chart_idx").execute();
  await db.schema.dropIndex("lesson_steps_section_idx").execute();
  await db.schema.dropIndex("practice_type_idx").execute();
  await db.schema.dropIndex("assets_org_idx").execute();

  await db.schema.dropTable("joy_breaks").execute();
  await db.schema.dropTable("check_chart_entries").execute();
  await db.schema.dropTable("check_charts").execute();
  await db.schema.dropTable("motivation_rewards").execute();
  await db.schema.dropTable("motivation_tracks").execute();
  await db.schema.dropTable("lesson_steps").execute();
  await db.schema
    .alterTable("lesson_sections")
    .dropColumn("step_ids")
    .dropColumn("practice_activity_ids")
    .execute();
  await db.schema.dropTable("practice_activities").execute();
  await db.schema.dropTable("micro_games").execute();
  await db.schema.dropTable("assets").execute();

  await sql`DROP TYPE IF EXISTS modality_type`.execute(db);
  await sql`DROP TYPE IF EXISTS reward_type`.execute(db);
  await sql`DROP TYPE IF EXISTS micro_game_genre`.execute(db);
  await sql`DROP TYPE IF EXISTS practice_activity_type`.execute(db);
  await sql`DROP TYPE IF EXISTS lesson_step_kind`.execute(db);
  await sql`DROP TYPE IF EXISTS asset_type`.execute(db);
}
