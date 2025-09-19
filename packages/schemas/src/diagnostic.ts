import { z } from "@hono/zod-openapi";
import { ItemTypeSchema, ResultSchema } from "./common";

export const DiagnosticPromptSchema = z
  .object({
    stem: z.string(),
    itemType: ItemTypeSchema,
    options: z.array(z.string()).optional(),
    assetIds: z.array(z.string().uuid()).optional(),
    manipulatives: z.array(z.string().uuid()).optional(),
    timerSeconds: z.number().int().min(0).optional(),
    hints: z.array(z.string()).optional(),
  })
  .openapi({ description: "Prompt configuration for a diagnostic probe" });

export const DiagnosticProbeSchema = z
  .object({
    id: z.string().uuid(),
    skillId: z.string().uuid(),
    difficulty: z.number().min(0).max(1),
    prompt: DiagnosticPromptSchema,
    expectedLatencyMs: z.number().int().min(0).optional(),
    tags: z.array(z.string()).default([]),
  })
  .openapi({ description: "Single diagnostic probe specification" });

export const DiagnosticSessionStatusSchema = z
  .enum(["not_started", "in_progress", "completed"])
  .openapi({ description: "Lifecycle state of a diagnostic session" });

export const DiagnosticSessionSummarySchema = z
  .object({
    studentId: z.string().uuid(),
    status: DiagnosticSessionStatusSchema,
    activeSkillIds: z.array(z.string().uuid()),
    provisionalMastery: z.array(
      z.object({
        skillId: z.string().uuid(),
        strength: z.number().min(0).max(1),
        stability: z.number().min(0).default(0),
        recommendation: z.enum(["advance", "review", "reteach"]),
      }),
    ),
    completedAt: z.string().datetime().optional(),
  })
  .openapi({ description: "Summary of in-progress diagnostic" });

export const DiagnosticNextRequestSchema = z
  .object({
    studentId: z.string().uuid(),
    skillId: z.string().uuid().optional(),
  })
  .openapi({ description: "Request payload for the next diagnostic probe" });

export const DiagnosticNextResponseSchema = z
  .object({
    probe: DiagnosticProbeSchema.optional(),
    session: DiagnosticSessionSummarySchema,
  })
  .openapi({ description: "Response containing the next diagnostic probe" });

export const DiagnosticAnswerRequestSchema = z
  .object({
    studentId: z.string().uuid(),
    probeId: z.string().uuid(),
    result: ResultSchema,
    latencyMs: z.number().int().min(0),
    confidence: z.number().min(0).max(1).optional(),
  })
  .openapi({ description: "Response payload when a learner answers a diagnostic probe" });

export const DiagnosticAnswerResponseSchema = z
  .object({
    nextProbe: DiagnosticProbeSchema.optional(),
    session: DiagnosticSessionSummarySchema,
    completed: z.boolean(),
  })
  .openapi({ description: "Next probe and session state after submitting an answer" });

export type DiagnosticProbe = z.infer<typeof DiagnosticProbeSchema>;
export type DiagnosticPrompt = z.infer<typeof DiagnosticPromptSchema>;
export type DiagnosticSessionSummary = z.infer<typeof DiagnosticSessionSummarySchema>;
export type DiagnosticAnswerRequest = z.infer<typeof DiagnosticAnswerRequestSchema>;
export type DiagnosticAnswerResponse = z.infer<typeof DiagnosticAnswerResponseSchema>;
export type DiagnosticNextRequest = z.infer<typeof DiagnosticNextRequestSchema>;
export type DiagnosticNextResponse = z.infer<typeof DiagnosticNextResponseSchema>;
