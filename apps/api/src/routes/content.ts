import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import type {
  Asset,
  MicroGame,
  PracticeActivity,
  CheckChart,
  CheckChartEntry,
  MotivationTrack,
  MotivationReward,
  JoyBreak,
  KnowledgePointExperience,
} from "@repo/schemas";
import {
  AssetSchema,
  MicroGameSchema,
  PracticeActivitySchema,
  CheckChartSchema,
  CheckChartEntrySchema,
  MotivationTrackSchema,
  MotivationRewardSchema,
  JoyBreakSchema,
  TopicSchema,
  KnowledgePointSchema,
  KnowledgePointExperienceSchema,
} from "@repo/schemas";
import {
  seedAssets,
  seedMicroGames,
  seedPracticeActivities,
  seedCheckCharts,
  seedCheckChartEntries,
  seedMotivationTracks,
  seedMotivationRewards,
  seedJoyBreaks,
  seedKnowledgePointExperiences,
  getTopicById,
  getKnowledgePointsByTopic,
  getExperiencesForTopic,
} from "@repo/curriculum";
import { db } from "@repo/db";

const app = new OpenAPIHono();

const AssetsResponseSchema = z.object({ items: z.array(AssetSchema) });
const MicroGameResponseSchema = z.object({ items: z.array(MicroGameSchema) });
const PracticeActivityResponseSchema = z.object({ items: z.array(PracticeActivitySchema) });
const KnowledgePointExperienceResponseSchema = z.object({
  items: z.array(KnowledgePointExperienceSchema),
});
const CheckChartResponseSchema = z.object({ items: z.array(CheckChartSchema) });
const CheckChartEntryResponseSchema = z.object({ items: z.array(CheckChartEntrySchema) });
const MotivationTrackResponseSchema = z.object({ items: z.array(MotivationTrackSchema) });
const MotivationRewardResponseSchema = z.object({ items: z.array(MotivationRewardSchema) });
const JoyBreakResponseSchema = z.object({ items: z.array(JoyBreakSchema) });
const TopicDetailResponseSchema = z
  .object({
    topic: TopicSchema,
    knowledgePoints: z.array(KnowledgePointSchema),
    experiences: z.array(KnowledgePointExperienceSchema),
  })
  .openapi({ description: "Topic detail with knowledge points and experiences" });
const MicroGameDetailResponseSchema = z
  .object({
    game: MicroGameSchema,
  })
  .openapi({ description: "Micro-game descriptor" });

async function tryFetch<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!process.env.DATABASE_URL) {
    return fallback;
  }
  try {
    return await query();
  } catch (error) {
    console.warn("[content] Falling back to seed data", error);
    return fallback;
  }
}

