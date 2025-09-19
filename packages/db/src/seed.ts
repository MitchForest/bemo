import {
  seedAssets,
  seedCheckChartEntries,
  seedCheckCharts,
  seedCourses,
  seedJoyBreaks,
  seedLessons,
  seedMicroGames,
  seedMotivationRewards,
  seedMotivationTracks,
  seedPracticeActivities,
  seedSkillTaskTemplates,
  seedSkills,
  seedSubjects,
} from "@repo/curriculum";
import type { Kysely } from "kysely";
import type { Json } from "./database-types";
import { type DB, getDb } from "./index";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_ORGANIZATION_SLUG = "default-network";
const DEFAULT_ORGANIZATION_NAME = "Bemo Learning Network";

const now = () => new Date();

async function ensureOrganization(executor: Kysely<DB>) {
  await executor
    .insertInto("organizations")
    .values({
      id: DEFAULT_ORGANIZATION_ID,
      name: DEFAULT_ORGANIZATION_NAME,
      slug: DEFAULT_ORGANIZATION_SLUG,
      type: "microschool",
      settings: {},
      created_at: now(),
      updated_at: now(),
    })
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        name: eb.ref("excluded.name"),
        slug: eb.ref("excluded.slug"),
        type: eb.ref("excluded.type"),
        settings: eb.ref("excluded.settings"),
        updated_at: eb.ref("excluded.updated_at"),
      })),
    )
    .execute();
}

