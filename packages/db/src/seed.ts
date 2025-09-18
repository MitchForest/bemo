import type { Kysely } from "kysely";
import { db, type DB } from "./index";
import {
  seedAssets,
  seedMicroGames,
  seedPracticeActivities,
  seedCheckCharts,
  seedCheckChartEntries,
  seedMotivationTracks,
  seedMotivationRewards,
  seedJoyBreaks,
} from "@repo/curriculum";

async function upsertAssets(executor: Kysely<DB>) {
  for (const asset of seedAssets) {
    await executor
      .insertInto("assets")
      .values({
        id: asset.id,
        organization_id: asset.organizationId ?? null,
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
        knowledge_point_id: activity.knowledgePointId ?? null,
        topic_id: activity.topicId ?? null,
        type: activity.type,
        title: activity.title,
        description: activity.description ?? null,
        micro_game_id: activity.microGameId ?? null,
        config: activity.config ?? {},
        expected_minutes: activity.expectedMinutes ?? null,
        asset_ids: activity.assetIds ?? [],
        created_at: new Date(activity.createdAt),
        updated_at: new Date(activity.updatedAt),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          knowledge_point_id: eb.ref("excluded.knowledge_point_id"),
          topic_id: eb.ref("excluded.topic_id"),
          type: eb.ref("excluded.type"),
          title: eb.ref("excluded.title"),
          description: eb.ref("excluded.description"),
          micro_game_id: eb.ref("excluded.micro_game_id"),
          config: eb.ref("excluded.config"),
          expected_minutes: eb.ref("excluded.expected_minutes"),
          asset_ids: eb.ref("excluded.asset_ids"),
          updated_at: eb.ref("excluded.updated_at"),
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
        organization_id: track.organizationId ?? null,
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

  for (const chart of seedCheckCharts) {
    await executor
      .insertInto("check_charts")
      .values({
        id: chart.id,
        organization_id: chart.organizationId ?? null,
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

  for (const entry of seedCheckChartEntries) {
    await executor
      .insertInto("check_chart_entries")
      .values({
        id: entry.id,
        chart_id: entry.chartId as string,
        sequence: entry.displayOrder ?? 0,
        display_order: entry.displayOrder ?? 0,
        statement: entry.label,
        topic_id: entry.skillIds?.[0] ?? null,
        topic_ids: entry.skillIds ?? [],
        knowledge_point_id: entry.knowledgePointIds?.[0] ?? null,
        knowledge_point_ids: entry.knowledgePointIds ?? [],
        badge_id: entry.badgeId ?? null,
        icon_asset_id: (entry.iconAssetId ?? null) as any,
        coach_only: entry.coachOnly ?? false,
        celebration_copy: entry.celebrationCopy ?? null,
        threshold: entry.threshold ?? {},
        metadata: entry.metadata ?? {},
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet((eb) => ({
          chart_id: eb.ref("excluded.chart_id"),
          sequence: eb.ref("excluded.sequence"),
          display_order: eb.ref("excluded.display_order"),
          statement: eb.ref("excluded.statement"),
          topic_id: eb.ref("excluded.topic_id"),
          topic_ids: eb.ref("excluded.topic_ids"),
          knowledge_point_id: eb.ref("excluded.knowledge_point_id"),
          knowledge_point_ids: eb.ref("excluded.knowledge_point_ids"),
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

export async function seedCoreContent(executor?: Kysely<DB>) {
  const runner = executor ?? db;

  const run = async (tx: Kysely<DB>) => {
    await upsertAssets(tx);
    await upsertMicroGames(tx);
    await upsertPracticeActivities(tx);
    await upsertMotivation(tx);
  };

  if (executor) {
    await run(runner);
    return;
  }

  await runner.transaction().execute(async (trx) => {
    await run(trx);
  });
}

if (import.meta.main) {
  seedCoreContent()
    .then(async () => {
      console.log("✅ Seeded core content primitives");
      await db.destroy();
    })
    .catch(async (error) => {
      console.error("❌ Failed to seed core content", error);
      await db.destroy();
      process.exit(1);
    });
}
