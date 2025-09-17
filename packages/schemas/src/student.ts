import { z } from "@hono/zod-openapi";

export const StudentProfileSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    name: z.string().min(1).max(100),
    grade: z.string(),
    birthDate: z.string().datetime().optional(),
    parentIds: z.array(z.string().uuid()).default([]),
    coachIds: z.array(z.string().uuid()).default([]),
    motivationProfile: z
      .object({
        preferCompetition: z.boolean().default(false),
        preferMastery: z.boolean().default(true),
        preferSocial: z.boolean().default(false),
      })
      .default({}),
    settings: z
      .object({
        dailyXpGoal: z.number().int().min(10).max(100).default(30),
        soundEnabled: z.boolean().default(true),
        musicEnabled: z.boolean().default(true),
        accessibilityMode: z.string().optional(),
      })
      .default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({
    description: "Student profile",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174003",
      name: "Emma Smith",
      grade: "K",
      settings: { dailyXpGoal: 30 },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  });

export const StudentTopicStateSchema = z
  .object({
    studentId: z.string().uuid(),
    topicId: z.string().uuid(),
    stability: z.number().min(0).openapi({
      description: "Memory half-life proxy",
      example: 1.0,
    }),
    strength: z.number().min(0).max(1).openapi({
      description: "Current strength/confidence",
      example: 0.7,
    }),
    repNum: z.number().int().min(0).openapi({
      description: "Number of repetitions",
      example: 3,
    }),
    dueAt: z.string().datetime(),
    lastSeenAt: z.string().datetime().optional(),
    avgLatencyMs: z.number().int().min(0).optional(),
    speedFactor: z.number().min(0).default(1.0).openapi({
      description: "Speed relative to expected",
      example: 1.2,
    }),
    strugglingFlag: z.boolean().default(false),
    overdueDays: z.number().int().min(0).default(0),
    easiness: z.number().min(1).max(5).optional().openapi({
      description: "SM-2 style easiness factor",
    }),
  })
  .openapi({
    description: "Student state for a topic",
    example: {
      studentId: "123e4567-e89b-12d3-a456-426614174003",
      topicId: "123e4567-e89b-12d3-a456-426614174000",
      stability: 1.5,
      strength: 0.8,
      repNum: 5,
      dueAt: "2024-01-15T00:00:00Z",
    },
  });

export const StudentStatsSchema = z
  .object({
    studentId: z.string().uuid(),
    totalXp: z.number().int().min(0),
    currentStreak: z.number().int().min(0),
    longestStreak: z.number().int().min(0),
    totalMinutes: z.number().int().min(0),
    topicsCompleted: z.number().int().min(0),
    speedDrillsCompleted: z.number().int().min(0),
    lastActiveAt: z.string().datetime(),
    weeklyXp: z
      .array(
        z.object({
          date: z.string(),
          xp: z.number().int().min(0),
        }),
      )
      .default([]),
  })
  .openapi({ description: "Student statistics" });

export type StudentProfile = z.infer<typeof StudentProfileSchema>;
export type StudentTopicState = z.infer<typeof StudentTopicStateSchema>;
export type StudentStats = z.infer<typeof StudentStatsSchema>;
