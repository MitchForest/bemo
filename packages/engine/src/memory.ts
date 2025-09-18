import type { StudentSkillState, Skill, Result } from "@repo/schemas";

const STRUGGLE_STRENGTH_THRESHOLD = 0.45;
const MASTERED_STRENGTH_THRESHOLD = 0.82;

interface MemoryUpdateParams {
  studentId: string;
  state?: StudentSkillState;
  skill: Skill;
  result: Result;
  latencyMs: number;
  hintsUsed: number;
  weight?: number;
  now: Date;
  experienceId?: string;
}

export interface MemoryUpdateResult {
  state: StudentSkillState;
  deltaStrength: number;
  deltaStability: number;
  successScore: number;
}

export function updateMemoryState(params: MemoryUpdateParams): MemoryUpdateResult {
  const {
    studentId,
    state,
    skill,
    result,
    latencyMs,
    hintsUsed,
    weight = 1,
    now,
    experienceId,
  } = params;
  const prevStrength = state?.strength ?? 0.3;
  const prevStability = state?.stability ?? 0.6;
  const prevAvgLatency = state?.avgLatencyMs ?? latencyMs;

  const successScore = computeSuccessScore(result, hintsUsed);
  const latencyFactor = latencyMs / computeExpectedLatency(skill);
  const latencyPenalty = Math.max(0, latencyFactor - 1) * 0.2;
  const weightedSuccess = successScore * weight;

  const newStrength = clamp01(
    prevStrength + (weightedSuccess - prevStrength) * (0.55 + 0.2 * weight) - latencyPenalty,
  );

  const stabilityDelta = weightedSuccess >= 0.7 ? 0.25 : weightedSuccess >= 0.5 ? 0.08 : -0.18;
  const newStability = Math.max(0.25, prevStability + stabilityDelta * weight);

  const intervalHours = computeIntervalHours(newStability, newStrength, weightedSuccess);
  const dueAt = new Date(now.getTime() + intervalHours * 60 * 60 * 1000).toISOString();
  const repNum = (state?.repNum ?? 0) + 1;

  const updatedAvgLatency = Math.round(prevAvgLatency * 0.6 + latencyMs * 0.4);
  const speedFactor = Number((updatedAvgLatency / computeExpectedLatency(skill)).toFixed(2));

  const strugglingFlag = newStrength < STRUGGLE_STRENGTH_THRESHOLD || weightedSuccess < 0.4;
  const overdueDays = 0;

  const experienceTallies = { ...(state?.experienceTallies ?? {}) };
  if (experienceId) {
    experienceTallies[experienceId] = (experienceTallies[experienceId] ?? 0) + 1;
  }

  const retentionProbability365 = estimateRetentionProbability(newStability, 365);

  const updatedState: StudentSkillState = {
    studentId,
    topicId: state?.skillId ?? skill.id,
    skillId: state?.skillId ?? skill.id,
    stability: Number(newStability.toFixed(3)),
    strength: Number(newStrength.toFixed(3)),
    repNum,
    dueAt,
    lastSeenAt: now.toISOString(),
    avgLatencyMs: updatedAvgLatency,
    speedFactor,
    strugglingFlag,
    overdueDays,
    easiness: determineEasiness(newStrength),
    experienceTallies,
    retentionProbability365: Number(retentionProbability365.toFixed(3)),
  };

  return {
    state: updatedState,
    deltaStrength: newStrength - prevStrength,
    deltaStability: newStability - prevStability,
    successScore: weightedSuccess,
  };
}

export function computeSuccessScore(result: Result, hintsUsed: number): number {
  const base =
    result === "correct" ? 1 : result === "partial" ? 0.6 : result === "skipped" ? 0.2 : 0;
  const hintPenalty = Math.min(0.4, hintsUsed * 0.1);
  return Math.max(0, base - hintPenalty);
}

export function isMastered(state: StudentSkillState | undefined): boolean {
  return !!state && state.strength >= MASTERED_STRENGTH_THRESHOLD;
}

function determineEasiness(strength: number): number {
  if (strength >= 0.9) return 2.8;
  if (strength >= 0.8) return 2.5;
  if (strength >= 0.6) return 2.3;
  return 2.1;
}

function computeExpectedLatency(skill: Skill): number {
  const base = Math.max(180, skill.expectedTimeSeconds);
  return Math.max(1800, Math.round((base * 1000) / 6));
}

function estimateRetentionProbability(stability: number, days: number): number {
  const halfLifeDays = Math.max(1, stability * 26);
  const lambda = Math.log(2) / halfLifeDays;
  return Math.exp(-lambda * days);
}

function computeIntervalHours(stability: number, strength: number, success: number): number {
  const baseHours = Math.max(6, stability * 18 + strength * 12);
  if (success < 0.4) {
    return Math.max(2, baseHours * 0.35);
  }
  if (success < 0.7) {
    return Math.max(6, baseHours * 0.65);
  }
  return Math.min(24 * 21, baseHours * 1.35);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
