import { randomUUID } from "node:crypto";
import type {
  MotivationQuest,
  TimeBackLedgerEntry,
  StudentProfile,
  StudentSkillState,
  StudentStats,
  Skill,
} from "@repo/schemas";
import {
  seedSkills,
  seedMotivationLeagues,
  seedMotivationQuests,
  seedTimeBackLedger,
} from "@repo/curriculum";

const PREREQUISITE_STRENGTH_THRESHOLD = 0.6;

const fallbackSkillStates = new Map<string, StudentSkillState[]>();
const fallbackProfiles = new Map<string, StudentProfile>();
const fallbackStats = new Map<string, StudentStats>();
const fallbackLeagueMembership = new Map<string, { leagueId: string; squadId?: string }>();
const fallbackQuests = new Map<string, MotivationQuest[]>();
const fallbackTimeBackLedger = new Map<string, TimeBackLedgerEntry[]>();
const skillMetrics = new Map<
  string,
  {
    overall: MetricAccumulator;
    byGender: Map<string, MetricAccumulator>;
    byGrade: Map<string, MetricAccumulator>;
  }
>();

interface MetricAccumulator {
  count: number;
  accuracySum: number;
  accuracySqSum: number;
  latencySum: number;
  latencySqSum: number;
}

function cloneState(state: StudentSkillState): StudentSkillState {
  return {
    ...state,
    experienceTallies: { ...(state.experienceTallies ?? {}) },
  };
}

function cloneStats(stats: StudentStats): StudentStats {
  return {
    ...stats,
    weeklyXp: stats.weeklyXp?.map((entry) => ({ ...entry })) ?? [],
  };
}

function cloneQuest(quest: MotivationQuest): MotivationQuest {
  return {
    ...quest,
    tasks: quest.tasks.map((task) => ({ ...task })),
  };
}

function cloneLedgerEntry(entry: TimeBackLedgerEntry): TimeBackLedgerEntry {
  return { ...entry };
}

export function getAllSkills(): Skill[] {
  return seedSkills;
}

export async function loadStudentSkillStates(
  studentId: string,
  skills: Skill[],
): Promise<StudentSkillState[]> {
  return ensureFallbackStates(studentId, skills).map(cloneState);
}

export async function persistStudentSkillStates(
  studentId: string,
  states: StudentSkillState[],
): Promise<void> {
  fallbackSkillStates.set(studentId, states.map(cloneState));
}

export async function applyStudentStateUpdates(
  studentId: string,
  updates: StudentSkillState[],
  skills: Skill[] = seedSkills,
): Promise<StudentSkillState[]> {
  const currentStates = await loadStudentSkillStates(studentId, skills);
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
  return ensureFallbackProfile(studentId);
}

export async function loadStudentStats(studentId: string): Promise<StudentStats> {
  return ensureFallbackStats(studentId);
}

export async function persistStudentStats(studentId: string, stats: StudentStats): Promise<void> {
  fallbackStats.set(studentId, cloneStats(stats));
}

