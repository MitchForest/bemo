import { z } from "@hono/zod-openapi";
import { ModalitySchema, TaskIntentSchema, TaskTypeSchema } from "./common";
import { StudentSkillStateSchema } from "./student";

const TaskModalityCapsSchema = z
  .object({
    requiresVoice: z.boolean().optional(),
    requiresTrace: z.boolean().optional(),
    requiresTap: z.boolean().optional(),
    recommendedDevice: z.enum(["touch", "mouse", "keyboard"]).optional(),
    offlineCapable: z.boolean().optional(),
  })
  .openapi({
    description: "Requirements or recommendations for task modality support",
  });

const TaskMotivationSchema = z
  .object({
    xpBonus: z.number().int().optional(),
    rewardIds: z.array(z.string().uuid()).optional(),
    streakImpact: z
      .object({
        type: z.enum(["maintain", "boost", "freeze"]).default("maintain"),
        extraDays: z.number().int().min(0).optional(),
      })
      .optional(),
  })
  .openapi({
    description: "Motivation metadata tied to this task",
  });

export const TaskSchema = z
  .object({
    id: z.string().uuid(),
    type: TaskTypeSchema,
    skillIds: z.array(z.string().uuid()).min(1),
    taskTemplateIds: z.array(z.string().uuid()).default([]),
    estimatedMinutes: z.number().min(1).max(60),
    xpValue: z.number().int().min(1),
    modalities: z.array(ModalitySchema).default(["tap"]),
    modalityCaps: TaskModalityCapsSchema.optional(),
    intent: TaskIntentSchema.optional(),
    reason: z
      .enum([
        "compressed_review",
        "frontier",
        "speed_drill",
        "diagnostic",
        "struggling_support",
        "time_back_unlock",
        "coach_priority",
        "joy_break",
      ])
      .optional(),
    priority: z.number().int().min(1).max(5).default(3),
    scheduledAt: z.string().datetime().optional(),
    dueAt: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    motivation: TaskMotivationSchema.optional(),
    metadata: z.record(z.any()).optional(),
  })
  .openapi({
    description: "Learning task",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174004",
      type: "lesson",
      skillIds: ["123e4567-e89b-12d3-a456-426614174000"],
      estimatedMinutes: 5,
      xpValue: 20,
      modalities: ["tap", "voice"],
      reason: "frontier",
      priority: 4,
    },
  });

export const PlanRequestSchema = z
  .object({
    studentId: z.string().uuid().optional(),
    max: z.coerce.number().int().min(1).max(10).default(5).openapi({
      description: "Maximum number of tasks to return",
      example: 5,
    }),
    includeSpeedDrills: z.coerce.boolean().default(true),
    includeDiagnostic: z.coerce.boolean().default(false),
  })
  .openapi({
    description: "Task planning request",
  });

export const PlanStatsSchema = z
  .object({
    dueSkills: z.number().int().min(0),
    overdueSkills: z.number().int().min(0),
    strugglingSkills: z.number().int().min(0).default(0),
    speedDrillOpportunities: z.number().int().min(0).default(0),
    compressionRatio: z.number().min(0).max(1).optional(),
    plannedMinutes: z.number().min(0).optional(),
  })
  .openapi({
    description: "Summary statistics for a generated learning plan",
  });

export const PlanResponseSchema = z
  .object({
    tasks: z.array(TaskSchema),
    stats: PlanStatsSchema,
    studentStates: z.array(StudentSkillStateSchema).optional(),
    motivation: z
      .object({
        xpTarget: z.number().int().min(0),
        projectedXp: z.number().int().min(0),
        timeBackMinutes: z.number().int().min(0).default(0),
      })
      .optional(),
  })
  .openapi({
    description: "Task planning response",
  });

export type Task = z.infer<typeof TaskSchema>;
export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type PlanStats = z.infer<typeof PlanStatsSchema>;
export type TaskModalityCaps = z.infer<typeof TaskModalityCapsSchema>;
export type TaskMotivation = z.infer<typeof TaskMotivationSchema>;
