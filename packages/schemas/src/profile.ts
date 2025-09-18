import { z } from "@hono/zod-openapi";
import { DomainSchema } from "./common";
import { StudentProfileSchema, StudentSkillStateSchema } from "./student";
import { CheckChartSchema } from "./content";
import { TaskSchema, PlanStatsSchema } from "./task";
import { MotivationSummarySchema } from "./motivation";

export const MasterySummarySchema = z
  .object({
    domain: DomainSchema,
    averageStrength: z.number().min(0).max(1),
    skillCount: z.number().int().min(0),
    dueCount: z.number().int().min(0),
    strugglingCount: z.number().int().min(0),
  })
  .openapi({ description: "Aggregate mastery stats by domain" });

export const DueSkillSchema = z
  .object({
    skillId: z.string().uuid(),
    title: z.string(),
    dueAt: z.string().datetime(),
    strength: z.number().min(0).max(1),
    overdueDays: z.number().int().min(0),
    reason: z.enum(["review", "reteach", "diagnostic", "speed"]),
  })
  .openapi({ description: "Upcoming or overdue skill summary" });

export const SpeedFlagSchema = z
  .object({
    skillId: z.string().uuid(),
    title: z.string(),
    avgLatencyMs: z.number().int().min(0),
    targetLatencyMs: z.number().int().min(0),
    speedFactor: z.number().min(0),
  })
  .openapi({ description: "Speed fluency indicator" });

export const CheckChartProgressSchema = CheckChartSchema.extend({
  completedEntryIds: z.array(z.string().uuid()),
  nextEntryId: z.string().uuid().optional(),
}).openapi({ description: "Learner's progress on a check chart" });

export const StudentProfileSummarySchema = z
  .object({
    profile: StudentProfileSchema,
    mastery: z.array(MasterySummarySchema),
    dueSkills: z.array(DueSkillSchema),
    speedFlags: z.array(SpeedFlagSchema),
    latestPlan: z
      .object({
        generatedAt: z.string().datetime(),
        stats: PlanStatsSchema,
        tasks: z.array(TaskSchema),
      })
      .optional(),
    skillStates: z.array(StudentSkillStateSchema),
    checkCharts: z.array(CheckChartProgressSchema),
    motivation: MotivationSummarySchema.optional(),
  })
  .openapi({ description: "Full profile summary for dashboard clients" });

export type StudentProfileSummary = z.infer<typeof StudentProfileSummarySchema>;
export type MasterySummary = z.infer<typeof MasterySummarySchema>;
export const DueTopicSchema = DueSkillSchema;
export type DueSkill = z.infer<typeof DueSkillSchema>;
export type DueTopic = DueSkill;
export type SpeedFlag = z.infer<typeof SpeedFlagSchema>;
