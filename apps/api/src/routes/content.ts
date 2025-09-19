import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import {
  getSkillById,
  getTaskTemplatesBySkill,
  seedAssets,
  seedCheckChartEntries,
  seedCheckCharts,
  seedJoyBreaks,
  seedMicroGames,
  seedMotivationRewards,
  seedMotivationTracks,
  seedPracticeActivities,
} from "@repo/curriculum";
import { getDb, isDatabaseConfigured } from "@repo/db";
import type {
  Asset,
  CheckChart,
  CheckChartEntry,
  JoyBreak,
  MicroGame,
  MotivationReward,
  MotivationTrack,
  PracticeActivity,
  Skill,
  SkillTaskTemplate,
} from "@repo/schemas";
import {
  AssetSchema,
  CheckChartEntrySchema,
  CheckChartSchema,
  JoyBreakSchema,
  MicroGameSchema,
  MotivationRewardSchema,
  MotivationTrackSchema,
  PracticeActivitySchema,
  SkillSchema,
  SkillTaskTemplateSchema,
} from "@repo/schemas";

const app = new OpenAPIHono();

const AssetsResponseSchema = z.object({ items: z.array(AssetSchema) });
const MicroGameResponseSchema = z.object({ items: z.array(MicroGameSchema) });
const PracticeActivityResponseSchema = z.object({ items: z.array(PracticeActivitySchema) });
const CheckChartResponseSchema = z.object({ items: z.array(CheckChartSchema) });
const CheckChartEntryResponseSchema = z.object({ items: z.array(CheckChartEntrySchema) });
const MotivationTrackResponseSchema = z.object({ items: z.array(MotivationTrackSchema) });
const MotivationRewardResponseSchema = z.object({ items: z.array(MotivationRewardSchema) });
const JoyBreakResponseSchema = z.object({ items: z.array(JoyBreakSchema) });
const SkillDetailResponseSchema = z
  .object({
    skill: SkillSchema,
    taskTemplates: z.array(SkillTaskTemplateSchema),
  })
  .openapi({ description: "Skill detail with task templates" });
const MicroGameDetailResponseSchema = z
  .object({
    game: MicroGameSchema,
  })
  .openapi({ description: "Micro-game descriptor" });

async function tryFetch<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDatabaseConfigured()) {
    return fallback;
  }
  try {
    return await query();
  } catch (error) {
    console.warn("[content] Falling back to seed data", error);
    return fallback;
  }
}

type SkillDetail = {
  skill: Skill;
  taskTemplates: SkillTaskTemplate[];
};

