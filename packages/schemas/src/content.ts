import { z } from "@hono/zod-openapi";
import {
  AssetTypeSchema,
  LessonStepKindSchema,
  PracticeActivityTypeSchema,
  MicroGameGenreSchema,
  RewardTypeSchema,
  ModalitySchema,
  DomainSchema,
  GradeBandSchema,
  SensoryTagSchema,
  ExperiencePurposeSchema,
} from "./common";
import { MathStageCodeSchema } from "./curriculum";

export const AssetSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    type: AssetTypeSchema,
    uri: z.string().url(),
    altText: z.string().optional(),
    locale: z.string().default("en"),
    durationMs: z.number().int().min(0).optional(),
    transcript: z.string().optional(),
    metadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Reusable media asset" });

export const LessonStepSchema = z
  .object({
    id: z.string().uuid(),
    sectionId: z.string().uuid(),
    kind: LessonStepKindSchema,
    title: z.string().min(1).max(200).optional(),
    script: z.string().optional(),
    studentAction: z.string().optional(),
    modality: ModalitySchema.optional(),
    assetIds: z.array(z.string().uuid()).default([]),
    cues: z.array(z.string()).default([]),
    durationSeconds: z.number().int().min(0).optional(),
    transitionTo: z.string().uuid().optional(),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({ description: "Atomic instructional move inside a lesson section" });

export const PracticeActivitySchema = z
  .object({
    id: z.string().uuid(),
    knowledgePointId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    skillId: z.string().uuid().optional(),
    type: PracticeActivityTypeSchema,
    title: z.string().min(1).max(160),
    description: z.string().optional(),
    microGameId: z.string().uuid().optional(),
    config: z.record(z.any()).default({}),
    expectedMinutes: z.number().int().min(0).optional(),
    assetIds: z.array(z.string().uuid()).default([]),
    modalities: z.array(ModalitySchema).default([]),
    sensoryTags: z.array(SensoryTagSchema).default([]),
    purposes: z.array(ExperiencePurposeSchema).default([]),
    difficultyBand: z.enum(["intro", "core", "stretch"]).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Reusable practice blueprint" });

export const MicroGameSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().min(1).max(120),
    title: z.string().min(1).max(200),
    genre: MicroGameGenreSchema,
    description: z.string().optional(),
    domain: DomainSchema.optional(),
    engineHooks: z.record(z.any()).default({}),
    ioSchema: z.record(z.any()).default({}),
    ui: z.record(z.any()).default({}),
    assetIds: z.array(z.string().uuid()).default([]),
    modalities: z.array(ModalitySchema).default([]),
    sensoryTags: z.array(SensoryTagSchema).default([]),
    purposes: z.array(ExperiencePurposeSchema).default([]),
    difficultyBand: z.enum(["intro", "core", "stretch"]).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Configurable micro-game descriptor" });

export const CheckChartThresholdSchema = z
  .object({
    accuracy: z
      .number()
      .min(0)
      .max(1)
      .openapi({ description: "Required accuracy ratio", example: 0.9 }),
    consecutivePasses: z
      .number()
      .int()
      .min(1)
      .openapi({ description: "Consecutive passes required", example: 2 }),
    latencyMs: z
      .number()
      .int()
      .min(0)
      .optional()
      .openapi({ description: "Optional latency target in milliseconds", example: 3000 }),
  })
  .openapi({ description: "Completion criteria for a check chart statement" });

export const CheckChartStatementSchema = z
  .object({
    id: z.string().uuid(),
    chartId: z.string().uuid().optional(),
    label: z.string().min(1).max(200),
    skillIds: z.array(z.string().uuid()).default([]),
    knowledgePointIds: z.array(z.string().uuid()).default([]),
    threshold: CheckChartThresholdSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
    iconAssetId: z.string().uuid().optional(),
    badgeId: z.string().uuid().optional(),
    coachOnly: z.boolean().default(false),
    celebrationCopy: z.string().optional(),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({ description: "Progress statement inside a check chart" });

export const CheckChartSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid().optional(),
    title: z.string().min(1).max(160),
    description: z.string().optional(),
    domain: DomainSchema,
    gradeBand: GradeBandSchema,
    stageCode: MathStageCodeSchema.optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    displayOrder: z.number().int().min(0).optional(),
    statements: z.array(CheckChartStatementSchema).default([]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Progress chart shown to students" });

export const CheckChartEntrySchema = CheckChartStatementSchema;

export const MotivationTrackSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid().optional(),
    title: z.string().min(1).max(160),
    description: z.string().optional(),
    targetXp: z.number().int().min(0).default(0),
    cadence: z.enum(["daily", "weekly", "monthly"]).default("daily"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "XP or streak ladder configuration" });

export const MotivationRewardSchema = z
  .object({
    id: z.string().uuid(),
    trackId: z.string().uuid().optional(),
    type: RewardTypeSchema,
    title: z.string().min(1).max(160),
    description: z.string().optional(),
    threshold: z.number().int().min(0).default(0),
    icon: z.string().optional(),
    assetIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Badge, sticker, or unlockable reward" });

export const JoyBreakSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(160),
    description: z.string().optional(),
    durationSeconds: z.number().int().min(30).max(600).default(120),
    assetIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Short break or calming activity" });

export type Asset = z.infer<typeof AssetSchema>;
export type LessonStep = z.infer<typeof LessonStepSchema>;
export type PracticeActivity = z.infer<typeof PracticeActivitySchema>;
export type MicroGame = z.infer<typeof MicroGameSchema>;
export type CheckChartThreshold = z.infer<typeof CheckChartThresholdSchema>;
export type CheckChartStatement = z.infer<typeof CheckChartStatementSchema>;
export type CheckChart = z.infer<typeof CheckChartSchema>;
export type CheckChartEntry = z.infer<typeof CheckChartEntrySchema>;
export type MotivationTrack = z.infer<typeof MotivationTrackSchema>;
export type MotivationReward = z.infer<typeof MotivationRewardSchema>;
export type JoyBreak = z.infer<typeof JoyBreakSchema>;
