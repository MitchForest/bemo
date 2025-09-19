import { z } from "@hono/zod-openapi";
import { ResultSchema } from "./common";

export const InputPayloadSchema = z
  .object({
    voiceConfidence: z.number().min(0).max(1).optional(),
    tracePath: z.array(z.array(z.number())).optional().openapi({
      description: "Array of [x, y, timestamp] coordinates",
    }),
    audioPath: z.string().optional(),
    textInput: z.string().optional(),
    dragPositions: z
      .record(
        z.object({
          x: z.number(),
          y: z.number(),
        }),
      )
      .optional(),
  })
  .openapi({ description: "Input data from various modalities" });

export const EvidenceEventSchema = z
  .object({
    studentId: z.string().uuid(),
    skillId: z.string().uuid(),
    itemId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    taskTemplateId: z.string().uuid().optional(),
    timestamp: z.string().datetime(),
    result: ResultSchema,
    latencyMs: z.number().int().min(0),
    hintsUsed: z.number().int().min(0).default(0),
    inputPayload: InputPayloadSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .openapi({
    description: "Evidence event from student interaction",
    example: {
      studentId: "123e4567-e89b-12d3-a456-426614174003",
      skillId: "123e4567-e89b-12d3-a456-426614174000",
      itemId: "123e4567-e89b-12d3-a456-426614174001",
      timestamp: "2024-01-15T10:30:00Z",
      result: "correct",
      latencyMs: 2500,
      hintsUsed: 0,
    },
  });

export const SubmitEvidenceSchema = z
  .object({
    taskId: z.string().uuid(),
    events: z.array(EvidenceEventSchema),
  })
  .openapi({
    description: "Submit evidence batch",
  });

export const EvidenceResponseSchema = z
  .object({
    success: z.boolean(),
    updatedStates: z
      .array(
        z.object({
          skillId: z.string().uuid(),
          dueAt: z.string().datetime(),
          stability: z.number(),
          strength: z.number(),
        }),
      )
      .optional(),
    xpEarned: z.number().int().min(0).optional(),
    achievements: z
      .array(
        z.object({
          type: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      )
      .optional(),
  })
  .openapi({
    description: "Evidence submission response",
  });

export type EvidenceEvent = z.infer<typeof EvidenceEventSchema>;
export type SubmitEvidence = z.infer<typeof SubmitEvidenceSchema>;
export type EvidenceResponse = z.infer<typeof EvidenceResponseSchema>;
export type InputPayload = z.infer<typeof InputPayloadSchema>;