async function fetchSkillDetailFromDatabase(id: string): Promise<SkillDetail> {
  const db = getDb();

  const skillRow = await db
    .selectFrom("skills")
    .select([
      "id",
      "title",
      "domain",
      "strand",
      "grade_band",
      "stage_code",
      "description",
      "interference_group",
      "expected_time_seconds",
      "check_chart_tags",
      "assets",
      "subject_id",
      "course_id",
      "lesson_id",
    ])
    .where("id", "=", id)
    .executeTakeFirst();

  if (!skillRow) {
    throw new Error("skill:not_found");
  }

  const prereqRows = await db
    .selectFrom("skill_prerequisites")
    .select(["skill_id", "prerequisite_skill_id", "gate"])
    .where("skill_id", "=", id)
    .execute();

  const encompassingRows = await db
    .selectFrom("skill_encompassing")
    .select(["child_skill_id", "parent_skill_id", "weight"])
    .where("child_skill_id", "=", id)
    .execute();

  const skill: Skill = {
    id: skillRow.id,
    title: skillRow.title,
    domain: skillRow.domain as Skill["domain"],
    strand: skillRow.strand,
    gradeBand: skillRow.grade_band as Skill["gradeBand"],
    stageCode: (skillRow.stage_code ?? undefined) as Skill["stageCode"],
    description: skillRow.description ?? undefined,
    subjectId: skillRow.subject_id ?? undefined,
    courseId: skillRow.course_id ?? undefined,
    lessonId: skillRow.lesson_id ?? undefined,
    prerequisites: prereqRows.map((row) => ({
      skillId: row.prerequisite_skill_id,
      gate: row.gate as "AND" | "OR",
    })),
    encompassing: encompassingRows.map((row) => ({
      skillId: row.parent_skill_id,
      weight: Number(row.weight),
    })),
    interferenceGroup: skillRow.interference_group ?? undefined,
    expectedTimeSeconds: Number(skillRow.expected_time_seconds),
    checkChartTags: (skillRow.check_chart_tags ?? []) as string[],
    assets: (skillRow.assets ?? []) as string[],
  };

  const templateRows = await db
    .selectFrom("skill_task_templates")
    .select([
      "id",
      "skill_id",
      "intent",
      "title",
      "xp_award",
      "estimated_minutes",
      "modalities",
      "sensory_tags",
      "definition",
      "metadata",
    ])
    .where("skill_id", "=", id)
    .execute();

  const taskTemplates: SkillTaskTemplate[] = templateRows.map((row) => ({
    id: row.id,
    skillId: row.skill_id,
    intent: row.intent as SkillTaskTemplate["intent"],
    title: row.title,
    xpAward: Number(row.xp_award ?? 0),
    estimatedMinutes: Number(row.estimated_minutes ?? 1),
    modalities: (row.modalities ?? []) as SkillTaskTemplate["modalities"],
    sensoryTags: (row.sensory_tags ?? []) as SkillTaskTemplate["sensoryTags"],
    steps: ((row.definition ?? {}) as { steps?: SkillTaskTemplate["steps"] }).steps ?? [],
    metadata: (row.metadata ?? {}) as SkillTaskTemplate["metadata"],
  }));

  return { skill, taskTemplates };
}

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
const mapPracticeActivity = (row: any): PracticeActivity => ({
  id: row.id,
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
const mapCheckChartEntry = (row: any): CheckChartEntry => {
  const threshold =
    row.threshold && Object.keys(row.threshold).length > 0 ? row.threshold : undefined;
  const skillIds =
    Array.isArray(row.skill_ids) && row.skill_ids.length > 0
      ? row.skill_ids
      : row.skill_id
        ? [row.skill_id]
        : [];
  return {
    id: row.id,
    chartId: row.chart_id,
    label: row.statement,
    displayOrder: row.display_order ?? row.sequence ?? 0,
    skillIds,
    threshold,
    iconAssetId: row.icon_asset_id ?? undefined,
    badgeId: row.badge_id ?? undefined,
    coachOnly: row.coach_only ?? false,
    celebrationCopy: row.celebration_copy ?? undefined,
    metadata: row.metadata ?? {},
  };
};

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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

// biome-ignore lint/suspicious/noExplicitAny: Database row type
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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
    const rows = await db.selectFrom("practice_activities").selectAll().execute();
    return rows.map(mapPracticeActivity);
  }, seedPracticeActivities);

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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
    const rows = await db.selectFrom("joy_breaks").selectAll().execute();
    return rows.map(mapJoyBreak);
  }, seedJoyBreaks);

  return c.json({ items }, 200);
});

const skillDetailRoute = createRoute({
  method: "get",
  path: "/api/content/skill/:id",
  tags: ["Content"],
  summary: "Get skill detail",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Skill detail",
      content: {
        "application/json": {
          schema: SkillDetailResponseSchema,
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

app.openapi(skillDetailRoute, async (c) => {
  const { id } = c.req.valid("param");

  const fallbackDetail = (() => {
    const skill = getSkillById(id);
    if (!skill) return null;
    const taskTemplates = getTaskTemplatesBySkill(id);
    return { skill, taskTemplates } as SkillDetail;
  })();

  const detail = await tryFetch<SkillDetail | null>(
    () => fetchSkillDetailFromDatabase(id),
    fallbackDetail,
  );

  if (!detail) {
    return c.json({ error: "Skill not found" }, 404);
  }

  return c.json(detail, 200);
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
