import { randomUUID } from "node:crypto";
import {
  seedMotivationLeagues,
  seedMotivationQuests,
  seedSkills,
  seedTimeBackLedger,
} from "@repo/curriculum";
import { getDb, isDatabaseConfigured } from "@repo/db";
import { MotivationQuestSchema } from "@repo/schemas";
import type {
  MotivationQuest,
  Skill,
  StudentProfile,
  StudentSkillState,
  StudentStats,
  TimeBackLedgerEntry,
} from "@repo/schemas";
import { sql } from "kysely";

const PREREQUISITE_STRENGTH_THRESHOLD = 0.6;
const SKILL_CACHE_WINDOW_MS = 5 * 60 * 1000;

let cachedSkills: Skill[] | null = null;
let lastSkillCacheMs = 0;

const fallbackLeagueMembership = new Map<string, { leagueId: string; squadId?: string }>();
const fallbackQuests = new Map<string, MotivationQuest[]>();
const fallbackTimeBackLedger = new Map<string, TimeBackLedgerEntry[]>();

function cloneQuestList(quests: MotivationQuest[]): MotivationQuest[] {
  return quests.map((quest) => ({
    ...quest,
    tasks: quest.tasks.map((task) => ({ ...task })),
  }));
}

function parseQuestRows(value: unknown): MotivationQuest[] {
  const parsed = MotivationQuestSchema.array().safeParse(value ?? []);
  if (!parsed.success) {
    console.warn("[engine] Invalid quest payload, falling back to defaults", parsed.error);
    return [];
  }
  return parsed.data;
}

function normalizeGradeBand(input?: string): "PreK" | "K" | "1" | "2" {
  if (input === "PreK" || input === "K" || input === "1" || input === "2") {
    return input;
  }
  return "K";
}
const fallbackStudentProfiles = new Map<string, StudentProfile>();
const fallbackStudentStats = new Map<string, StudentStats>();
const fallbackStudentSkillStates = new Map<string, StudentSkillState[]>();

function cloneStudentProfile(profile: StudentProfile): StudentProfile {
  return {
    ...profile,
    parentIds: [...profile.parentIds],
    coachIds: [...profile.coachIds],
    motivationProfile: { ...profile.motivationProfile },
    settings: { ...profile.settings },
  };
}

function cloneStudentStats(stats: StudentStats): StudentStats {
  return {
    ...stats,
    weeklyXp: stats.weeklyXp.map((entry) => ({ ...entry })),
  };
}

function cloneStudentSkillState(state: StudentSkillState): StudentSkillState {
  return {
    ...state,
    taskTemplateTallies: { ...(state.taskTemplateTallies ?? {}) },
  };
}

function cloneSkillStateList(states: StudentSkillState[]): StudentSkillState[] {
  return states.map((state) => cloneStudentSkillState(state));
}

function getOrCreateInMemoryProfile(studentId: string): StudentProfile {
  const cached = fallbackStudentProfiles.get(studentId);
  if (cached) {
    return cloneStudentProfile(cached);
  }
  const created = createDefaultStudentProfile(studentId);
  fallbackStudentProfiles.set(studentId, created);
  return cloneStudentProfile(created);
}

function getOrCreateInMemoryStats(studentId: string): StudentStats {
  const cached = fallbackStudentStats.get(studentId);
  if (cached) {
    return cloneStudentStats(cached);
  }
  const defaults = createDefaultStudentStats(studentId);
  fallbackStudentStats.set(studentId, defaults);
  return cloneStudentStats(defaults);
}

function getOrCreateInMemorySkillStates(studentId: string, skills: Skill[]): StudentSkillState[] {
  const cached = fallbackStudentSkillStates.get(studentId);
  if (cached) {
    return cloneSkillStateList(cached);
  }
  const initial = createFallbackStudentStates(studentId, skills);
  fallbackStudentSkillStates.set(studentId, cloneSkillStateList(initial));
  return initial;
}

function now(): Date {
  return new Date();
}

