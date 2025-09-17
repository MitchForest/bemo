import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Enable RLS on all tables
  const tables = [
    "users",
    "sessions",
    "accounts",
    "students",
    "parent_students",
    "topics",
    "topic_prerequisites",
    "topic_encompassing",
    "knowledge_points",
    "items",
    "student_topic_states",
    "evidence_events",
    "student_stats",
  ];

  for (const table of tables) {
    await sql`ALTER TABLE ${sql.table(table)} ENABLE ROW LEVEL SECURITY`.execute(db);
  }

  // Public read policies for curriculum content
  await sql`
    CREATE POLICY topics_public_read ON topics
    FOR SELECT
    USING (true)
  `.execute(db);

  await sql`
    CREATE POLICY kps_public_read ON knowledge_points
    FOR SELECT
    USING (true)
  `.execute(db);

  await sql`
    CREATE POLICY items_public_read ON items
    FOR SELECT
    USING (true)
  `.execute(db);

  await sql`
    CREATE POLICY topic_prerequisites_public_read ON topic_prerequisites
    FOR SELECT
    USING (true)
  `.execute(db);

  await sql`
    CREATE POLICY topic_encompassing_public_read ON topic_encompassing
    FOR SELECT
    USING (true)
  `.execute(db);

  // User-specific policies
  await sql`
    CREATE POLICY users_self_read ON users
    FOR SELECT
    USING (id = current_setting('app.user_id', true)::uuid OR role = 'admin')
  `.execute(db);

  await sql`
    CREATE POLICY users_self_update ON users
    FOR UPDATE
    USING (id = current_setting('app.user_id', true)::uuid)
    WITH CHECK (id = current_setting('app.user_id', true)::uuid)
  `.execute(db);

  // Student data policies
  await sql`
    CREATE POLICY student_states_owner ON student_topic_states
    USING (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
    WITH CHECK (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
  `.execute(db);

  await sql`
    CREATE POLICY evidence_owner ON evidence_events
    USING (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
    WITH CHECK (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
  `.execute(db);

  await sql`
    CREATE POLICY stats_owner ON student_stats
    USING (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
    WITH CHECK (
      student_id IN (
        SELECT id FROM students 
        WHERE user_id = current_setting('app.user_id', true)::uuid
      )
    )
  `.execute(db);

  // Parent access to their students
  await sql`
    CREATE POLICY parent_student_access ON students
    FOR SELECT
    USING (
      user_id = current_setting('app.user_id', true)::uuid OR
      id IN (
        SELECT student_id FROM parent_students 
        WHERE parent_id = current_setting('app.user_id', true)::uuid
      )
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop all policies
  const policies = [
    "topics_public_read ON topics",
    "kps_public_read ON knowledge_points",
    "items_public_read ON items",
    "topic_prerequisites_public_read ON topic_prerequisites",
    "topic_encompassing_public_read ON topic_encompassing",
    "users_self_read ON users",
    "users_self_update ON users",
    "student_states_owner ON student_topic_states",
    "evidence_owner ON evidence_events",
    "stats_owner ON student_stats",
    "parent_student_access ON students",
  ];

  for (const policy of policies) {
    await sql`DROP POLICY IF EXISTS ${sql.raw(policy)}`.execute(db);
  }

  // Disable RLS on all tables
  const tables = [
    "users",
    "sessions",
    "accounts",
    "students",
    "parent_students",
    "topics",
    "topic_prerequisites",
    "topic_encompassing",
    "knowledge_points",
    "items",
    "student_topic_states",
    "evidence_events",
    "student_stats",
  ];

  for (const table of tables) {
    await sql`ALTER TABLE ${sql.table(table)} DISABLE ROW LEVEL SECURITY`.execute(db);
  }
}
