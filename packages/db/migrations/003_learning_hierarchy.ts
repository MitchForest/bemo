import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TYPE organization_type AS ENUM ('district', 'school', 'microschool', 'cohort', 'homeschool')
  `.execute(db);
  await sql`
    CREATE TYPE lesson_section_type AS ENUM (
      'direct_instruction',
      'guided_practice',
      'independent_practice',
      'collaborative',
      'reteach',
      'assessment',
      'reflection'
    )
  `.execute(db);
  await sql`
    CREATE TYPE assessment_type AS ENUM ('adaptive_entry', 'checkpoint', 'benchmark', 'exit_ticket')
  `.execute(db);
  await sql`
    CREATE TYPE assessment_mode AS ENUM ('adaptive', 'fixed')
  `.execute(db);
  await sql`
    CREATE TYPE enrollment_status AS ENUM ('active', 'paused', 'completed', 'withdrawn')
  `.execute(db);
  await sql`
    CREATE TYPE assignment_role AS ENUM ('teacher', 'coach', 'admin')
  `.execute(db);
  await sql`
    CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned')
  `.execute(db);

  await db.schema
    .createTable("organizations")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("type", sql`organization_type`, (col) => col.notNull())
    .addColumn("settings", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("organizations_slug_key", ["slug"])
    .execute();

  await db.schema
    .createTable("subjects")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
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
    .addUniqueConstraint("subjects_org_slug_key", ["organization_id", "slug"])
    .execute();

  await db.schema
    .createTable("courses")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
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
    .addColumn("icon", "text")
    .addColumn("color", "text")
    .addColumn("estimated_minutes", "integer")
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("courses_subject_slug_key", ["subject_id", "slug"])
    .execute();

  await db.schema
    .createTable("course_units")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("course_id", "uuid", (col) =>
      col.notNull().references("courses.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("summary", "text")
    .addColumn("sequence", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("icon", "text")
    .addColumn("color", "text")
    .addColumn("expected_minutes", "integer")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("lessons")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("unit_id", "uuid", (col) =>
      col.notNull().references("course_units.id").onDelete("cascade"),
    )
    .addColumn("topic_id", "uuid", (col) => col.references("topics.id").onDelete("set null"))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("focus_statement", "text")
    .addColumn("essential_question", "text")
    .addColumn("objective", "text")
    .addColumn("expected_time_minutes", "integer", (col) => col.notNull().defaultTo(15))
    .addColumn("mood_color", "text")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("lessons_unit_slug_key", ["unit_id", "slug"])
    .execute();

  await db.schema
    .createTable("lesson_sections")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("lesson_id", "uuid", (col) =>
      col.notNull().references("lessons.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("type", sql`lesson_section_type`, (col) => col.notNull())
    .addColumn("sequence", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("knowledge_point_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("instructions", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("media_assets", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("expected_minutes", "integer")
    .execute();

  await db.schema
    .createTable("assessments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("course_id", "uuid", (col) => col.references("courses.id").onDelete("cascade"))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("type", sql`assessment_type`, (col) => col.notNull())
    .addColumn("mode", sql`assessment_mode`, (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("entry_topic_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("config", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("assessment_nodes")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("assessment_id", "uuid", (col) =>
      col.notNull().references("assessments.id").onDelete("cascade"),
    )
    .addColumn("topic_id", "uuid", (col) => col.notNull().references("topics.id"))
    .addColumn("knowledge_point_id", "uuid", (col) => col.references("knowledge_points.id"))
    .addColumn("difficulty", "integer", (col) => col.notNull().defaultTo(3))
    .addColumn("next_on_correct", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("next_on_incorrect", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("assessment_attempts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("assessment_id", "uuid", (col) =>
      col.notNull().references("assessments.id").onDelete("cascade"),
    )
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("started_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("completed_at", "timestamp")
    .addColumn("status", sql`attempt_status`, (col) => col.notNull().defaultTo("in_progress"))
    .addColumn("score", "real")
    .addColumn("mastery_topic_id", "uuid", (col) => col.references("topics.id"))
    .addColumn("summary", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("assessment_responses")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("attempt_id", "uuid", (col) =>
      col.notNull().references("assessment_attempts.id").onDelete("cascade"),
    )
    .addColumn("item_id", "uuid")
    .addColumn("topic_id", "uuid", (col) => col.notNull().references("topics.id"))
    .addColumn("knowledge_point_id", "uuid", (col) => col.references("knowledge_points.id"))
    .addColumn("result", sql`result`, (col) => col.notNull())
    .addColumn("latency_ms", "integer", (col) => col.notNull())
    .addColumn("payload", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("cohorts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("organization_id", "uuid", (col) =>
      col.notNull().references("organizations.id").onDelete("cascade"),
    )
    .addColumn("course_id", "uuid", (col) => col.references("courses.id").onDelete("set null"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("grade_band", sql`grade_band`)
    .addColumn("color", "text")
    .addColumn("icon", "text")
    .addColumn("settings", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("cohort_members")
    .addColumn("cohort_id", "uuid", (col) =>
      col.notNull().references("cohorts.id").onDelete("cascade"),
    )
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("joined_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("cohort_members_pkey", ["cohort_id", "student_id"])
    .execute();

  await db.schema
    .createTable("enrollments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("student_id", "uuid", (col) =>
      col.notNull().references("students.id").onDelete("cascade"),
    )
    .addColumn("course_id", "uuid", (col) =>
      col.notNull().references("courses.id").onDelete("cascade"),
    )
    .addColumn("cohort_id", "uuid", (col) => col.references("cohorts.id").onDelete("set null"))
    .addColumn("status", sql`enrollment_status`, (col) => col.notNull().defaultTo("active"))
    .addColumn("started_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("completed_at", "timestamp")
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("staff_assignments")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("cohort_id", "uuid", (col) => col.references("cohorts.id").onDelete("cascade"))
    .addColumn("course_id", "uuid", (col) => col.references("courses.id").onDelete("cascade"))
    .addColumn("role", sql`assignment_role`, (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamp", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("courses_subject_idx").on("courses").column("subject_id").execute();
  await db.schema.createIndex("units_course_idx").on("course_units").column("course_id").execute();
  await db.schema.createIndex("lessons_unit_idx").on("lessons").column("unit_id").execute();
  await db.schema
    .createIndex("sections_lesson_idx")
    .on("lesson_sections")
    .column("lesson_id")
    .execute();
  await db.schema
    .createIndex("enrollments_student_idx")
    .on("enrollments")
    .column("student_id")
    .execute();
  await db.schema.createIndex("staff_user_idx").on("staff_assignments").column("user_id").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("staff_user_idx").execute();
  await db.schema.dropIndex("enrollments_student_idx").execute();
  await db.schema.dropIndex("sections_lesson_idx").execute();
  await db.schema.dropIndex("lessons_unit_idx").execute();
  await db.schema.dropIndex("units_course_idx").execute();
  await db.schema.dropIndex("courses_subject_idx").execute();

  await db.schema.dropTable("staff_assignments").execute();
  await db.schema.dropTable("enrollments").execute();
  await db.schema.dropTable("cohort_members").execute();
  await db.schema.dropTable("cohorts").execute();
  await db.schema.dropTable("assessment_responses").execute();
  await db.schema.dropTable("assessment_attempts").execute();
  await db.schema.dropTable("assessment_nodes").execute();
  await db.schema.dropTable("assessments").execute();
  await db.schema.dropTable("lesson_sections").execute();
  await db.schema.dropTable("lessons").execute();
  await db.schema.dropTable("course_units").execute();
  await db.schema.dropTable("courses").execute();
  await db.schema.dropTable("subjects").execute();
  await db.schema.dropTable("organizations").execute();

  await sql`DROP TYPE IF EXISTS attempt_status`.execute(db);
  await sql`DROP TYPE IF EXISTS assignment_role`.execute(db);
  await sql`DROP TYPE IF EXISTS enrollment_status`.execute(db);
  await sql`DROP TYPE IF EXISTS assessment_mode`.execute(db);
  await sql`DROP TYPE IF EXISTS assessment_type`.execute(db);
  await sql`DROP TYPE IF EXISTS lesson_section_type`.execute(db);
  await sql`DROP TYPE IF EXISTS organization_type`.execute(db);
}