async function fetchSkillsFromDatabase(): Promise<Skill[]> {
  if (!isDatabaseConfigured()) {
    return seedSkills;
  }

  const db = getDb();

  try {
    const baseRows = await db
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
      .execute();

    const prerequisites = await db
      .selectFrom("skill_prerequisites")
      .select(["skill_id", "prerequisite_skill_id", "gate"])
      .execute();

    const encompassing = await db
      .selectFrom("skill_encompassing")
      .select(["child_skill_id", "parent_skill_id", "weight"])
      .execute();

    const prereqMap = new Map<string, { skillId: string; gate: "AND" | "OR" }[]>();
    for (const row of prerequisites) {
      const entry = prereqMap.get(row.skill_id) ?? [];
      entry.push({ skillId: row.prerequisite_skill_id, gate: row.gate as "AND" | "OR" });
      prereqMap.set(row.skill_id, entry);
    }

    const encompassingMap = new Map<string, { skillId: string; weight: number }[]>();
    for (const row of encompassing) {
      const entry = encompassingMap.get(row.child_skill_id) ?? [];
      entry.push({ skillId: row.parent_skill_id, weight: Number(row.weight) });
      encompassingMap.set(row.child_skill_id, entry);
    }

    return baseRows.map((row) => ({
      id: row.id,
      title: row.title,
      domain: row.domain as Skill["domain"],
      strand: row.strand,
      gradeBand: row.grade_band as Skill["gradeBand"],
      stageCode: (row.stage_code ?? undefined) as Skill["stageCode"],
      description: row.description ?? undefined,
      subjectId: row.subject_id ?? undefined,
      courseId: row.course_id ?? undefined,
      lessonId: row.lesson_id ?? undefined,
      prerequisites: prereqMap.get(row.id) ?? [],
      encompassing: encompassingMap.get(row.id) ?? [],
      interferenceGroup: row.interference_group ?? undefined,
      expectedTimeSeconds: Number(row.expected_time_seconds),
      checkChartTags: (row.check_chart_tags ?? []) as string[],
      assets: (row.assets ?? []) as string[],
    }));
  } catch (error) {
    console.warn("[engine] Falling back to seedSkills after database error", error);
    return seedSkills;
  }
}

export async function getAllSkills(): Promise<Skill[]> {
  const nowMs = Date.now();
  if (cachedSkills && nowMs - lastSkillCacheMs <= SKILL_CACHE_WINDOW_MS) {
    return cachedSkills;
  }

  const skills = await fetchSkillsFromDatabase();
  cachedSkills = skills;
  lastSkillCacheMs = nowMs;
  return skills;
}

function toStudentSkillState(row: {
  student_id: string;
  skill_id: string;
  stability: number;
  strength: number;
  rep_num: number;
  due_at: Date;
  last_seen_at: Date | null;
  avg_latency_ms: number | null;
  speed_factor: number;
  struggling_flag: boolean;
  overdue_days: number;
  easiness: number | null;
  // biome-ignore lint/suspicious/noExplicitAny: Database JSON type
  task_template_tallies: any;
  retention_probability_365: number;
  created_at: Date;
  updated_at: Date;
}): StudentSkillState {
  return {
    studentId: row.student_id,
    skillId: row.skill_id,
    stability: Number(row.stability),
    strength: Number(row.strength),
    repNum: Number(row.rep_num),
    dueAt: row.due_at.toISOString(),
    lastSeenAt: row.last_seen_at ? row.last_seen_at.toISOString() : undefined,
    avgLatencyMs: row.avg_latency_ms ?? undefined,
    speedFactor: Number(row.speed_factor),
    strugglingFlag: row.struggling_flag,
    overdueDays: Number(row.overdue_days),
    easiness: row.easiness ?? undefined,
    taskTemplateTallies: (row.task_template_tallies ?? {}) as Record<string, number>,
    retentionProbability365: Number(row.retention_probability_365 ?? 0),
  };
}

function toDbSkillState(state: StudentSkillState) {
  return {
    student_id: state.studentId,
    skill_id: state.skillId,
    stability: state.stability,
    strength: state.strength,
    rep_num: state.repNum,
    due_at: new Date(state.dueAt),
    last_seen_at: state.lastSeenAt ? new Date(state.lastSeenAt) : null,
    avg_latency_ms: state.avgLatencyMs ?? null,
    speed_factor: state.speedFactor ?? 1,
    struggling_flag: state.strugglingFlag ?? false,
    overdue_days: state.overdueDays ?? 0,
    easiness: state.easiness ?? null,
    task_template_tallies: state.taskTemplateTallies ?? {},
    retention_probability_365: state.retentionProbability365 ?? 0,
    updated_at: now(),
  };
}