export async function recordActivity(
  studentId: string,
  xpEarned: number,
  minutesSpent: number,
  timestamp: Date,
): Promise<StudentStats> {
  const stats = cloneStats(await loadStudentStats(studentId));

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
    // same day — keep streak as-is
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

export function loadStudentLeagueMembership(studentId: string): {
  leagueId?: string;
  squadId?: string;
} {
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

export function setStudentLeagueMembership(
  studentId: string,
  leagueId: string,
  squadId?: string,
): void {
  fallbackLeagueMembership.set(studentId, { leagueId, squadId });
}

export function loadStudentQuests(studentId: string): MotivationQuest[] {
  const quests = fallbackQuests.get(studentId);
  if (quests) {
    return quests.map(cloneQuest);
  }

  const seeded = seedMotivationQuests.map(cloneQuest);
  fallbackQuests.set(studentId, seeded.map(cloneQuest));
  return seeded.map(cloneQuest);
}

export function persistStudentQuests(studentId: string, quests: MotivationQuest[]): void {
  fallbackQuests.set(studentId, quests.map(cloneQuest));
}

export function loadTimeBackLedger(studentId: string): TimeBackLedgerEntry[] {
  const entries = fallbackTimeBackLedger.get(studentId);
  if (entries) {
    return entries.map(cloneLedgerEntry);
  }

  const seeded = seedTimeBackLedger
    .filter((entry) => entry.studentId === studentId)
    .map(cloneLedgerEntry);
  fallbackTimeBackLedger.set(studentId, seeded.map(cloneLedgerEntry));
  return seeded.map(cloneLedgerEntry);
}

export function addTimeBackLedgerEntry(entry: TimeBackLedgerEntry): void {
  const current = loadTimeBackLedger(entry.studentId);
  current.push(cloneLedgerEntry(entry));
  fallbackTimeBackLedger.set(entry.studentId, current);
}

export function markTimeBackEntryConsumed(
  studentId: string,
  entryId: string,
  consumedAt: Date,
): TimeBackLedgerEntry[] {
  const ledger = loadTimeBackLedger(studentId);
  const updated = ledger.map((entry) =>
    entry.id === entryId ? { ...entry, consumedAt: consumedAt.toISOString() } : entry,
  );
  fallbackTimeBackLedger.set(studentId, updated.map(cloneLedgerEntry));
  return updated;
}

export function ensureDailyTimeBackReward(
  studentId: string,
  minutes: number,
  dateKey: string,
): void {
  const ledger = loadTimeBackLedger(studentId);
  const alreadyGranted = ledger.some(
    (entry) => entry.source === "daily_goal" && entry.grantedAt.startsWith(dateKey),
  );
  if (alreadyGranted) {
    return;
  }

  addTimeBackLedgerEntry({
    id: randomUUID(),
    studentId,
    source: "daily_goal",
    minutesGranted: minutes,
    grantedAt: `${dateKey}T00:00:00.000Z`,
    expiresAt: undefined,
    consumedAt: undefined,
    note: "Daily XP goal met",
  });
}

function ensureFallbackStates(studentId: string, skills: Skill[]): StudentSkillState[] {
  const existing = fallbackSkillStates.get(studentId);
  if (existing) {
    return existing.map(cloneState);
  }

  const initial = createFallbackStudentStates(studentId, skills);
  fallbackSkillStates.set(studentId, initial.map(cloneState));
  return initial.map(cloneState);
}

function ensureFallbackProfile(studentId: string): StudentProfile {
  const profile = fallbackProfiles.get(studentId);
  if (profile) {
    return profile;
  }

  const now = new Date().toISOString();
  const created: StudentProfile = {
    id: studentId,
    email: undefined,
    name: "Pathfinder",
    grade: "K",
    parentIds: [],
    coachIds: [],
    motivationProfile: {
      preferCompetition: false,
      preferMastery: true,
      preferSocial: false,
    },
    settings: {
      dailyXpGoal: 80,
      soundEnabled: true,
      musicEnabled: true,
    },
    createdAt: now,
    updatedAt: now,
  };
  fallbackProfiles.set(studentId, created);
  return created;
}

function ensureFallbackStats(studentId: string): StudentStats {
  const stats = fallbackStats.get(studentId);
  if (stats) {
    return cloneStats(stats);
  }

  const now = new Date().toISOString();
  const created: StudentStats = {
    studentId,
    totalXp: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalMinutes: 0,
    skillsCompleted: 0,
    speedDrillsCompleted: 0,
    lastActiveAt: now,
    weeklyXp: [],
  };
  fallbackStats.set(studentId, cloneStats(created));
  return created;
}

export function createFallbackStudentStates(
  studentId: string,
  skills: Skill[],
): StudentSkillState[] {
  const prioritizedSkills = skills
    .filter((skill) => skill.domain === "reading" || skill.domain === "math")
    .slice(0, 8);

  const now = Date.now();
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
      dueAt: new Date(now - dueOffsetHours * 60 * 60 * 1000).toISOString(),
      lastSeenAt: new Date(now - (dueOffsetHours + 1) * 60 * 60 * 1000).toISOString(),
      avgLatencyMs: 3200 + index * 400,
      speedFactor: 1 + index * 0.08,
      strugglingFlag: index >= 3,
      overdueDays: Math.max(0, index - 2),
      easiness: 2.4,
      experienceTallies: {},
      retentionProbability365: 0.45,
    };
  });
}

