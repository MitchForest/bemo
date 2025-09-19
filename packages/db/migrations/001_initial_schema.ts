import { type Kysely, sql } from "kysely";

type DB = unknown;

export async function up(db: Kysely<DB>): Promise<void> {
  // Enums
  await sql`CREATE TYPE user_role AS ENUM ('student', 'parent', 'coach', 'admin')`.execute(db);
  await sql`CREATE TYPE domain AS ENUM ('math', 'reading')`.execute(db);
  await sql`CREATE TYPE grade_band AS ENUM ('PreK', 'K', '1', '2')`.execute(db);
  await sql`CREATE TYPE task_type AS ENUM ('lesson', 'review', 'quiz', 'speed_drill', 'diagnostic', 'multistep')`.execute(
    db,
  );
  await sql`CREATE TYPE result AS ENUM ('correct', 'incorrect', 'partial', 'skipped')`.execute(db);
  await sql`CREATE TYPE item_type AS ENUM ('choice_image', 'choice_text', 'choice_audio', 'drag_drop', 'tap_to_count', 'speak', 'record_audio', 'trace_path', 'short_answer', 'timer_speed_drill', 'phrase_reading', 'comprehension_choice')`.execute(
    db,
  );
  await sql`CREATE TYPE skill_stage_code AS ENUM ('M0_FOUNDATIONS','M1_PREK_CORE','M2_PREK_STRETCH','M3_K_CORE','M4_G1_CORE','M5_G2_EXTENSION','R0_FOUNDATIONS','R1_PREK_CORE','R2_K_PHONICS','R3_K_AUTOMATIC','R4_G1_CORE','R5_G2_EXTENSION')`.execute(
    db,
  );
  await sql`CREATE TYPE prereq_gate AS ENUM ('AND', 'OR')`.execute(db);
  await sql`CREATE TYPE motivation_reward_type AS ENUM ('sticker', 'badge', 'joy_break', 'time_back', 'unlockable')`.execute(
    db,
  );
  await sql`CREATE TYPE cadence AS ENUM ('daily', 'weekly', 'monthly')`.execute(db);

  // Organizations
  await db.schema
    .createTable("organizations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull().unique())
    .addColumn("type", "text", (col) => col.notNull().defaultTo("microschool"))
    .addColumn("settings", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Users & auth tables
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("role", sql`user_role`, (col) => col.notNull().defaultTo("parent"))
    .addColumn("profile_id", "uuid")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("accounts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("provider", "text", (col) => col.notNull())
    .addColumn("provider_account_id", "text", (col) => col.notNull())
    .addColumn("refresh_token", "text")
    .addColumn("access_token", "text")
    .addColumn("expires_at", "timestamp")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Students
  await db.schema
    .createTable("students")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.references("users.id").onDelete("cascade"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("grade", sql`grade_band`, (col) => col.notNull().defaultTo("K"))
    .addColumn("birth_date", "date")
    .addColumn("motivation_profile", "jsonb", (col) =>
      col
        .notNull()
        .defaultTo(
          sql`'{"preferCompetition": false, "preferMastery": true, "preferSocial": false}'::jsonb`,
        ),
    )
    .addColumn("settings", "jsonb", (col) =>
      col
        .notNull()
        .defaultTo(
          sql`'{"dailyXpGoal": 80, "weeklyXpGoal": 150, "soundEnabled": true, "musicEnabled": true}'::jsonb`,
        ),
    )
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("parent_students")
    .addColumn("parent_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addPrimaryKeyConstraint("parent_students_pkey", ["parent_id", "student_id"])
    .execute();

  // Curriculum references
  await db.schema
    .createTable("subjects")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("domain", sql`domain`, (col) => col.notNull())
    .addColumn("color", "text")
    .addColumn("icon", "text")
    .addColumn("description", "text")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("courses")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("subject_id", "uuid", (col) =>
      col.notNull().references("subjects.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("grade_band", sql`grade_band`)
    .addColumn("summary", "text")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("lessons")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("course_id", "uuid", (col) =>
      col.notNull().references("courses.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("skill_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("summary", "text")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("skills")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("domain", sql`domain`, (col) => col.notNull())
    .addColumn("strand", "text", (col) => col.notNull())
    .addColumn("grade_band", sql`grade_band`, (col) => col.notNull())
    .addColumn("stage_code", sql`skill_stage_code`)
    .addColumn("description", "text")
    .addColumn("subject_id", "uuid", (col) => col.references("subjects.id").onDelete("set null"))
    .addColumn("course_id", "uuid", (col) => col.references("courses.id").onDelete("set null"))
    .addColumn("lesson_id", "uuid", (col) => col.references("lessons.id").onDelete("set null"))
    .addColumn("interference_group", "text")
    .addColumn("expected_time_seconds", "integer", (col) => col.notNull().defaultTo(180))
    .addColumn("check_chart_tags", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("assets", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("skill_prerequisites")
    .addColumn("skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("prerequisite_skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("gate", sql`prereq_gate`, (col) => col.notNull().defaultTo("AND"))
    .addPrimaryKeyConstraint("skill_prerequisites_pkey", ["skill_id", "prerequisite_skill_id"])
    .execute();

  await db.schema
    .createTable("skill_encompassing")
    .addColumn("child_skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("parent_skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("weight", "numeric", (col) => col.notNull().defaultTo(0.0))
    .addPrimaryKeyConstraint("skill_encompassing_pkey", ["child_skill_id", "parent_skill_id"])
    .execute();

  await db.schema
    .createTable("skill_task_templates")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("intent", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("xp_award", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("estimated_minutes", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("modalities", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("sensory_tags", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("definition", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  // Student skill states + stats
  await db.schema
    .createTable("student_skill_states")
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("stability", "numeric", (col) => col.notNull().defaultTo(0.6))
    .addColumn("strength", "numeric", (col) => col.notNull().defaultTo(0.3))
    .addColumn("rep_num", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("due_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("last_seen_at", "timestamp")
    .addColumn("avg_latency_ms", "integer")
    .addColumn("speed_factor", "numeric", (col) => col.notNull().defaultTo(1))
    .addColumn("struggling_flag", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("overdue_days", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("easiness", "numeric")
    .addColumn("task_template_tallies", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("retention_probability_365", "numeric", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("student_skill_states_pkey", ["student_id", "skill_id"])
    .execute();

  await db.schema
    .createTable("student_stats")
    .addColumn("student_id", "uuid", (col) =>
      col.primaryKey().references("students.id").onDelete("cascade"),
    )
    .addColumn("total_xp", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("current_streak", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("longest_streak", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("total_minutes", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("skills_completed", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("speed_drills_completed", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("last_active_at", "timestamp")
    .addColumn("weekly_xp", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("evidence_events")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("task_id", "uuid", (col) => col.notNull())
    .addColumn("result", sql`result`, (col) => col.notNull())
    .addColumn("latency_ms", "integer")
    .addColumn("hints_used", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("occurred_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("skill_metrics")
    .addColumn("skill_id", "uuid", (col) =>
      col.notNull().references("skills.id").onDelete("cascade"),
    )
    .addColumn("segment_kind", "text", (col) => col.notNull().defaultTo("overall"))
    .addColumn("segment_value", "text", (col) => col.notNull().defaultTo("overall"))
    .addColumn("sample_count", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("accuracy_sum", "numeric", (col) => col.notNull().defaultTo(0))
    .addColumn("accuracy_sq_sum", "numeric", (col) => col.notNull().defaultTo(0))
    .addColumn("latency_sum", "numeric", (col) => col.notNull().defaultTo(0))
    .addColumn("latency_sq_sum", "numeric", (col) => col.notNull().defaultTo(0))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("skill_metrics_pkey", ["skill_id", "segment_kind", "segment_value"])
    .execute();

  // Content tables
  await db.schema
    .createTable("assets")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
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
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("genre", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("domain", sql`domain`)
    .addColumn("engine_hooks", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("io_schema", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("ui", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("modalities", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("sensory_tags", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("purposes", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("difficulty_band", "text")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("practice_activities")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("skill_id", "uuid", (col) => col.references("skills.id").onDelete("set null"))
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("micro_game_id", "uuid", (col) =>
      col.references("micro_games.id").onDelete("set null"),
    )
    .addColumn("config", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("expected_minutes", "integer")
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("modalities", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("sensory_tags", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("purposes", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("difficulty_band", "text")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("check_charts")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("domain", sql`domain`, (col) => col.notNull())
    .addColumn("grade_band", sql`grade_band`, (col) => col.notNull())
    .addColumn("stage_code", sql`skill_stage_code`)
    .addColumn("icon", "text")
    .addColumn("color", "text")
    .addColumn("display_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("check_chart_entries")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("chart_id", "uuid", (col) =>
      col.notNull().references("check_charts.id").onDelete("cascade"),
    )
    .addColumn("label", "text", (col) => col.notNull())
    .addColumn("skill_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("threshold", "jsonb")
    .addColumn("display_order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("icon_asset_id", "uuid")
    .addColumn("badge_id", "uuid")
    .addColumn("coach_only", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("celebration_copy", "text")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();

  await db.schema
    .createTable("motivation_tracks")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("organization_id", "uuid", (col) =>
      col.references("organizations.id").onDelete("set null"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("target_xp", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("cadence", sql`cadence`, (col) => col.notNull().defaultTo("daily"))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("motivation_rewards")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("track_id", "uuid", (col) =>
      col.references("motivation_tracks.id").onDelete("set null"),
    )
    .addColumn("type", sql`motivation_reward_type`, (col) => col.notNull().defaultTo("sticker"))
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
    .createTable("joy_breaks")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("duration_seconds", "integer", (col) => col.notNull().defaultTo(120))
    .addColumn("asset_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("time_back_ledger")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("minutes_granted", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("granted_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("expires_at", "timestamp")
    .addColumn("consumed_at", "timestamp")
    .addColumn("note", "text")
    .execute();
}

export async function down(db: Kysely<DB>): Promise<void> {
  await db.schema.dropTable("time_back_ledger").execute();
  await db.schema.dropTable("joy_breaks").execute();
  await db.schema.dropTable("motivation_rewards").execute();
  await db.schema.dropTable("motivation_tracks").execute();
  await db.schema.dropTable("check_chart_entries").execute();
  await db.schema.dropTable("check_charts").execute();
  await db.schema.dropTable("practice_activities").execute();
  await db.schema.dropTable("micro_games").execute();
  await db.schema.dropTable("assets").execute();
  await db.schema.dropTable("skill_metrics").execute();
  await db.schema.dropTable("evidence_events").execute();
  await db.schema.dropTable("student_stats").execute();
  await db.schema.dropTable("student_skill_states").execute();
  await db.schema.dropTable("skill_task_templates").execute();
  await db.schema.dropTable("skill_encompassing").execute();
  await db.schema.dropTable("skill_prerequisites").execute();
  await db.schema.dropTable("skills").execute();
  await db.schema.dropTable("lessons").execute();
  await db.schema.dropTable("courses").execute();
  await db.schema.dropTable("subjects").execute();
  await db.schema.dropTable("parent_students").execute();
  await db.schema.dropTable("students").execute();
  await db.schema.dropTable("accounts").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();
  await db.schema.dropTable("organizations").execute();

  await sql`DROP TYPE IF EXISTS cadence`.execute(db);
  await sql`DROP TYPE IF EXISTS motivation_reward_type`.execute(db);
  await sql`DROP TYPE IF EXISTS prereq_gate`.execute(db);
  await sql`DROP TYPE IF EXISTS skill_stage_code`.execute(db);
  await sql`DROP TYPE IF EXISTS item_type`.execute(db);
  await sql`DROP TYPE IF EXISTS result`.execute(db);
  await sql`DROP TYPE IF EXISTS task_type`.execute(db);
  await sql`DROP TYPE IF EXISTS grade_band`.execute(db);
  await sql`DROP TYPE IF EXISTS domain`.execute(db);
  await sql`DROP TYPE IF EXISTS user_role`.execute(db);
}
