import { z } from "@hono/zod-openapi";
import { MotivationStreakSchema } from "./motivation";
import { PlanStatsSchema } from "./task";

const ISODateStringSchema = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
  .openapi({ description: "ISO date (YYYY-MM-DD)" });

export const DailyProgressSchema = z
  .object({
    date: ISODateStringSchema,
    xp: z.number().int().min(0),
    minutes: z.number().int().min(0),
    tasksCompleted: z.number().int().min(0),
  })
  .openapi({ description: "Daily practice metrics" });

export const ReportHighlightSchema = z
  .object({
    type: z.enum(["celebration", "growth", "alert"]),
    title: z.string(),
    description: z.string(),
  })
  .openapi({ description: "Narrative highlight for weekly report" });

export const CoachActionSchema = z
  .object({
    actionId: z.string(),
    title: z.string(),
    description: z.string(),
    skillId: z.string().uuid().optional(),
  })
  .openapi({ description: "Suggested action for coach or parent" });

export const WeeklyReportSchema = z
  .object({
    studentId: z.string().uuid(),
    weekOf: ISODateStringSchema,
    xpTotal: z.number().int().min(0),
    minutesTotal: z.number().int().min(0),
    streak: MotivationStreakSchema,
    planStats: PlanStatsSchema.optional(),
    daily: z.array(DailyProgressSchema),
    highlights: z.array(ReportHighlightSchema),
    coachActions: z.array(CoachActionSchema),
  })
  .openapi({ description: "Weekly progress digest" });

export type WeeklyReport = z.infer<typeof WeeklyReportSchema>;
export type DailyProgress = z.infer<typeof DailyProgressSchema>;
export type ReportHighlight = z.infer<typeof ReportHighlightSchema>;
export type CoachAction = z.infer<typeof CoachActionSchema>;
