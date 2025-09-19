import type {
  EvidenceEvent,
  EvidenceResponse,
  StudentSkillState,
  SubmitEvidence,
} from "@repo/schemas";
import {
  applyStudentStateUpdates,
  getAllSkills,
  loadStudentProfile,
  loadStudentSkillStates,
  recordActivity,
  recordSkillMetricSample,
} from "./data";
import { computeSuccessScore, updateMemoryState } from "./memory";

interface EvidenceProcessingResult {
  updatedStates: StudentSkillState[];
  xpEarned: number;
  achievements: EvidenceResponse["achievements"];
}

export async function submitEvidence(
  studentId: string,
  payload: SubmitEvidence,
): Promise<EvidenceProcessingResult> {
  const skills = await getAllSkills();
  const states = await loadStudentSkillStates(studentId, skills);
  const stateMap = new Map(states.map((state) => [state.skillId, state]));
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const profile = await loadStudentProfile(studentId);

  const updates = new Map<string, StudentSkillState>();
  let xpEarned = 0;
  let minutesSpent = 0;
  let correctCount = 0;

  for (const event of payload.events) {
    const skill = skillMap.get(event.skillId);
    if (!skill) continue;

    const now = event.timestamp ? new Date(event.timestamp) : new Date();
    const baseState = updates.get(skill.id) ?? stateMap.get(skill.id);
    const memoryResult = updateMemoryState({
      studentId,
      state: baseState,
      skill,
      result: event.result,
      latencyMs: event.latencyMs,
      hintsUsed: event.hintsUsed ?? 0,
      weight: 1,
      now,
      taskTemplateId: event.taskTemplateId,
    });

    updates.set(skill.id, memoryResult.state);
    stateMap.set(skill.id, memoryResult.state);

    if (skill.encompassing?.length) {
      for (const edge of skill.encompassing) {
        const parentSkill = skillMap.get(edge.skillId);
        if (!parentSkill) continue;
        const parentState = updates.get(parentSkill.id) ?? stateMap.get(parentSkill.id);
        const parentResult = updateMemoryState({
          studentId,
          state: parentState,
          skill: parentSkill,
          result: event.result,
          latencyMs: event.latencyMs,
          hintsUsed: event.hintsUsed ?? 0,
          weight: edge.weight,
          now,
          taskTemplateId: undefined,
        });
        updates.set(parentSkill.id, parentResult.state);
        stateMap.set(parentSkill.id, parentResult.state);
      }
    }

    const successScore = computeSuccessScore(event.result, event.hintsUsed ?? 0);
    await recordSkillMetricSample(skill.id, successScore, event.latencyMs, profile);
    xpEarned += Math.round(8 + successScore * 12);
    minutesSpent += Math.max(0.05, event.latencyMs / 60000);

    if (event.result === "correct") {
      correctCount += 1;
    }
  }

  await applyStudentStateUpdates(studentId, Array.from(updates.values()), skills);
  await recordActivity(studentId, xpEarned, Math.max(1, Math.round(minutesSpent)), new Date());

  const achievements = buildAchievements(payload.events, xpEarned, correctCount);

  return {
    updatedStates: Array.from(updates.values()),
    xpEarned,
    achievements,
  };
}

function buildAchievements(
  events: EvidenceEvent[],
  xpEarned: number,
  correctCount: number,
): EvidenceResponse["achievements"] {
  const achievements: NonNullable<EvidenceResponse["achievements"]> = [];
  if (events.length > 0 && correctCount === events.length) {
    achievements.push({
      type: "streak",
      title: "Perfect Pass",
      description: "You nailed every item in this set!",
    });
  }
  if (xpEarned >= 100) {
    achievements.push({
      type: "xp",
      title: "Spark Collector",
      description: "Earned 100+ XP in one go.",
    });
  }
  return achievements.length ? achievements : undefined;
}
