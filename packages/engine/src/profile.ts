import { seedCheckCharts } from "@repo/curriculum";
import type { Skill, StudentProfileSummary, StudentSkillState } from "@repo/schemas";
import { getAllSkills, loadStudentProfile, loadStudentSkillStates } from "./data";
import { getMotivationSummary } from "./motivation";
import { getPlan } from "./plan";

const SPEED_LATENCY_THRESHOLD_MS = 3200;
const SPEED_FACTOR_THRESHOLD = 1.1;

export async function getStudentProfileSummary(studentId: string): Promise<StudentProfileSummary> {
  const profile = await loadStudentProfile(studentId);
  const skills = await getAllSkills();
  const states = await loadStudentSkillStates(studentId, skills);
  const stateMap = new Map(states.map((state) => [state.skillId, state]));
  const now = Date.now();

  const mastery = computeMastery(skills, stateMap, now);
  const dueSkills = states
    .filter((state) => Date.parse(state.dueAt) <= now)
    .map((state) => buildDueSkill(state, skills));
  const speedFlags = states
    .filter(
      (state) =>
        (state.avgLatencyMs ?? 0) > SPEED_LATENCY_THRESHOLD_MS ||
        (state.speedFactor ?? 1) > SPEED_FACTOR_THRESHOLD,
    )
    .map((state) => buildSpeedFlag(state, skills));

  const latestPlan = await getPlan({
    studentId,
    max: 5,
    includeSpeedDrills: true,
    includeDiagnostic: false,
  });

  const checkCharts = seedCheckCharts.map((chart) => buildCheckChartProgress(chart.id, stateMap));
  const motivation = await getMotivationSummary(studentId);

  return {
    profile,
    mastery,
    dueSkills,
    speedFlags,
    latestPlan: {
      generatedAt: new Date().toISOString(),
      stats: latestPlan.stats,
      tasks: latestPlan.tasks,
    },
    skillStates: states,
    checkCharts,
    motivation,
  };
}

function computeMastery(skills: Skill[], stateMap: Map<string, StudentSkillState>, now: number) {
  const grouped = new Map(
    ["math", "reading"].map((domain) => [
      domain,
      { strengths: [] as number[], due: 0, struggling: 0 },
    ]),
  );

  for (const skill of skills) {
    const bucket = grouped.get(skill.domain);
    const state = stateMap.get(skill.id);
    if (!bucket || !state) continue;
    bucket.strengths.push(state.strength);
    if (Date.parse(state.dueAt) <= now) {
      bucket.due += 1;
    }
    if (state.strugglingFlag || state.strength < 0.45) {
      bucket.struggling += 1;
    }
  }

  return Array.from(grouped.entries()).map(([domain, bucket]) => ({
    domain: domain as Skill["domain"],
    averageStrength: bucket.strengths.length
      ? Number(
          (
            bucket.strengths.reduce((sum, value) => sum + value, 0) / bucket.strengths.length
          ).toFixed(2),
        )
      : 0,
    skillCount: bucket.strengths.length,
    dueCount: bucket.due,
    strugglingCount: bucket.struggling,
  }));
}

function buildDueSkill(
  state: StudentSkillState,
  skills: Skill[],
): {
  skillId: string;
  title: string;
  dueAt: string;
  strength: number;
  overdueDays: number;
  reason: "review" | "diagnostic" | "reteach" | "speed";
} {
  const skill = skills.find((item) => item.id === state.skillId);
  return {
    skillId: state.skillId,
    title: skill?.title ?? "",
    dueAt: state.dueAt,
    strength: state.strength,
    overdueDays: state.overdueDays ?? 0,
    reason: state.strugglingFlag ? "reteach" : "review",
  };
}

function buildSpeedFlag(state: StudentSkillState, skills: Skill[]) {
  const skill = skills.find((item) => item.id === state.skillId);
  return {
    skillId: state.skillId,
    title: skill?.title ?? "",
    avgLatencyMs: state.avgLatencyMs ?? 0,
    targetLatencyMs: SPEED_LATENCY_THRESHOLD_MS,
    speedFactor: state.speedFactor ?? 1,
  };
}

function buildCheckChartProgress(chartId: string, stateMap: Map<string, StudentSkillState>) {
  const fallback = {
    id: chartId,
    organizationId: undefined,
    title: "Progress",
    description: undefined,
    domain: "math" as const,
    gradeBand: "PreK" as const,
    stageCode: undefined,
    icon: undefined,
    color: undefined,
    displayOrder: 0,
    statements: [] as (typeof seedCheckCharts)[number]["statements"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const chart = seedCheckCharts.find((item) => item.id === chartId) ?? fallback;
  const statements = chart.statements ?? [];

  const completedEntryIds = statements
    .filter((statement) => {
      if (statement.coachOnly) return false;
      if (!statement.skillIds?.length) return false;
      const threshold = statement.threshold?.accuracy ?? 0.75;
      return statement.skillIds.some(
        (skillId) => (stateMap.get(skillId)?.strength ?? 0) >= threshold,
      );
    })
    .map((statement) => statement.id);

  const nextEntry = statements.find((statement) => !completedEntryIds.includes(statement.id));

  return {
    ...chart,
    completedEntryIds,
    nextEntryId: nextEntry?.id,
  };
}
