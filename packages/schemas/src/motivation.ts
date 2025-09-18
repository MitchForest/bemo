import { z } from "@hono/zod-openapi";
import { MotivationRewardSchema, MotivationTrackSchema, JoyBreakSchema } from "./content";

export const MotivationStreakSchema = z
  .object({
    current: z.number().int().min(0),
    longest: z.number().int().min(0),
    isActive: z.boolean(),
    lastActiveDate: z.string().datetime().optional(),
  })
  .openapi({ description: "Streak progress for a learner" });

export const MotivationTrackProgressSchema = MotivationTrackSchema.extend({
  progressXp: z.number().int().min(0),
  percentComplete: z.number().min(0).max(1),
  nextReward: MotivationRewardSchema.optional(),
  unlockedRewards: z.array(MotivationRewardSchema).default([]),
});

export const MotivationRewardProgressSchema = MotivationRewardSchema.extend({
  unlocked: z.boolean(),
  progress: z.number().min(0).max(1),
});

export const ClaimRewardRequestSchema = z
  .object({
    studentId: z.string().uuid(),
    rewardId: z.string().uuid(),
  })
  .openapi({ description: "Request to claim a motivation reward" });

export const ClaimRewardResponseSchema = z
  .object({
    success: z.boolean(),
    reward: MotivationRewardSchema.optional(),
    newJoyBreak: JoyBreakSchema.optional(),
    timeBackMinutesGranted: z.number().int().min(0).default(0),
  })
  .openapi({ description: "Response after claiming a reward" });

const MotivationLeagueTypeSchema = z
  .enum(["solo", "squad"])
  .openapi({ description: "League configuration type" });

export const MotivationSquadMemberSchema = z
  .object({
    studentId: z.string().uuid(),
    displayName: z.string(),
    avatarUrl: z.string().url().optional(),
    xpThisWeek: z.number().int().min(0),
    isLeader: z.boolean().default(false),
  })
  .openapi({ description: "Squad member with weekly XP contribution" });

export const MotivationSquadSchema = z
  .object({
    id: z.string().uuid(),
    leagueId: z.string().uuid(),
    name: z.string().min(1).max(80),
    description: z.string().max(240).optional(),
    invitationCode: z.string().length(6).optional(),
    members: z.array(MotivationSquadMemberSchema),
    weeklyXp: z.number().int().min(0),
    rank: z.number().int().min(1),
  })
  .openapi({ description: "Learner squad participating in a motivation league" });

export const MotivationLeagueSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    type: MotivationLeagueTypeSchema,
    tier: z.enum(["spark", "glow", "flare", "nova"]).default("spark"),
    rank: z.number().int().min(1),
    squads: z.array(MotivationSquadSchema).default([]),
    weeklyXpTarget: z.number().int().min(0).default(0),
  })
  .openapi({ description: "Motivation league summarising squads/solo ladders" });

export const MotivationQuestTaskSchema = z
  .object({
    id: z.string().uuid(),
    description: z.string().min(1),
    progress: z.number().min(0).max(1).default(0),
    completed: z.boolean().default(false),
  })
  .openapi({ description: "Atomic requirement for a motivation quest" });

export const MotivationQuestSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(120),
    description: z.string().max(240).optional(),
    type: z.enum(["daily", "weekly", "seasonal"]),
    xpReward: z.number().int().min(0).default(0),
    badgeId: z.string().uuid().optional(),
    tasks: z.array(MotivationQuestTaskSchema),
    status: z.enum(["locked", "active", "completed", "claimed"]).default("active"),
    progressPercent: z.number().min(0).max(1).default(0),
    expiresAt: z.string().datetime().optional(),
  })
  .openapi({ description: "Multi-step quest aligned with motivation profile" });

export const TimeBackLedgerEntrySchema = z
  .object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    source: z.enum(["daily_goal", "quest", "coach_award", "manual"]),
    minutesGranted: z.number().int().min(0),
    grantedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    consumedAt: z.string().datetime().optional(),
    note: z.string().max(200).optional(),
  })
  .openapi({ description: "Ledger entry tracking time-back rewards" });

export const MotivationDigestSchema = z
  .object({
    studentId: z.string().uuid(),
    recipient: z.enum(["coach", "parent"]),
    weekOf: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
    xpEarned: z.number().int().min(0),
    minutesOnTask: z.number().int().min(0),
    streak: MotivationStreakSchema,
    highlights: z.array(z.string()),
    suggestedActions: z.array(z.string()),
    upcomingMilestones: z.array(z.string()).default([]),
    timeBackAvailableMinutes: z.number().int().min(0).default(0),
  })
  .openapi({ description: "Digest payload for adults summarising learner motivation" });

export const MotivationSummarySchema = z
  .object({
    studentId: z.string().uuid(),
    dailyGoalXp: z.number().int().min(0),
    xpEarnedToday: z.number().int().min(0),
    xpRemainingToday: z.number().int().min(0),
    projectedCompletionMinutes: z.number().int().min(0).optional(),
    streak: MotivationStreakSchema,
    tracks: z.array(MotivationTrackProgressSchema),
    pendingRewards: z.array(MotivationRewardProgressSchema),
    availableJoyBreak: JoyBreakSchema.pick({ id: true, title: true, durationSeconds: true })
      .extend({
        available: z.boolean(),
        cooldownSeconds: z.number().int().min(0).default(0),
      })
      .optional(),
    timeBackMinutes: z.number().int().min(0).default(0),
    activeLeague: MotivationLeagueSchema.optional(),
    activeSquad: MotivationSquadSchema.optional(),
    quests: z.array(MotivationQuestSchema).default([]),
    timeBackLedger: z.array(TimeBackLedgerEntrySchema).default([]),
  })
  .openapi({ description: "Aggregated motivation state for a learner" });

export type MotivationSummary = z.infer<typeof MotivationSummarySchema>;
export type MotivationTrackProgress = z.infer<typeof MotivationTrackProgressSchema>;
export type MotivationRewardProgress = z.infer<typeof MotivationRewardProgressSchema>;
export type MotivationStreak = z.infer<typeof MotivationStreakSchema>;
export type ClaimRewardRequest = z.infer<typeof ClaimRewardRequestSchema>;
export type ClaimRewardResponse = z.infer<typeof ClaimRewardResponseSchema>;
export type MotivationLeague = z.infer<typeof MotivationLeagueSchema>;
export type MotivationSquad = z.infer<typeof MotivationSquadSchema>;
export type MotivationSquadMember = z.infer<typeof MotivationSquadMemberSchema>;
export type MotivationQuest = z.infer<typeof MotivationQuestSchema>;
export type MotivationQuestTask = z.infer<typeof MotivationQuestTaskSchema>;
export type TimeBackLedgerEntry = z.infer<typeof TimeBackLedgerEntrySchema>;
export type MotivationDigest = z.infer<typeof MotivationDigestSchema>;
