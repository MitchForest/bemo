import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create enums
  await sql`CREATE TYPE user_role AS ENUM ('student', 'parent', 'coach', 'admin')`.execute(db);
  await sql`CREATE TYPE domain AS ENUM ('math', 'reading')`.execute(db);
  await sql`CREATE TYPE grade_band AS ENUM ('PreK', 'K', '1')`.execute(db);
  await sql`CREATE TYPE task_type AS ENUM ('lesson', 'review', 'quiz', 'speed_drill', 'diagnostic', 'multistep')`.execute(
    db,
  );
  await sql`CREATE TYPE result AS ENUM ('correct', 'incorrect', 'partial', 'skipped')`.execute(db);
  await sql`CREATE TYPE item_type AS ENUM ('choice_image', 'choice_text', 'choice_audio', 'drag_drop', 'tap_to_count', 'speak', 'record_audio', 'trace_path', 'short_answer', 'timer_speed_drill', 'phrase_reading', 'comprehension_choice')`.execute(
    db,
  );

  // Users table
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

  await db.schema.createIndex("users_email_idx").on("users").column("email").execute();

  // Sessions table (Better-Auth compatible)
  await db.schema
    .createTable("sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("sessions_user_idx").on("sessions").column("user_id").execute();

  // Accounts table (Better-Auth OAuth)
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

  await db.schema
    .createIndex("accounts_user_provider_idx")
    .on("accounts")
    .columns(["user_id", "provider"])
    .execute();

  // Students table
  await db.schema
    .createTable("students")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.references("users.id").onDelete("cascade"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("grade", "text", (col) => col.notNull())
    .addColumn("birth_date", "timestamp")
    .addColumn("motivation_profile", "jsonb", (col) =>
      col.defaultTo(
        sql`'{"preferCompetition": false, "preferMastery": true, "preferSocial": false}'::jsonb`,
      ),
    )
    .addColumn("settings", "jsonb", (col) =>
      col.defaultTo(sql`'{"dailyXpGoal": 30, "soundEnabled": true, "musicEnabled": true}'::jsonb`),
    )
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("students_user_idx").on("students").column("user_id").execute();

  // Parent-Student relationships
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

  // Topics table
  await db.schema
    .createTable("topics")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("domain", sql`domain`, (col) => col.notNull())
    .addColumn("strand", "text", (col) => col.notNull())
    .addColumn("grade_band", sql`grade_band`, (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("interference_group", "text")
    .addColumn("expected_time_seconds", "integer", (col) => col.notNull())
    .addColumn("check_chart_tags", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("assets", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("topics_domain_idx").on("topics").column("domain").execute();

  await db.schema.createIndex("topics_grade_idx").on("topics").column("grade_band").execute();

  // Topic prerequisites
  await db.schema
    .createTable("topic_prerequisites")
    .addColumn("topic_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("prerequisite_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("gate", "text", (col) => col.notNull().defaultTo("AND"))
    .addPrimaryKeyConstraint("topic_prerequisites_pkey", ["topic_id", "prerequisite_id"])
    .execute();

  // Topic encompassing edges
  await db.schema
    .createTable("topic_encompassing")
    .addColumn("child_topic_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("parent_topic_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("weight", "real", (col) => col.notNull().defaultTo(0.5))
    .addPrimaryKeyConstraint("topic_encompassing_pkey", ["child_topic_id", "parent_topic_id"])
    .execute();

  // Knowledge Points
  await db.schema
    .createTable("knowledge_points")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("topic_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("objective", "text", (col) => col.notNull())
    .addColumn("worked_example", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("reteach_snippet", "text", (col) => col.notNull())
    .addColumn("expected_time_seconds", "integer", (col) => col.notNull())
    .addColumn("hints", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("kps_topic_idx").on("knowledge_points").column("topic_id").execute();

  // Items
  await db.schema
    .createTable("items")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("knowledge_point_id", "uuid", (col) =>
      col.notNull().references("knowledge_points.id").onDelete("cascade"),
    )
    .addColumn("type", sql`item_type`, (col) => col.notNull())
    .addColumn("prompt", "jsonb", (col) => col.notNull())
    .addColumn("rubric", "jsonb", (col) => col.notNull())
    .addColumn("difficulty", "integer", (col) => col.notNull())
    .addColumn("time_estimate_ms", "integer", (col) => col.notNull())
    .addColumn("randomization", "jsonb")
    .addColumn("encompassing_targets", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("items_kp_idx").on("items").column("knowledge_point_id").execute();

  await db.schema.createIndex("items_type_idx").on("items").column("type").execute();

  // Student Topic States
  await db.schema
    .createTable("student_topic_states")
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("topic_id", "uuid", (col) =>
      col.notNull().references("topics.id").onDelete("cascade"),
    )
    .addColumn("stability", "real", (col) => col.notNull().defaultTo(1.0))
    .addColumn("strength", "real", (col) => col.notNull().defaultTo(0))
    .addColumn("rep_num", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("due_at", "timestamp", (col) => col.notNull())
    .addColumn("last_seen_at", "timestamp")
    .addColumn("avg_latency_ms", "integer")
    .addColumn("speed_factor", "real", (col) => col.notNull().defaultTo(1.0))
    .addColumn("struggling_flag", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("overdue_days", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("easiness", "real")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("student_topic_states_pkey", ["student_id", "topic_id"])
    .execute();

  await db.schema
    .createIndex("states_due_idx")
    .on("student_topic_states")
    .column("due_at")
    .execute();

  await db.schema
    .createIndex("states_struggling_idx")
    .on("student_topic_states")
    .column("struggling_flag")
    .execute();

  // Evidence Events
  await db.schema
    .createTable("evidence_events")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("topic_id", "uuid", (col) => col.notNull().references("topics.id"))
    .addColumn("knowledge_point_id", "uuid", (col) => col.references("knowledge_points.id"))
    .addColumn("item_id", "uuid", (col) => col.references("items.id"))
    .addColumn("task_id", "uuid")
    .addColumn("result", sql`result`, (col) => col.notNull())
    .addColumn("latency_ms", "integer", (col) => col.notNull())
    .addColumn("hints_used", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("input_payload", "jsonb")
    .addColumn("confidence", "real")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("evidence_student_idx")
    .on("evidence_events")
    .column("student_id")
    .execute();

  await db.schema
    .createIndex("evidence_topic_idx")
    .on("evidence_events")
    .column("topic_id")
    .execute();

  await db.schema
    .createIndex("evidence_created_idx")
    .on("evidence_events")
    .column("created_at")
    .execute();

  // Student Stats
  await db.schema
    .createTable("student_stats")
    .addColumn("student_id", "uuid", (col) =>
      col.primaryKey().references("students.id").onDelete("cascade"),
    )
    .addColumn("total_xp", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("current_streak", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("longest_streak", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("total_minutes", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("topics_completed", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("speed_drills_completed", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("last_active_at", "timestamp")
    .addColumn("weekly_xp", "jsonb", (col) => col.defaultTo(sql`'[]'::jsonb`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop tables in reverse order
  await db.schema.dropTable("student_stats").execute();
  await db.schema.dropTable("evidence_events").execute();
  await db.schema.dropTable("student_topic_states").execute();
  await db.schema.dropTable("items").execute();
  await db.schema.dropTable("knowledge_points").execute();
  await db.schema.dropTable("topic_encompassing").execute();
  await db.schema.dropTable("topic_prerequisites").execute();
  await db.schema.dropTable("topics").execute();
  await db.schema.dropTable("parent_students").execute();
  await db.schema.dropTable("students").execute();
  await db.schema.dropTable("accounts").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();

  // Drop enums
  await sql`DROP TYPE IF EXISTS item_type`.execute(db);
  await sql`DROP TYPE IF EXISTS result`.execute(db);
  await sql`DROP TYPE IF EXISTS task_type`.execute(db);
  await sql`DROP TYPE IF EXISTS grade_band`.execute(db);
  await sql`DROP TYPE IF EXISTS domain`.execute(db);
  await sql`DROP TYPE IF EXISTS user_role`.execute(db);
}