export function prerequisitesMet(topic: Skill, stateMap: Map<string, StudentSkillState>): boolean {
  if (!topic.prerequisites || topic.prerequisites.length === 0) {
    return true;
  }

  const andPrereqs = topic.prerequisites.filter((prereq) => prereq.gate === "AND");
  const orPrereqs = topic.prerequisites.filter((prereq) => prereq.gate === "OR");

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

export function recordSkillMetricSample(
  skillId: string,
  successScore: number,
  latencyMs: number,
  profile: StudentProfile,
): void {
  if (!skillMetrics.has(skillId)) {
    skillMetrics.set(skillId, {
      overall: createAccumulator(),
      byGender: new Map(),
      byGrade: new Map(),
    });
  }

  const accumulator = skillMetrics.get(skillId)!;
  accumulate(accumulator.overall, successScore, latencyMs);

  if (profile.gender) {
    const segment = ensureSegment(accumulator.byGender, profile.gender);
    accumulate(segment, successScore, latencyMs);
  }

  if (profile.grade) {
    const segment = ensureSegment(accumulator.byGrade, profile.grade);
    accumulate(segment, successScore, latencyMs);
  }
}

export function getSkillMetricSnapshot(skillId: string):
  | {
      overall: MetricSnapshot;
      byGender: Record<string, MetricSnapshot>;
      byGrade: Record<string, MetricSnapshot>;
    }
  | undefined {
  const accumulator = skillMetrics.get(skillId);
  if (!accumulator) return undefined;

  const overall = computeSnapshot(accumulator.overall);
  const byGender = Object.fromEntries(
    Array.from(accumulator.byGender.entries()).map(([key, value]) => [key, computeSnapshot(value)]),
  );
  const byGrade = Object.fromEntries(
    Array.from(accumulator.byGrade.entries()).map(([key, value]) => [key, computeSnapshot(value)]),
  );

  return { overall, byGender, byGrade };
}

interface MetricSnapshot {
  count: number;
  meanAccuracy: number;
  stdAccuracy: number;
  meanLatency: number;
  stdLatency: number;
}

function createAccumulator(): MetricAccumulator {
  return {
    count: 0,
    accuracySum: 0,
    accuracySqSum: 0,
    latencySum: 0,
    latencySqSum: 0,
  };
}

function ensureSegment(map: Map<string, MetricAccumulator>, key: string): MetricAccumulator {
  const existing = map.get(key);
  if (existing) return existing;
  const created = createAccumulator();
  map.set(key, created);
  return created;
}

function accumulate(acc: MetricAccumulator, accuracy: number, latencyMs: number) {
  acc.count += 1;
  acc.accuracySum += accuracy;
  acc.accuracySqSum += accuracy * accuracy;
  acc.latencySum += latencyMs;
  acc.latencySqSum += latencyMs * latencyMs;
}

function computeSnapshot(acc: MetricAccumulator): MetricSnapshot {
  if (acc.count === 0) {
    return { count: 0, meanAccuracy: 0, stdAccuracy: 0, meanLatency: 0, stdLatency: 0 };
  }

  const meanAccuracy = acc.accuracySum / acc.count;
  const varianceAccuracy = Math.max(0, acc.accuracySqSum / acc.count - meanAccuracy * meanAccuracy);
  const meanLatency = acc.latencySum / acc.count;
  const varianceLatency = Math.max(0, acc.latencySqSum / acc.count - meanLatency * meanLatency);

  return {
    count: acc.count,
    meanAccuracy: Number(meanAccuracy.toFixed(3)),
    stdAccuracy: Number(Math.sqrt(varianceAccuracy).toFixed(3)),
    meanLatency: Math.round(meanLatency),
    stdLatency: Math.round(Math.sqrt(varianceLatency)),
  };
}