async function upsertSubjects(executor: Kysely<DB>) {
  for (const subject of seedSubjects) {
    await executor
      .insertInto("subjects")
      .values({
        id: subject.id,
        organization_id: DEFAULT_ORGANIZATION_ID,
        slug: subject.id,
        title: subject.title,
        domain: subject.domain,
        color: null,
        icon: null,
        description: subject.description ?? null,
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          domain: eb.ref("excluded.domain"),
          description: eb.ref("excluded.description"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertCourses(executor: Kysely<DB>) {
  for (const course of seedCourses) {
    await executor
      .insertInto("courses")
      .values({
        id: course.id,
        organization_id: DEFAULT_ORGANIZATION_ID,
        subject_id: course.subjectId,
        title: course.title,
        slug: course.id,
        grade_band: course.gradeBand ?? null,
        summary: course.summary ?? null,
        metadata: (course.metadata ?? {}) as Json,
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          subject_id: eb.ref("excluded.subject_id"),
          title: eb.ref("excluded.title"),
          slug: eb.ref("excluded.slug"),
          grade_band: eb.ref("excluded.grade_band"),
          summary: eb.ref("excluded.summary"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertLessons(executor: Kysely<DB>) {
  for (const lesson of seedLessons) {
    await executor
      .insertInto("lessons")
      .values({
        id: lesson.id,
        course_id: lesson.courseId,
        title: lesson.title,
        slug: lesson.id,
        skill_ids: lesson.skillIds ?? [],
        summary: lesson.summary ?? null,
        metadata: (lesson.metadata ?? {}) as Json,
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          course_id: eb.ref("excluded.course_id"),
          title: eb.ref("excluded.title"),
          slug: eb.ref("excluded.slug"),
          skill_ids: eb.ref("excluded.skill_ids"),
          summary: eb.ref("excluded.summary"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertSkills(executor: Kysely<DB>) {
  for (const skill of seedSkills) {
    await executor
      .insertInto("skills")
      .values({
        id: skill.id,
        title: skill.title,
        domain: skill.domain,
        strand: skill.strand,
        grade_band: skill.gradeBand,
        stage_code: skill.stageCode ?? null,
        description: skill.description ?? null,
        interference_group: skill.interferenceGroup ?? null,
        expected_time_seconds: skill.expectedTimeSeconds,
        check_chart_tags: skill.checkChartTags ?? [],
        assets: skill.assets ?? [],
        subject_id: skill.subjectId ?? null,
        course_id: skill.courseId ?? null,
        lesson_id: skill.lessonId ?? null,
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          domain: eb.ref("excluded.domain"),
          strand: eb.ref("excluded.strand"),
          grade_band: eb.ref("excluded.grade_band"),
          stage_code: eb.ref("excluded.stage_code"),
          description: eb.ref("excluded.description"),
          interference_group: eb.ref("excluded.interference_group"),
          expected_time_seconds: eb.ref("excluded.expected_time_seconds"),
          check_chart_tags: eb.ref("excluded.check_chart_tags"),
          assets: eb.ref("excluded.assets"),
          subject_id: eb.ref("excluded.subject_id"),
          course_id: eb.ref("excluded.course_id"),
          lesson_id: eb.ref("excluded.lesson_id"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertSkillTaskTemplates(executor: Kysely<DB>) {
  for (const template of seedSkillTaskTemplates) {
    await executor
      .insertInto("skill_task_templates")
      .values({
        id: template.id,
        skill_id: template.skillId,
        intent: template.intent,
        title: template.title,
        xp_award: template.xpAward,
        estimated_minutes: template.estimatedMinutes,
        modalities: template.modalities ?? [],
        sensory_tags: template.sensoryTags ?? [],
        definition: { steps: template.steps },
        metadata: template.metadata ?? {},
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          skill_id: eb.ref("excluded.skill_id"),
          intent: eb.ref("excluded.intent"),
          title: eb.ref("excluded.title"),
          xp_award: eb.ref("excluded.xp_award"),
          estimated_minutes: eb.ref("excluded.estimated_minutes"),
          modalities: eb.ref("excluded.modalities"),
          sensory_tags: eb.ref("excluded.sensory_tags"),
          definition: eb.ref("excluded.definition"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertSkillRelationships(executor: Kysely<DB>) {
  const prerequisites = new Map<
    string,
    { skill_id: string; prerequisite_skill_id: string; gate: "AND" | "OR" }
  >();
  const encompassing = new Map<
    string,
    { child_skill_id: string; parent_skill_id: string; weight: number }
  >();

  for (const skill of seedSkills) {
    for (const prereq of skill.prerequisites ?? []) {
      const key = `${skill.id}:${prereq.skillId}:${prereq.gate}`;
      prerequisites.set(key, {
        skill_id: skill.id,
        prerequisite_skill_id: prereq.skillId,
        gate: (prereq.gate ?? "AND") as "AND" | "OR",
      });
    }

    for (const edge of skill.encompassing ?? []) {
      const key = `${skill.id}:${edge.skillId}`;
      encompassing.set(key, {
        child_skill_id: skill.id,
        parent_skill_id: edge.skillId,
        weight: edge.weight,
      });
    }
  }

  if (prerequisites.size > 0) {
    await executor
      .insertInto("skill_prerequisites")
      .values(Array.from(prerequisites.values()))
      .onConflict((oc) =>
        oc.columns(["skill_id", "prerequisite_skill_id"]).doUpdateSet((eb) => ({
          gate: eb.ref("excluded.gate"),
        })),
      )
      .execute();
  }

  if (encompassing.size > 0) {
    await executor
      .insertInto("skill_encompassing")
      .values(Array.from(encompassing.values()))
      .onConflict((oc) =>
        oc.columns(["child_skill_id", "parent_skill_id"]).doUpdateSet((eb) => ({
          weight: eb.ref("excluded.weight"),
        })),
      )
      .execute();
  }
}

async function upsertAssets(executor: Kysely<DB>) {
  for (const asset of seedAssets) {
    await executor
      .insertInto("assets")
      .values({
        id: asset.id,
        organization_id: asset.organizationId ?? DEFAULT_ORGANIZATION_ID,
        title: asset.title,
        type: asset.type,
        uri: asset.uri,
        alt_text: asset.altText ?? null,
        locale: asset.locale,
        duration_ms: asset.durationMs ?? null,
        transcript: asset.transcript ?? null,
        metadata: asset.metadata ?? {},
        created_at: new Date(asset.createdAt),
        updated_at: new Date(asset.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          type: eb.ref("excluded.type"),
          uri: eb.ref("excluded.uri"),
          alt_text: eb.ref("excluded.alt_text"),
          locale: eb.ref("excluded.locale"),
          duration_ms: eb.ref("excluded.duration_ms"),
          transcript: eb.ref("excluded.transcript"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertMicroGames(executor: Kysely<DB>) {
  for (const game of seedMicroGames) {
    await executor
      .insertInto("micro_games")
      .values({
        id: game.id,
        slug: game.slug,
        title: game.title,
        genre: game.genre,
        description: game.description ?? null,
        domain: game.domain ?? null,
        engine_hooks: game.engineHooks ?? {},
        io_schema: game.ioSchema ?? {},
        ui: game.ui ?? {},
        asset_ids: game.assetIds ?? [],
        created_at: new Date(game.createdAt),
        updated_at: new Date(game.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          slug: eb.ref("excluded.slug"),
          title: eb.ref("excluded.title"),
          genre: eb.ref("excluded.genre"),
          description: eb.ref("excluded.description"),
          domain: eb.ref("excluded.domain"),
          engine_hooks: eb.ref("excluded.engine_hooks"),
          io_schema: eb.ref("excluded.io_schema"),
          ui: eb.ref("excluded.ui"),
          asset_ids: eb.ref("excluded.asset_ids"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertPracticeActivities(executor: Kysely<DB>) {
  for (const activity of seedPracticeActivities) {
    await executor
      .insertInto("practice_activities")
      .values({
        id: activity.id,
        skill_id: activity.skillId ?? null,
        type: activity.type,
        title: activity.title,
        description: activity.description ?? null,
        micro_game_id: activity.microGameId ?? null,
        config: activity.config ?? {},
        expected_minutes: activity.expectedMinutes ?? null,
        asset_ids: activity.assetIds ?? [],
        modalities: activity.modalities ?? [],
        sensory_tags: activity.sensoryTags ?? [],
        purposes: activity.purposes ?? [],
        difficulty_band: activity.difficultyBand ?? null,
        created_at: now(),
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          skill_id: eb.ref("excluded.skill_id"),
          type: eb.ref("excluded.type"),
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          micro_game_id: eb.ref("excluded.micro_game_id"),
          config: eb.ref("excluded.config"),
          expected_minutes: eb.ref("excluded.expected_minutes"),
          asset_ids: eb.ref("excluded.asset_ids"),
          modalities: eb.ref("excluded.modalities"),
          sensory_tags: eb.ref("excluded.sensory_tags"),
          purposes: eb.ref("excluded.purposes"),
          difficulty_band: eb.ref("excluded.difficulty_band"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertCheckCharts(executor: Kysely<DB>) {
  for (const chart of seedCheckCharts) {
    await executor
      .insertInto("check_charts")
      .values({
        id: chart.id,
        organization_id: chart.organizationId ?? DEFAULT_ORGANIZATION_ID,
        title: chart.title,
        description: chart.description ?? null,
        domain: chart.domain,
        grade_band: chart.gradeBand,
        stage_code: chart.stageCode ?? null,
        icon: chart.icon ?? null,
        color: chart.color ?? null,
        display_order: chart.displayOrder ?? 0,
        created_at: new Date(chart.createdAt),
        updated_at: new Date(chart.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          domain: eb.ref("excluded.domain"),
          grade_band: eb.ref("excluded.grade_band"),
          stage_code: eb.ref("excluded.stage_code"),
          icon: eb.ref("excluded.icon"),
          color: eb.ref("excluded.color"),
          display_order: eb.ref("excluded.display_order"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

async function upsertCheckChartEntries(executor: Kysely<DB>) {
  for (const entry of seedCheckChartEntries) {
    await executor
      .insertInto("check_chart_entries")
      .values({
        id: entry.id,
        chart_id: entry.chartId as string,
        label: entry.label ?? null,
        skill_ids: (entry.skillIds ?? []) as Json,
        threshold: (entry.threshold ?? null) as Json | null,
        display_order: entry.displayOrder ?? 0,
        sequence: entry.displayOrder ?? 0,
        statement: entry.label ?? "Progress milestone",
        icon_asset_id: entry.iconAssetId ?? null,
        badge_id: entry.badgeId ?? null,
        coach_only: entry.coachOnly ?? false,
        celebration_copy: entry.celebrationCopy ?? null,
        metadata: (entry.metadata ?? {}) as Json,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          chart_id: eb.ref("excluded.chart_id"),
          display_order: eb.ref("excluded.display_order"),
          label: eb.ref("excluded.label"),
          skill_ids: eb.ref("excluded.skill_ids"),
          sequence: eb.ref("excluded.sequence"),
          statement: eb.ref("excluded.statement"),
          badge_id: eb.ref("excluded.badge_id"),
          icon_asset_id: eb.ref("excluded.icon_asset_id"),
          coach_only: eb.ref("excluded.coach_only"),
          celebration_copy: eb.ref("excluded.celebration_copy"),
          threshold: eb.ref("excluded.threshold"),
          metadata: eb.ref("excluded.metadata"),
        })),
      )
      .execute();
  }
}

async function upsertMotivation(executor: Kysely<DB>) {
  for (const track of seedMotivationTracks) {
    await executor
      .insertInto("motivation_tracks")
      .values({
        id: track.id,
        organization_id: track.organizationId ?? DEFAULT_ORGANIZATION_ID,
        title: track.title,
        description: track.description ?? null,
        target_xp: track.targetXp,
        cadence: track.cadence,
        created_at: new Date(track.createdAt),
        updated_at: new Date(track.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          target_xp: eb.ref("excluded.target_xp"),
          cadence: eb.ref("excluded.cadence"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }

  for (const reward of seedMotivationRewards) {
    await executor
      .insertInto("motivation_rewards")
      .values({
        id: reward.id,
        track_id: reward.trackId ?? null,
        type: reward.type,
        title: reward.title,
        description: reward.description ?? null,
        threshold: reward.threshold,
        icon: reward.icon ?? null,
        asset_ids: reward.assetIds ?? [],
        metadata: reward.metadata ?? {},
        created_at: new Date(reward.createdAt),
        updated_at: new Date(reward.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          track_id: eb.ref("excluded.track_id"),
          type: eb.ref("excluded.type"),
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          threshold: eb.ref("excluded.threshold"),
          icon: eb.ref("excluded.icon"),
          asset_ids: eb.ref("excluded.asset_ids"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }

  for (const joyBreak of seedJoyBreaks) {
    await executor
      .insertInto("joy_breaks")
      .values({
        id: joyBreak.id,
        title: joyBreak.title,
        description: joyBreak.description ?? null,
        duration_seconds: joyBreak.durationSeconds,
        asset_ids: joyBreak.assetIds ?? [],
        metadata: joyBreak.metadata ?? {},
        created_at: new Date(joyBreak.createdAt),
        updated_at: new Date(joyBreak.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          duration_seconds: eb.ref("excluded.duration_seconds"),
          asset_ids: eb.ref("excluded.asset_ids"),
          metadata: eb.ref("excluded.metadata"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  }
}

export async function seedCoreContent(executor?: Kysely<DB>) {
  const runner = executor ?? getDb();

  const run = async (tx: Kysely<DB>) => {
    console.log("  - Ensuring organization...");
    await ensureOrganization(tx);
    console.log("  - Upserting subjects...");
    await upsertSubjects(tx);
    console.log("  - Upserting courses...");
    await upsertCourses(tx);
    console.log("  - Upserting lessons...");
    await upsertLessons(tx);
    console.log("  - Upserting skills...");
    await upsertSkills(tx);
    console.log("  - Upserting skill task templates...");
    await upsertSkillTaskTemplates(tx);
    console.log("  - Upserting skill relationships...");
    await upsertSkillRelationships(tx);
    console.log("  - Upserting assets...");
    await upsertAssets(tx);
    console.log("  - Upserting micro games...");
    await upsertMicroGames(tx);
    console.log("  - Upserting practice activities...");
    await upsertPracticeActivities(tx);
    console.log("  - Upserting motivation data...");
    await upsertMotivation(tx);
    console.log("  - Upserting check charts...");
    await upsertCheckCharts(tx);
    console.log("  - Upserting check chart entries...");
    await upsertCheckChartEntries(tx);
  };

  if (executor) {
    await run(runner);
    return;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Kysely transaction type
  await runner.transaction().execute(async (trx: any) => {
    await run(trx);
  });
}

if (import.meta.main) {
  seedCoreContent()
    .then(async () => {
      console.log("✅ Seeded core content primitives");
      await getDb().destroy();
    })
    .catch(async (error) => {
      console.error("❌ Failed to seed core content", error);
      await getDb().destroy();
      process.exit(1);
    });
}
