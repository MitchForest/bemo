import { z } from "@hono/zod-openapi";
import { ModalitySchema, TaskTypeSchema } from "./common";

export const TaskSchema = z
  .object({
    id: z.string().uuid(),
    type: TaskTypeSchema,
    topicIds: z.array(z.string().uuid()),
    knowledgePointIds: z.array(z.string().uuid()).default([]),
    estimatedMinutes: z.number().min(1).max(60),
    xpValue: z.number().int().min(1),
    modalities: z.array(ModalitySchema).default(["tap"]),
    reason: z
      .enum(["compressed_review", "frontier", "speed_drill", "diagnostic", "struggling_support"])
      .optional(),
    metadata: z.record(z.any()).optional(),
  })
  .openapi({
    description: "Learning task",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174004",
      type: "lesson",
      topicIds: ["123e4567-e89b-12d3-a456-426614174000"],
      estimatedMinutes: 5,
      xpValue: 20,
      modalities: ["tap", "voice"],
      reason: "frontier",
    },
  });

export const PlanRequestSchema = z
  .object({
    studentId: z.string().uuid().optional(),
    max: z.number().int().min(1).max(10).default(5).openapi({
      description: "Maximum number of tasks to return",
      example: 5,
    }),
    includeSpeedDrills: z.boolean().default(true),
    includeDiagnostic: z.boolean().default(false),
  })
  .openapi({
    description: "Task planning request",
  });

export const PlanResponseSchema = z
  .object({
    tasks: z.array(TaskSchema),
    metadata: z
      .object({
        dueTopicsCount: z.number().int().min(0),
        overdueTopicsCount: z.number().int().min(0),
        compressionRatio: z.number().min(0).optional(),
      })
      .optional(),
  })
  .openapi({
    description: "Task planning response",
  });

export type Task = z.infer<typeof TaskSchema>;
export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