const mapAsset = (row: any): Asset => ({
  id: row.id,
  organizationId: row.organization_id ?? undefined,
  title: row.title,
  type: row.type,
  uri: row.uri,
  altText: row.alt_text ?? undefined,
  locale: row.locale,
  durationMs: row.duration_ms ?? undefined,
  transcript: row.transcript ?? undefined,
  metadata: row.metadata ?? {},
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapMicroGame = (row: any): MicroGame => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  genre: row.genre,
  description: row.description ?? undefined,
  domain: row.domain ?? undefined,
  engineHooks: row.engine_hooks ?? {},
  ioSchema: row.io_schema ?? {},
  ui: row.ui ?? {},
  assetIds: row.asset_ids ?? [],
  modalities: row.modalities ?? [],
  sensoryTags: row.sensory_tags ?? [],
  purposes: row.purposes ?? [],
  difficultyBand: row.difficulty_band ?? undefined,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapPracticeActivity = (row: any): PracticeActivity => ({
  id: row.id,
  knowledgePointId: row.knowledge_point_id ?? undefined,
  topicId: row.topic_id ?? undefined,
  skillId: row.skill_id ?? undefined,
  type: row.type,
  title: row.title,
  description: row.description ?? undefined,
  microGameId: row.micro_game_id ?? undefined,
  config: row.config ?? {},
  expectedMinutes: row.expected_minutes ?? undefined,
  assetIds: row.asset_ids ?? [],
  modalities: row.modalities ?? [],
  sensoryTags: row.sensory_tags ?? [],
  purposes: row.purposes ?? [],
  difficultyBand: row.difficulty_band ?? undefined,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapCheckChartEntry = (row: any): CheckChartEntry => {
  const threshold =
    row.threshold && Object.keys(row.threshold).length > 0 ? row.threshold : undefined;
  const skillIds =
    Array.isArray(row.skill_ids) && row.skill_ids.length > 0
      ? row.skill_ids
      : row.skill_id
        ? [row.skill_id]
        : Array.isArray(row.topic_ids) && row.topic_ids.length > 0
          ? row.topic_ids
          : row.topic_id
            ? [row.topic_id]
            : [];
  const knowledgePointIds =
    Array.isArray(row.knowledge_point_ids) && row.knowledge_point_ids.length > 0
      ? row.knowledge_point_ids
      : row.knowledge_point_id
        ? [row.knowledge_point_id]
        : [];

  return {
    id: row.id,
    chartId: row.chart_id,
    label: row.statement,
    displayOrder: row.display_order ?? row.sequence ?? 0,
    skillIds,
    knowledgePointIds,
    threshold,
    iconAssetId: row.icon_asset_id ?? undefined,
    badgeId: row.badge_id ?? undefined,
    coachOnly: row.coach_only ?? false,
    celebrationCopy: row.celebration_copy ?? undefined,
    metadata: row.metadata ?? {},
  };
};

const mapCheckChart = (row: any, statements: CheckChartEntry[]): CheckChart => ({
  id: row.id,
  organizationId: row.organization_id ?? undefined,
  title: row.title,
  description: row.description ?? undefined,
  domain: row.domain,
  gradeBand: row.grade_band,
  stageCode: row.stage_code ?? undefined,
  icon: row.icon ?? undefined,
  color: row.color ?? undefined,
  displayOrder: row.display_order ?? undefined,
  statements,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapMotivationTrack = (row: any): MotivationTrack => ({
  id: row.id,
  organizationId: row.organization_id ?? undefined,
  title: row.title,
  description: row.description ?? undefined,
  targetXp: row.target_xp,
  cadence: row.cadence as MotivationTrack["cadence"],
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapMotivationReward = (row: any): MotivationReward => ({
  id: row.id,
  trackId: row.track_id ?? undefined,
  type: row.type,
  title: row.title,
  description: row.description ?? undefined,
  threshold: row.threshold,
  icon: row.icon ?? undefined,
  assetIds: row.asset_ids ?? [],
  metadata: row.metadata ?? {},
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const mapJoyBreak = (row: any): JoyBreak => ({
  id: row.id,
  title: row.title,
  description: row.description ?? undefined,
  durationSeconds: row.duration_seconds,
  assetIds: row.asset_ids ?? [],
  metadata: row.metadata ?? {},
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const listAssetsRoute = createRoute({
  method: "get",
  path: "/api/content/assets",
  tags: ["Content"],
  summary: "List media assets",
  responses: {
    200: {
      description: "Media asset collection",
      content: {
        "application/json": {
          schema: AssetsResponseSchema,
        },
      },
    },
  },
});

app.openapi(listAssetsRoute, async (c) => {
  const items = await tryFetch<Asset[]>(async () => {
    const rows = await db.selectFrom("assets").selectAll().execute();
    return rows.map(mapAsset);
  }, seedAssets);

  return c.json({ items }, 200);
});

const listMicroGamesRoute = createRoute({
  method: "get",
  path: "/api/content/micro-games",
  tags: ["Content"],
  summary: "List micro-games",
  responses: {
    200: {
      description: "Micro-game descriptors",
      content: {
        "application/json": {
          schema: MicroGameResponseSchema,
        },
      },
    },
  },
});

app.openapi(listMicroGamesRoute, async (c) => {
  const items = await tryFetch<MicroGame[]>(async () => {
    const rows = await db.selectFrom("micro_games").selectAll().execute();
    return rows.map(mapMicroGame);
  }, seedMicroGames);

  return c.json({ items }, 200);
});

const listPracticeActivitiesRoute = createRoute({
  method: "get",
  path: "/api/content/practice-activities",
  tags: ["Content"],
  summary: "List practice activity templates",
  responses: {
    200: {
      description: "Practice activity collection",
      content: {
        "application/json": {
          schema: PracticeActivityResponseSchema,
        },
      },
    },
  },
});

app.openapi(listPracticeActivitiesRoute, async (c) => {
  const items = await tryFetch<PracticeActivity[]>(async () => {
    const rows = await db.selectFrom("practice_activities").selectAll().execute();
    return rows.map(mapPracticeActivity);
  }, seedPracticeActivities);

  return c.json({ items }, 200);
});

const listKnowledgePointExperiencesRoute = createRoute({
  method: "get",
  path: "/api/content/experiences",
  tags: ["Content"],
  summary: "List knowledge point experiences",
  responses: {
    200: {
      description: "Knowledge point experience variants",
      content: {
        "application/json": {
          schema: KnowledgePointExperienceResponseSchema,
        },
      },
    },
  },
});

app.openapi(listKnowledgePointExperiencesRoute, async (c) => {
  // Experiences currently live in seed content only; return them directly until writable storage ships.
  const items: KnowledgePointExperience[] = seedKnowledgePointExperiences;
  return c.json({ items }, 200);
});

const listCheckChartsRoute = createRoute({
  method: "get",
  path: "/api/content/check-charts",
  tags: ["Content"],
  summary: "List check charts",
  responses: {
    200: {
      description: "Check chart definitions",
      content: {
        "application/json": {
          schema: CheckChartResponseSchema,
        },
      },
    },
  },
});

app.openapi(listCheckChartsRoute, async (c) => {
  const items = await tryFetch<CheckChart[]>(async () => {
    const [charts, entries] = await Promise.all([
      db.selectFrom("check_charts").selectAll().orderBy("display_order").execute(),
      db
        .selectFrom("check_chart_entries")
        .selectAll()
        .orderBy("chart_id")
        .orderBy("display_order")
        .execute(),
    ]);

    const grouped = new Map<string, CheckChartEntry[]>();
    for (const entryRow of entries) {
      const entry = mapCheckChartEntry(entryRow);
      const key = entry.chartId ?? entryRow.chart_id;
      const bucket = grouped.get(key) ?? [];
      bucket.push(entry);
      grouped.set(key, bucket);
    }

    return charts.map((row) => mapCheckChart(row, grouped.get(row.id) ?? []));
  }, seedCheckCharts);

  return c.json({ items }, 200);
});

const listCheckChartEntriesRoute = createRoute({
  method: "get",
  path: "/api/content/check-charts/:chartId/entries",
  tags: ["Content"],
  summary: "List check chart entries",
  request: {
    params: z.object({
      chartId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Check chart entries",
      content: {
        "application/json": {
          schema: CheckChartEntryResponseSchema,
        },
      },
    },
  },
});

app.openapi(listCheckChartEntriesRoute, async (c) => {
  const { chartId } = c.req.valid("param");
  const fallback = seedCheckChartEntries.filter(
    (entry) => entry.chartId === chartId,
  ) as CheckChartEntry[];
  const items = await tryFetch<CheckChartEntry[]>(async () => {
    const rows = await db
      .selectFrom("check_chart_entries")
      .selectAll()
      .where("chart_id", "=", chartId)
      .orderBy("display_order")
      .execute();
    return rows.map(mapCheckChartEntry);
  }, fallback);

  return c.json({ items }, 200);
});

const listMotivationTracksRoute = createRoute({
  method: "get",
  path: "/api/content/motivation/tracks",
  tags: ["Content"],
  summary: "List motivation tracks",
  responses: {
    200: {
      description: "Motivation tracks",
      content: {
        "application/json": {
          schema: MotivationTrackResponseSchema,
        },
      },
    },
  },
});

app.openapi(listMotivationTracksRoute, async (c) => {
  const items = await tryFetch<MotivationTrack[]>(async () => {
    const rows = await db.selectFrom("motivation_tracks").selectAll().execute();
    return rows.map(mapMotivationTrack);
  }, seedMotivationTracks);

  return c.json({ items }, 200);
});

const listMotivationRewardsRoute = createRoute({
  method: "get",
  path: "/api/content/motivation/rewards",
  tags: ["Content"],
  summary: "List motivation rewards",
  responses: {
    200: {
      description: "Motivation rewards",
      content: {
        "application/json": {
          schema: MotivationRewardResponseSchema,
        },
      },
    },
  },
});

app.openapi(listMotivationRewardsRoute, async (c) => {
  const items = await tryFetch<MotivationReward[]>(async () => {
    const rows = await db.selectFrom("motivation_rewards").selectAll().execute();
    return rows.map(mapMotivationReward);
  }, seedMotivationRewards);

  return c.json({ items }, 200);
});

const listJoyBreaksRoute = createRoute({
  method: "get",
  path: "/api/content/joy-breaks",
  tags: ["Content"],
  summary: "List joy breaks",
  responses: {
    200: {
      description: "Joy break activities",
      content: {
        "application/json": {
          schema: JoyBreakResponseSchema,
        },
      },
    },
  },
});

app.openapi(listJoyBreaksRoute, async (c) => {
  const items = await tryFetch<JoyBreak[]>(async () => {
    const rows = await db.selectFrom("joy_breaks").selectAll().execute();
    return rows.map(mapJoyBreak);
  }, seedJoyBreaks);

  return c.json({ items }, 200);
});

const topicDetailRoute = createRoute({
  method: "get",
  path: "/api/content/topic/:id",
  tags: ["Content"],
  summary: "Get topic detail",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Topic detail",
      content: {
        "application/json": {
          schema: TopicDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(topicDetailRoute, async (c) => {
  const { id } = c.req.valid("param");
  const topic = getTopicById(id);
  if (!topic) {
    return c.json({ error: "Topic not found" }, 404);
  }

  const knowledgePoints = getKnowledgePointsByTopic(topic.id);
  const experiences = getExperiencesForTopic(topic.id);
  return c.json({ topic, knowledgePoints, experiences }, 200);
});

const microGameDetailRoute = createRoute({
  method: "get",
  path: "/api/content/game/:id",
  tags: ["Content"],
  summary: "Get micro-game detail",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Micro-game descriptor",
      content: {
        "application/json": {
          schema: MicroGameDetailResponseSchema,
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(microGameDetailRoute, async (c) => {
  const { id } = c.req.valid("param");
  const game = seedMicroGames.find((item) => item.id === id);
  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  return c.json({ game }, 200);
});

export default app;