function createDefaultStudentProfile(studentId: string): StudentProfile {
  const timestamp = now().toISOString();
  return {
    id: studentId,
    email: undefined,
    name: "Pathfinder",
    grade: "K",
    gender: undefined,
    birthDate: undefined,
    parentIds: [],
    coachIds: [],
    motivationProfile: {
      preferCompetition: false,
      preferMastery: true,
      preferSocial: false,
    },
    settings: {
      dailyXpGoal: 80,
      weeklyXpGoal: 150,
      soundEnabled: true,
      musicEnabled: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createDefaultStudentStats(studentId: string): StudentStats {
  return {
    studentId,
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMinutes: 0,
    skillsCompleted: 0,
    speedDrillsCompleted: 0,
    lastActiveAt: null,
    weeklyXp: [],
  };
}

async function ensureStudentProfile(studentId: string): Promise<StudentProfile> {
  if (!isDatabaseConfigured()) {
    return getOrCreateInMemoryProfile(studentId);
  }

  try {
    const db = getDb();
    const row = await db
      .selectFrom("students")
      .selectAll()
      .where("id", "=", studentId)
      .executeTakeFirst();

    if (row) {
      const storedSettings = (row.settings ?? {}) as Partial<StudentProfile["settings"]>;
      const profile: StudentProfile = {
        id: row.id,
        email: undefined,
        name: row.name,
        grade: row.grade,
        gender: undefined,
        birthDate: row.birth_date ? row.birth_date.toISOString() : undefined,
        parentIds: [],
        coachIds: [],
        motivationProfile: (row.motivation_profile ?? {}) as StudentProfile["motivationProfile"],
        settings: {
          dailyXpGoal: storedSettings.dailyXpGoal ?? 80,
          weeklyXpGoal: storedSettings.weeklyXpGoal ?? storedSettings.dailyXpGoal ?? 150,
          soundEnabled: storedSettings.soundEnabled ?? true,
          musicEnabled: storedSettings.musicEnabled ?? true,
          accessibilityMode: storedSettings.accessibilityMode ?? undefined,
        },
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
      return profile;
    }

    const created = createDefaultStudentProfile(studentId);
    await db
      .insertInto("students")
      .values({
        id: created.id,
        user_id: null,
        name: created.name,
        grade: normalizeGradeBand(created.grade),
        birth_date: null,
        motivation_profile: created.motivationProfile,
        settings: created.settings,
        created_at: new Date(created.createdAt),
        updated_at: new Date(created.updatedAt),
      })
      .execute();

    return created;
  } catch (error) {
    console.warn("[engine] Falling back to in-memory student profile", error);
    return getOrCreateInMemoryProfile(studentId);
  }
}

async function ensureStudentStatsRow(studentId: string): Promise<StudentStats> {
  if (!isDatabaseConfigured()) {
    return getOrCreateInMemoryStats(studentId);
  }

  try {
    const db = getDb();
    const row = await db
      .selectFrom("student_stats")
      .selectAll()
      .where("student_id", "=", studentId)
      .executeTakeFirst();

    if (row) {
      return {
        studentId: row.student_id,
        totalXp: Number(row.total_xp),
        currentStreak: Number(row.current_streak),
        longestStreak: Number(row.longest_streak),
        totalMinutes: Number(row.total_minutes),
        skillsCompleted: Number(row.skills_completed),
        speedDrillsCompleted: Number(row.speed_drills_completed),
        lastActiveAt: row.last_active_at ? row.last_active_at.toISOString() : null,
        weeklyXp: (row.weekly_xp ?? []) as { date: string; xp: number }[],
      };
    }

    const defaults = createDefaultStudentStats(studentId);
    await db
      .insertInto("student_stats")
      .values({
        student_id: defaults.studentId,
        total_xp: defaults.totalXp,
        current_streak: defaults.currentStreak,
        longest_streak: defaults.longestStreak,
        total_minutes: defaults.totalMinutes,
        skills_completed: defaults.skillsCompleted,
        speed_drills_completed: defaults.speedDrillsCompleted,
        last_active_at: defaults.lastActiveAt ? new Date(defaults.lastActiveAt) : null,
        weekly_xp: defaults.weeklyXp,
        updated_at: now(),
      })
      .execute();

    return defaults;
  } catch (error) {
    console.warn("[engine] Falling back to in-memory student stats", error);
    return getOrCreateInMemoryStats(studentId);
  }
}

export async function loadStudentSkillStates(
  studentId: string,
  skills: Skill[],
): Promise<StudentSkillState[]> {
  await ensureStudentProfile(studentId);

  if (!isDatabaseConfigured()) {
    return getOrCreateInMemorySkillStates(studentId, skills);
  }

  try {
    const db = getDb();
    const rows = await db
      .selectFrom("student_skill_states")
      .selectAll()
      .where("student_id", "=", studentId)
      .execute();

    if (rows.length > 0) {
      return rows.map((row) => toStudentSkillState(row));
    }

    const initial = createFallbackStudentStates(studentId, skills);
    const nowTimestamp = now();

    if (initial.length > 0) {
      await db
        .insertInto("student_skill_states")
        .values(
          initial.map((state) => ({
            ...toDbSkillState(state),
            student_id: state.studentId,
            created_at: nowTimestamp,
          })),
        )
        .execute();
    }

    return initial;
  } catch (error) {
    console.warn("[engine] Falling back to in-memory skill states", error);
    return getOrCreateInMemorySkillStates(studentId, skills);
  }
}

export async function persistStudentSkillStates(
  studentId: string,
  states: StudentSkillState[],
): Promise<void> {
  if (states.length === 0) return;

  if (!isDatabaseConfigured()) {
    fallbackStudentSkillStates.set(studentId, cloneSkillStateList(states));
    return;
  }

  try {
    const db = getDb();
    const timestamp = now();
    const values = states.map((state) => ({
      ...toDbSkillState(state),
      student_id: studentId,
      created_at: timestamp,
    }));

    await db
      .insertInto("student_skill_states")
      .values(values)
      .onConflict((oc) =>
        oc.columns(["student_id", "skill_id"]).doUpdateSet((eb) => ({
          stability: eb.ref("excluded.stability"),
          strength: eb.ref("excluded.strength"),
          rep_num: eb.ref("excluded.rep_num"),
          due_at: eb.ref("excluded.due_at"),
          last_seen_at: eb.ref("excluded.last_seen_at"),
          avg_latency_ms: eb.ref("excluded.avg_latency_ms"),
          speed_factor: eb.ref("excluded.speed_factor"),
          struggling_flag: eb.ref("excluded.struggling_flag"),
          overdue_days: eb.ref("excluded.overdue_days"),
          easiness: eb.ref("excluded.easiness"),
          task_template_tallies: eb.ref("excluded.task_template_tallies"),
          retention_probability_365: eb.ref("excluded.retention_probability_365"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  } catch (error) {
    console.warn("[engine] Persisting skill states in memory after database error", error);
    fallbackStudentSkillStates.set(studentId, cloneSkillStateList(states));
  }
}

export async function applyStudentStateUpdates(
  studentId: string,
  updates: StudentSkillState[],
  skills?: Skill[],
): Promise<StudentSkillState[]> {
  const skillList = skills ?? (await getAllSkills());
  const currentStates = await loadStudentSkillStates(studentId, skillList);
  const merged = new Map(currentStates.map((state) => [state.skillId, state]));

  for (const update of updates) {
    const existing = merged.get(update.skillId);
    merged.set(update.skillId, existing ? { ...existing, ...update } : { ...update, studentId });
  }

  const result = Array.from(merged.values());
  await persistStudentSkillStates(studentId, result);
  return result;
}

export async function loadStudentProfile(studentId: string): Promise<StudentProfile> {
  return ensureStudentProfile(studentId);
}

export async function loadStudentStats(studentId: string): Promise<StudentStats> {
  await ensureStudentProfile(studentId);
  return ensureStudentStatsRow(studentId);
}

export async function persistStudentStats(studentId: string, stats: StudentStats): Promise<void> {
  if (!isDatabaseConfigured()) {
    fallbackStudentStats.set(studentId, cloneStudentStats(stats));
    return;
  }

  try {
    const db = getDb();
    await db
      .insertInto("student_stats")
      .values({
        student_id: studentId,
        total_xp: stats.totalXp,
        current_streak: stats.currentStreak,
        longest_streak: stats.longestStreak,
        total_minutes: stats.totalMinutes,
        skills_completed: stats.skillsCompleted,
        speed_drills_completed: stats.speedDrillsCompleted,
        last_active_at: stats.lastActiveAt ? new Date(stats.lastActiveAt) : null,
        weekly_xp: stats.weeklyXp,
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("student_id").doUpdateSet((eb) => ({
          total_xp: eb.ref("excluded.total_xp"),
          current_streak: eb.ref("excluded.current_streak"),
          longest_streak: eb.ref("excluded.longest_streak"),
          total_minutes: eb.ref("excluded.total_minutes"),
          skills_completed: eb.ref("excluded.skills_completed"),
          speed_drills_completed: eb.ref("excluded.speed_drills_completed"),
          last_active_at: eb.ref("excluded.last_active_at"),
          weekly_xp: eb.ref("excluded.weekly_xp"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  } catch (error) {
    console.warn("[engine] Persisting stats in memory after database error", error);
    fallbackStudentStats.set(studentId, cloneStudentStats(stats));
  }
}

export async function recordActivity(
  studentId: string,
  xpEarned: number,
  minutesSpent: number,
  timestamp: Date,
): Promise<StudentStats> {
  const stats = await loadStudentStats(studentId);
  const previousDateKey = stats.lastActiveAt ? stats.lastActiveAt.slice(0, 10) : undefined;

  stats.totalXp += xpEarned;
  stats.totalMinutes += minutesSpent;
  stats.lastActiveAt = timestamp.toISOString();

  const dateKey = timestamp.toISOString().slice(0, 10);
  const existingEntry = stats.weeklyXp.find((entry) => entry.date === dateKey);
  if (existingEntry) {
    existingEntry.xp += xpEarned;
  } else {
    stats.weeklyXp.push({ date: dateKey, xp: xpEarned });
  }

  stats.weeklyXp = stats.weeklyXp.slice(-14);

  if (!previousDateKey) {
    stats.currentStreak = 1;
  } else if (previousDateKey === dateKey) {
    // Same day – streak unchanged
  } else {
    const prevDate = new Date(previousDateKey);
    const currDate = new Date(dateKey);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      stats.currentStreak += 1;
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
  }
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

  await persistStudentStats(studentId, stats);
  return stats;
}

export async function loadStudentLeagueMembership(studentId: string): Promise<{
  leagueId?: string;
  squadId?: string;
}> {
  if (!isDatabaseConfigured()) {
    const existing = fallbackLeagueMembership.get(studentId);
    if (existing) {
      return { ...existing };
    }

    const defaultLeague = seedMotivationLeagues[0];
    const defaultSquad = defaultLeague?.squads[0];
    const membership = {
      leagueId: defaultLeague?.id,
      squadId: defaultSquad?.id,
    };
    fallbackLeagueMembership.set(studentId, membership);
    return { ...membership };
  }

  try {
    const db = getDb();
    const row = await db
      .selectFrom("student_league_memberships")
      .select(["league_id", "squad_id"])
      .where("student_id", "=", studentId)
      .executeTakeFirst();

    if (row) {
      return {
        leagueId: row.league_id ?? undefined,
        squadId: row.squad_id ?? undefined,
      };
    }

    const defaultLeague = seedMotivationLeagues[0];
    const defaultSquad = defaultLeague?.squads[0];
    const membership = {
      leagueId: defaultLeague?.id,
      squadId: defaultSquad?.id,
    };

    if (membership.leagueId) {
      await db
        .insertInto("student_league_memberships")
        .values({
          student_id: studentId,
          league_id: membership.leagueId,
          squad_id: membership.squadId ?? null,
          joined_at: now(),
        })
        .execute();
    }

    return membership;
  } catch (error) {
    console.warn("[engine] Falling back to in-memory league membership", error);
    const existing = fallbackLeagueMembership.get(studentId);
    return existing ? { ...existing } : {};
  }
}

export async function setStudentLeagueMembership(
  studentId: string,
  leagueId: string,
  squadId?: string,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    fallbackLeagueMembership.set(studentId, { leagueId, squadId });
    return;
  }

  try {
    const db = getDb();
    await db
      .insertInto("student_league_memberships")
      .values({
        student_id: studentId,
        league_id: leagueId,
        squad_id: squadId ?? null,
        joined_at: now(),
      })
      .onConflict((oc) =>
        oc.column("student_id").doUpdateSet((eb) => ({
          league_id: eb.ref("excluded.league_id"),
          squad_id: eb.ref("excluded.squad_id"),
          joined_at: eb.ref("excluded.joined_at"),
        })),
      )
      .execute();
  } catch (error) {
    console.warn("[engine] Persisting league membership in memory", error);
    fallbackLeagueMembership.set(studentId, { leagueId, squadId });
  }
}

export async function loadStudentQuests(studentId: string): Promise<MotivationQuest[]> {
  if (!isDatabaseConfigured()) {
    const quests = fallbackQuests.get(studentId);
    if (quests) {
      return cloneQuestList(quests);
    }
    const seeded = cloneQuestList(seedMotivationQuests);
    fallbackQuests.set(studentId, cloneQuestList(seeded));
    return seeded;
  }

  try {
    const db = getDb();
    const row = await db
      .selectFrom("student_quests")
      .select(["quests"])
      .where("student_id", "=", studentId)
      .executeTakeFirst();

    if (row) {
      return cloneQuestList(parseQuestRows(row.quests));
    }

    const seeded = cloneQuestList(seedMotivationQuests);
    await persistStudentQuests(studentId, seeded);
    return seeded;
  } catch (error) {
    console.warn("[engine] Falling back to in-memory quests", error);
    const quests = fallbackQuests.get(studentId);
    if (quests) {
      return cloneQuestList(quests);
    }
    const seeded = cloneQuestList(seedMotivationQuests);
    fallbackQuests.set(studentId, cloneQuestList(seeded));
    return seeded;
  }
}

export async function persistStudentQuests(
  studentId: string,
  quests: MotivationQuest[],
): Promise<void> {
  if (!isDatabaseConfigured()) {
    fallbackQuests.set(studentId, cloneQuestList(quests));
    return;
  }

  try {
    const db = getDb();
    await db
      .insertInto("student_quests")
      .values({
        student_id: studentId,
        quests,
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.column("student_id").doUpdateSet((eb) => ({
          quests: eb.ref("excluded.quests"),
          updated_at: eb.ref("excluded.updated_at"),
        })),
      )
      .execute();
  } catch (error) {
    console.warn("[engine] Persisting quests in memory after database error", error);
    fallbackQuests.set(studentId, cloneQuestList(quests));
  }
}

export async function loadTimeBackLedger(studentId: string): Promise<TimeBackLedgerEntry[]> {
  if (!isDatabaseConfigured()) {
    const ledger = fallbackTimeBackLedger.get(studentId);
    if (ledger) {
      return ledger.map((entry) => ({ ...entry }));
    }

    const seeded = seedTimeBackLedger.map((entry) => ({ ...entry }));
    fallbackTimeBackLedger.set(
      studentId,
      seeded.map((entry) => ({ ...entry })),
    );
    return seeded;
  }

  try {
    const db = getDb();
    const rows = await db
      .selectFrom("time_back_ledger")
      .select([
        "id",
        "student_id",
        "source",
        "minutes_granted",
        "granted_at",
        "expires_at",
        "consumed_at",
        "note",
      ])
      .where("student_id", "=", studentId)
      .orderBy("granted_at", "asc")
      .execute();

    return rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      source: (row.source ?? "manual") as TimeBackLedgerEntry["source"],
      minutesGranted: Number(row.minutes_granted),
      grantedAt: row.granted_at instanceof Date ? row.granted_at.toISOString() : row.granted_at,
      expiresAt:
        row.expires_at instanceof Date
          ? row.expires_at.toISOString()
          : (row.expires_at ?? undefined),
      consumedAt:
        row.consumed_at instanceof Date
          ? row.consumed_at.toISOString()
          : (row.consumed_at ?? undefined),
      note: row.note ?? undefined,
    }));
  } catch (error) {
    console.warn("[engine] Falling back to in-memory time-back ledger", error);
    const ledger = fallbackTimeBackLedger.get(studentId) ?? [];
    return ledger.map((entry) => ({ ...entry }));
  }
}

export async function persistTimeBackLedger(
  studentId: string,
  ledger: TimeBackLedgerEntry[],
): Promise<void> {
  if (!isDatabaseConfigured()) {
    fallbackTimeBackLedger.set(
      studentId,
      ledger.map((entry) => ({ ...entry })),
    );
    return;
  }

  try {
    const db = getDb();
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom("time_back_ledger").where("student_id", "=", studentId).execute();
      if (ledger.length === 0) {
        return;
      }
      await trx
        .insertInto("time_back_ledger")
        .values(
          ledger.map((entry) => ({
            id: entry.id,
            student_id: entry.studentId,
            source: entry.source,
            minutes_granted: entry.minutesGranted,
            granted_at: new Date(entry.grantedAt),
            expires_at: entry.expiresAt ? new Date(entry.expiresAt) : null,
            consumed_at: entry.consumedAt ? new Date(entry.consumedAt) : null,
            note: entry.note ?? null,
            updated_at: now(),
          })),
        )
        .execute();
    });
  } catch (error) {
    console.warn("[engine] Persisting time-back ledger in memory", error);
    fallbackTimeBackLedger.set(
      studentId,
      ledger.map((entry) => ({ ...entry })),
    );
  }
}

export async function addTimeBackLedgerEntry(entry: TimeBackLedgerEntry): Promise<void> {
  if (!isDatabaseConfigured()) {
    const ledger = await loadTimeBackLedger(entry.studentId);
    ledger.push({ ...entry });
    fallbackTimeBackLedger.set(
      entry.studentId,
      ledger.map((item) => ({ ...item })),
    );
    return;
  }

  try {
    const db = getDb();
    await db
      .insertInto("time_back_ledger")
      .values({
        id: entry.id,
        student_id: entry.studentId,
        source: entry.source,
        minutes_granted: entry.minutesGranted,
        granted_at: new Date(entry.grantedAt),
        expires_at: entry.expiresAt ? new Date(entry.expiresAt) : null,
        consumed_at: entry.consumedAt ? new Date(entry.consumedAt) : null,
        note: entry.note ?? null,
        updated_at: now(),
      })
      .execute();
  } catch (error) {
    console.warn("[engine] Persisting ledger entry in memory", error);
    const ledger = await loadTimeBackLedger(entry.studentId);
    ledger.push({ ...entry });
    fallbackTimeBackLedger.set(
      entry.studentId,
      ledger.map((item) => ({ ...item })),
    );
  }
}

export async function markTimeBackEntryConsumed(studentId: string, entryId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    const ledger = await loadTimeBackLedger(studentId);
    const updated = ledger.map((entry) =>
      entry.id === entryId ? { ...entry, consumedAt: new Date().toISOString() } : entry,
    );
    fallbackTimeBackLedger.set(
      studentId,
      updated.map((entry) => ({ ...entry })),
    );
    return;
  }

  try {
    const db = getDb();
    await db
      .updateTable("time_back_ledger")
      .set({
        consumed_at: now(),
        updated_at: now(),
      })
      .where("student_id", "=", studentId)
      .where("id", "=", entryId)
      .execute();
  } catch (error) {
    console.warn("[engine] Falling back to in-memory consumption", error);
    const ledger = await loadTimeBackLedger(studentId);
    const updated = ledger.map((entry) =>
      entry.id === entryId ? { ...entry, consumedAt: new Date().toISOString() } : entry,
    );
    fallbackTimeBackLedger.set(
      studentId,
      updated.map((entry) => ({ ...entry })),
    );
  }
}

export async function ensureDailyTimeBackReward(
  studentId: string,
  minutes: number,
  dateKey: string,
): Promise<void> {
  const ledger = await loadTimeBackLedger(studentId);
  const alreadyGranted = ledger.some(
    (entry) => entry.source === "daily_goal" && entry.grantedAt?.startsWith(dateKey),
  );
  if (alreadyGranted) {
    return;
  }

  await addTimeBackLedgerEntry({
    id: randomUUID(),
    studentId,
    source: "daily_goal",
    minutesGranted: minutes,
    grantedAt: new Date().toISOString(),
    expiresAt: undefined,
    consumedAt: undefined,
    note: "Daily XP goal met",
  });
}

async function upsertSkillMetric(
  skillId: string,
  segmentKind: string,
  segmentValue: string,
  successScore: number,
  latencyMs: number,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    const db = getDb();
    await db
      .insertInto("skill_metrics")
      .values({
        skill_id: skillId,
        segment_kind: segmentKind,
        segment_value: segmentValue,
        sample_count: 1,
        accuracy_sum: successScore,
        accuracy_sq_sum: successScore * successScore,
        latency_sum: latencyMs,
        latency_sq_sum: latencyMs * latencyMs,
        updated_at: now(),
      })
      .onConflict((oc) =>
        oc.columns(["skill_id", "segment_kind", "segment_value"]).doUpdateSet({
          sample_count: sql`skill_metrics.sample_count + 1`,
          accuracy_sum: sql`skill_metrics.accuracy_sum + ${successScore}`,
          accuracy_sq_sum: sql`skill_metrics.accuracy_sq_sum + ${successScore * successScore}`,
          latency_sum: sql`skill_metrics.latency_sum + ${latencyMs}`,
          latency_sq_sum: sql`skill_metrics.latency_sq_sum + ${latencyMs * latencyMs}`,
          updated_at: sql`now()`,
        }),
      )
      .execute();
  } catch (error) {
    console.warn("[engine] Skipping skill metrics update after database error", error);
  }
}

export async function recordSkillMetricSample(
  skillId: string,
  successScore: number,
  latencyMs: number,
  profile: StudentProfile,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  await upsertSkillMetric(skillId, "overall", "overall", successScore, latencyMs);

  if (profile.gender) {
    await upsertSkillMetric(skillId, "gender", profile.gender, successScore, latencyMs);
  }

  if (profile.grade) {
    await upsertSkillMetric(skillId, "grade", profile.grade, successScore, latencyMs);
  }
}

interface MetricSnapshot {
  accuracyMean: number;
  accuracyStdDev: number;
  latencyMean: number;
  latencyStdDev: number;
  sampleCount: number;
}

function computeSnapshot(row: {
  sample_count: number;
  accuracy_sum: number;
  accuracy_sq_sum: number;
  latency_sum: number;
  latency_sq_sum: number;
}): MetricSnapshot {
  const count = Math.max(1, Number(row.sample_count));
  const accuracyMean = Number(row.accuracy_sum) / count;
  const accuracyVariance = Math.max(0, Number(row.accuracy_sq_sum) / count - accuracyMean ** 2);
  const latencyMean = Number(row.latency_sum) / count;
  const latencyVariance = Math.max(0, Number(row.latency_sq_sum) / count - latencyMean ** 2);
  return {
    accuracyMean,
    accuracyStdDev: Math.sqrt(accuracyVariance),
    latencyMean,
    latencyStdDev: Math.sqrt(latencyVariance),
    sampleCount: Number(row.sample_count),
  };
}

export async function getSkillMetricSnapshot(skillId: string): Promise<
  | {
      overall: MetricSnapshot;
      byGender: Record<string, MetricSnapshot>;
      byGrade: Record<string, MetricSnapshot>;
    }
  | undefined
> {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  try {
    const db = getDb();
    const rows = await db
      .selectFrom("skill_metrics")
      .selectAll()
      .where("skill_id", "=", skillId)
      .execute();

    if (rows.length === 0) return undefined;

    const overallRow = rows.find(
      (row) => row.segment_kind === "overall" && row.segment_value === "overall",
    );
    if (!overallRow) return undefined;

    const result = {
      overall: computeSnapshot(overallRow),
      byGender: {} as Record<string, MetricSnapshot>,
      byGrade: {} as Record<string, MetricSnapshot>,
    };

    for (const row of rows) {
      if (row.segment_kind === "gender" && row.segment_value !== "overall") {
        result.byGender[row.segment_value] = computeSnapshot(row);
      }
      if (row.segment_kind === "grade" && row.segment_value !== "overall") {
        result.byGrade[row.segment_value] = computeSnapshot(row);
      }
    }

    return result;
  } catch (error) {
    console.warn("[engine] Unable to read skill metrics; returning undefined snapshot", error);
    return undefined;
  }
}

export function createFallbackStudentStates(
  studentId: string,
  skills: Skill[],
): StudentSkillState[] {
  const prioritizedSkills = skills
    .filter((skill) => skill.domain === "reading" || skill.domain === "math")
    .slice(0, 8);

  const nowTime = Date.now();
  return prioritizedSkills.map((skill, index) => {
    const dueOffsetHours = index + 1;
    const strengthValues = [0.82, 0.7, 0.58, 0.42, 0.35, 0.3, 0.25, 0.2];
    const stabilityValues = [1.4, 1.2, 1.0, 0.8, 0.7, 0.6, 0.5, 0.4];

    return {
      studentId,
      skillId: skill.id,
      stability: stabilityValues[index] ?? 0.6,
      strength: strengthValues[index] ?? 0.3,
      repNum: Math.max(1, 3 - index),
      dueAt: new Date(nowTime - dueOffsetHours * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(nowTime - (dueOffsetHours + 1) * 60 * 60 * 1000).toISOString(),
      avgLatencyMs: 3200 + index * 400,
      speedFactor: 1 + index * 0.08,
      strugglingFlag: index >= 3,
      overdueDays: Math.max(0, index - 2),
      easiness: 2.4,
      taskTemplateTallies: {},
      retentionProbability365: 0.45,
    };
  });
}

export function prerequisitesMet(skill: Skill, stateMap: Map<string, StudentSkillState>): boolean {
  if (!skill.prerequisites || skill.prerequisites.length === 0) {
    return true;
  }

  const andPrereqs = skill.prerequisites.filter((prereq) => prereq.gate === "AND");
  const orPrereqs = skill.prerequisites.filter((prereq) => prereq.gate === "OR");

  const meetsAnd = andPrereqs.every((prereq) =>
    isPrerequisiteMastered(stateMap.get(prereq.skillId)),
  );
  const meetsOr =
    orPrereqs.length === 0 ||
    orPrereqs.some((prereq) => isPrerequisiteMastered(stateMap.get(prereq.skillId)));

  return meetsAnd && meetsOr;
}

function isPrerequisiteMastered(state: StudentSkillState | undefined): boolean {
  if (!state) return false;
  return state.strength >= PREREQUISITE_STRENGTH_THRESHOLD;
}

export function createSyntheticTaskId(): string {
  return randomUUID();
}
