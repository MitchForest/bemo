import { getDiagnosticProbesBySkill, getTaskTemplatesBySkill } from "@repo/curriculum";
import type {
  PlanRequest,
  PlanStats,
  Skill,
  SkillTaskTemplate,
  StudentSkillState,
  Task,
} from "@repo/schemas";
import {
  createSyntheticTaskId,
  getAllSkills,
  loadStudentProfile,
  loadStudentSkillStates,
  prerequisitesMet,
} from "./data";
import { isMastered } from "./memory";

const MASTERED_STRENGTH_THRESHOLD = 0.82;
const STRUGGLE_STRENGTH_THRESHOLD = 0.45;
const SPEED_LATENCY_THRESHOLD_MS = 3200;
const SPEED_FACTOR_THRESHOLD = 1.1;

export interface PlanComputationResult {
  tasks: Task[];
  stats: PlanStats;
  studentStates: StudentSkillState[];
  motivation?: { xpTarget: number; projectedXp: number; timeBackMinutes: number };
}

export async function getPlan(
  params: PlanRequest & { studentId: string },
): Promise<PlanComputationResult> {
  const skills = await getAllSkills();
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const states = await loadStudentSkillStates(params.studentId, skills);
  const stateMap = new Map(states.map((state) => [state.skillId, state]));
  const now = new Date();

  const dueStates = states
    .filter((state) => Date.parse(state.dueAt) <= now.getTime())
    .sort((a, b) => priorityScore(skillMap, a) - priorityScore(skillMap, b));

  const overdueStates = dueStates.filter(
    (state) => state.overdueDays > 0 || Date.parse(state.dueAt) < now.getTime(),
  );

  const tasks: Task[] = [];
  const scheduledSkillIds = new Set<string>();

  const addTask = (task: Task) => {
    tasks.push(task);
    for (const skillId of task.skillIds) {
      scheduledSkillIds.add(skillId);
    }
  };

  const maxTasks = params.max ?? 5;

  // 1. Prioritize math review and struggling skills (80/20 focus)
  for (const state of dueStates) {
    if (tasks.length >= maxTasks) break;
    if (scheduledSkillIds.has(state.skillId)) continue;
    const skill = skillMap.get(state.skillId);
    if (!skill) continue;

    const reviewTask = buildReviewTask(skill, state, skillMap, now);
    addTask(reviewTask);
  }

  // 2. Fill with frontier lessons respecting domain rotation
  if (tasks.length < maxTasks) {
    const frontierSkills = computeFrontierSkills(skills, stateMap);
    const rotation = buildDomainRotation(frontierSkills);

    while (tasks.length < maxTasks && rotation.hasNext()) {
      const nextSkill = rotation.next();
      if (!nextSkill) break;
      if (scheduledSkillIds.has(nextSkill.id)) continue;

      const lessonTask = buildLessonTask(nextSkill, stateMap.get(nextSkill.id), now);
      addTask(lessonTask);
    }
  }

  // 3. Speed drills when requested
  if (params.includeSpeedDrills && tasks.length < maxTasks) {
    const speedTask = pickSpeedDrillTask(states, skillMap, scheduledSkillIds, now);
    if (speedTask) {
      addTask(speedTask);
    }
  }

  // 4. Optional diagnostic slot when requested and math frontier exists
  if (params.includeDiagnostic && tasks.length < maxTasks) {
    const diagnosticTask = buildDiagnosticTask(skillMap, stateMap, scheduledSkillIds, now);
    if (diagnosticTask) {
      addTask(diagnosticTask);
    }
  }

  const stats = buildPlanStats(dueStates, overdueStates, states, tasks);

  const profile = await loadStudentProfile(params.studentId);
  const projectedXp = tasks.reduce(
    (sum, task) => sum + task.xpValue + (task.motivation?.xpBonus ?? 0),
    0,
  );
  const motivation = {
    xpTarget: profile.settings.dailyXpGoal ?? 80,
    projectedXp,
    timeBackMinutes: Math.max(0, Math.round(projectedXp / 10)),
  };

  return {
    tasks,
    stats,
    studentStates: states,
    motivation,
  };
}

function buildReviewTask(
  skill: Skill,
  state: StudentSkillState,
  skillMap: Map<string, Skill>,
  now: Date,
): Task {
  const supplementalSkills = collectEncompassedSkills(skill, skillMap);
  const targetSkillIds = [skill.id, ...supplementalSkills];
  const reason =
    state.strugglingFlag || state.strength < STRUGGLE_STRENGTH_THRESHOLD
      ? "struggling_support"
      : "compressed_review";
  const fallbackModalities = defaultModalities(skill.domain, "review");
  const taskTemplateContext = resolveTaskTemplateContext(skill, reason, fallbackModalities);
  const estimatedMinutes =
    taskTemplateContext.estimatedMinutes ?? estimateMinutes(skill.expectedTimeSeconds);
  const xpValue =
    taskTemplateContext.xpAward > 0
      ? taskTemplateContext.xpAward
      : Math.round(estimatedMinutes * (reason === "struggling_support" ? 13 : 11));

  return {
    id: createSyntheticTaskId(),
    type: "review",
    skillIds: targetSkillIds,
    taskTemplateIds: taskTemplateContext.taskTemplateIds,
    estimatedMinutes,
    xpValue,
    modalities: taskTemplateContext.modalities,
    modalityCaps: buildModalityCaps(skill, "review"),
    reason,
    intent: taskTemplateContext.intent,
    priority: computePriority(state),
    scheduledAt: now.toISOString(),
    dueAt: state.dueAt,
    tags: [skill.domain, "review"],
    motivation:
      reason === "struggling_support"
        ? { xpBonus: 10, streakImpact: { type: "maintain" } }
        : undefined,
    metadata: {
      stability: state.stability,
      strength: state.strength,
      dueAt: state.dueAt,
      overdueDays: state.overdueDays,
      taskTemplateIds: taskTemplateContext.taskTemplateIds,
      sensoryTags: taskTemplateContext.sensoryTags,
      intent: taskTemplateContext.intent,
      primarySkillId: skill.id,
      primarySkillTitle: skill.title,
    },
  };
}

function buildLessonTask(skill: Skill, state: StudentSkillState | undefined, now: Date): Task {
  const supplementalSkills = collectEncompassedSkills(skill);
  const targetSkillIds = [skill.id, ...supplementalSkills];
  const reason =
    state && state.strength < STRUGGLE_STRENGTH_THRESHOLD ? "struggling_support" : "frontier";
  const fallbackModalities = defaultModalities(skill.domain, "lesson");
  const taskTemplateContext = resolveTaskTemplateContext(skill, reason, fallbackModalities);
  const estimatedMinutes =
    taskTemplateContext.estimatedMinutes ?? estimateMinutes(skill.expectedTimeSeconds);
  const xpValue =
    taskTemplateContext.xpAward > 0
      ? taskTemplateContext.xpAward
      : Math.round(estimatedMinutes * (reason === "struggling_support" ? 12 : 11));

  return {
    id: createSyntheticTaskId(),
    type: "lesson",
    skillIds: targetSkillIds,
    taskTemplateIds: taskTemplateContext.taskTemplateIds,
    estimatedMinutes,
    xpValue,
    modalities: taskTemplateContext.modalities,
    modalityCaps: buildModalityCaps(skill, "lesson"),
    reason,
    intent: taskTemplateContext.intent,
    priority: state ? computePriority(state) : 3,
    scheduledAt: now.toISOString(),
    tags: [skill.domain, "frontier"],
    motivation: reason === "frontier" ? { xpBonus: 6 } : { xpBonus: 8 },
    metadata: {
      expectedTimeSeconds: skill.expectedTimeSeconds,
      taskTemplateIds: taskTemplateContext.taskTemplateIds,
      sensoryTags: taskTemplateContext.sensoryTags,
      intent: taskTemplateContext.intent,
      primarySkillId: skill.id,
      primarySkillTitle: skill.title,
    },
  };
}

function pickSpeedDrillTask(
  states: StudentSkillState[],
  skillMap: Map<string, Skill>,
  scheduledSkillIds: Set<string>,
  now: Date,
): Task | undefined {
  const candidates = states
    .filter(
      (state) =>
        isMastered(state) &&
        !scheduledSkillIds.has(state.skillId) &&
        ((state.avgLatencyMs ?? 0) > SPEED_LATENCY_THRESHOLD_MS ||
          (state.speedFactor ?? 1) > SPEED_FACTOR_THRESHOLD),
    )
    .sort((a, b) => (b.avgLatencyMs ?? 0) - (a.avgLatencyMs ?? 0));

  for (const candidate of candidates) {
    const skill = skillMap.get(candidate.skillId);
    if (!skill) continue;
    const templateContext = resolveTaskTemplateContext(skill, "speed_drill", ["tap"]);
    const estimatedMinutes =
      templateContext.estimatedMinutes ??
      Math.min(5, Math.max(2, Math.round(skill.expectedTimeSeconds / 120)));
    const xpValue = templateContext.xpAward > 0 ? templateContext.xpAward : estimatedMinutes * 9;
    return {
      id: createSyntheticTaskId(),
      type: "speed_drill",
      skillIds: [skill.id],
      estimatedMinutes,
      taskTemplateIds: templateContext.taskTemplateIds,
      xpValue,
      modalities: templateContext.modalities.length ? templateContext.modalities : ["tap"],
      modalityCaps: { recommendedDevice: "touch" as const },
      reason: "speed_drill",
      intent: templateContext.intent,
      priority: 4,
      scheduledAt: now.toISOString(),
      tags: [skill.domain, "speed"],
      motivation: { xpBonus: 5 },
      metadata: {
        targetLatencyMs: SPEED_LATENCY_THRESHOLD_MS,
        avgLatencyMs: candidate.avgLatencyMs,
        taskTemplateIds: templateContext.taskTemplateIds,
        intent: templateContext.intent,
        primarySkillId: skill.id,
        primarySkillTitle: skill.title,
      },
    };
  }

  return undefined;
}

function buildDiagnosticTask(
  skillMap: Map<string, Skill>,
  stateMap: Map<string, StudentSkillState>,
  scheduledSkillIds: Set<string>,
  now: Date,
): Task | undefined {
  const mathFrontier = Array.from(skillMap.values())
    .filter((skill) => skill.domain === "math" && !scheduledSkillIds.has(skill.id))
    .find((skill) => {
      const state = stateMap.get(skill.id);
      return !state || state.strength < MASTERED_STRENGTH_THRESHOLD;
    });

  if (!mathFrontier) return undefined;

  const probes = getDiagnosticProbesBySkill(mathFrontier.id);
  if (!probes.length) return undefined;

  const fallbackModalities = defaultModalities(mathFrontier.domain, "diagnostic");
  const templateContext = resolveTaskTemplateContext(
    mathFrontier,
    "diagnostic",
    fallbackModalities,
  );
  const estimatedMinutes = templateContext.estimatedMinutes ?? 4;
  const xpValue = templateContext.xpAward > 0 ? templateContext.xpAward : 15;

  return {
    id: createSyntheticTaskId(),
    type: "diagnostic",
    skillIds: [mathFrontier.id],
    taskTemplateIds: templateContext.taskTemplateIds,
    estimatedMinutes,
    xpValue,
    modalities: templateContext.modalities,
    modalityCaps: { recommendedDevice: "touch" as const },
    reason: "diagnostic",
    intent: templateContext.intent,
    priority: 3,
    scheduledAt: now.toISOString(),
    tags: ["math", "diagnostic"],
    metadata: {
      probes: probes.map((probe) => ({ probeId: probe.id, difficulty: probe.difficulty })),
      taskTemplateIds: templateContext.taskTemplateIds,
      intent: templateContext.intent,
      primarySkillId: mathFrontier.id,
      primarySkillTitle: mathFrontier.title,
    },
  };
}

function buildPlanStats(
  dueStates: StudentSkillState[],
  overdueStates: StudentSkillState[],
  states: StudentSkillState[],
  tasks: Task[],
): PlanStats {
  const strugglingSkills = states.filter(
    (state) => state.strugglingFlag || state.strength < STRUGGLE_STRENGTH_THRESHOLD,
  ).length;
  const speedDrillOpportunities = states.filter(
    (state) =>
      isMastered(state) &&
      ((state.avgLatencyMs ?? 0) > SPEED_LATENCY_THRESHOLD_MS ||
        (state.speedFactor ?? 1) > SPEED_FACTOR_THRESHOLD),
  ).length;

  const totalSkillTouches = tasks.reduce((sum, task) => sum + task.skillIds.length, 0);
  const uniqueSkillTouches = new Set(tasks.flatMap((task) => task.skillIds)).size;

  return {
    dueSkills: dueStates.length,
    overdueSkills: overdueStates.length,
    strugglingSkills,
    speedDrillOpportunities,
    compressionRatio:
      totalSkillTouches > 0
        ? Number((uniqueSkillTouches / totalSkillTouches).toFixed(2))
        : undefined,
    plannedMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
  };
}

function computeFrontierSkills(skills: Skill[], stateMap: Map<string, StudentSkillState>): Skill[] {
  const unlocked = skills.filter((skill) => prerequisitesMet(skill, stateMap));
  const unseen = unlocked.filter((skill) => !stateMap.has(skill.id));
  const remediation = unlocked.filter((skill) => {
    const state = stateMap.get(skill.id);
    return state ? state.strength < STRUGGLE_STRENGTH_THRESHOLD : false;
  });

  const unique = new Map<string, Skill>();
  for (const skill of [...unseen, ...remediation]) {
    unique.set(skill.id, skill);
  }

  const result = Array.from(unique.values());
  result.sort((a, b) => {
    const domainOrder = domainPriority(a.domain) - domainPriority(b.domain);
    if (domainOrder !== 0) return domainOrder;
    const gradeCompare = gradeBandPriority(a.gradeBand) - gradeBandPriority(b.gradeBand);
    if (gradeCompare !== 0) return gradeCompare;
    return a.expectedTimeSeconds - b.expectedTimeSeconds;
  });

  return result;
}

function buildDomainRotation(skills: Skill[]) {
  const buckets: Record<Skill["domain"], Skill[]> = {
    math: [],
    reading: [],
  };

  for (const skill of skills) {
    buckets[skill.domain].push(skill);
  }

  const order: Skill["domain"][] = ["math", "reading"];
  let pointer = 0;

  return {
    hasNext(): boolean {
      return buckets.math.length + buckets.reading.length > 0;
    },
    next(): Skill | undefined {
      if (!this.hasNext()) return undefined;
      for (let i = 0; i < order.length; i++) {
        const domain = order[(pointer + i) % order.length];
        if (buckets[domain].length > 0) {
          pointer = (pointer + i + 1) % order.length;
          return buckets[domain].shift();
        }
      }
      return undefined;
    },
  };
}

function collectEncompassedSkills(skill: Skill, skillMap?: Map<string, Skill>): string[] {
  if (!skill.encompassing || skill.encompassing.length === 0) {
    return [];
  }

  const ids: string[] = [];
  for (const relation of skill.encompassing) {
    if (!skillMap || skillMap.has(relation.skillId)) {
      ids.push(relation.skillId);
    }
  }

  return ids;
}

function resolveTaskTemplateContext(
  skill: Skill,
  reason: Task["reason"] | undefined,
  fallbackModalities: Task["modalities"],
): {
  taskTemplateIds: string[];
  modalities: Task["modalities"];
  sensoryTags: string[];
  xpAward: number;
  estimatedMinutes?: number;
  intent?: SkillTaskTemplate["intent"];
} {
  const templates = getTaskTemplatesBySkill(skill.id);
  if (templates.length === 0) {
    return {
      taskTemplateIds: [],
      modalities: fallbackModalities,
      sensoryTags: [],
      xpAward: 0,
    };
  }

  const filtered = filterTaskTemplatesByReason(templates, reason);
  const chosen = filtered.length > 0 ? filtered : templates;
  const primary = chosen[0];
  const taskTemplateIds = chosen.map((template) => template.id);
  const allModalities = chosen.flatMap((template) => template.modalities ?? []);
  const modalities = unique(allModalities) as Task["modalities"];
  const sensoryTags = unique(chosen.flatMap((template) => template.sensoryTags ?? []));

  return {
    taskTemplateIds,
    modalities: modalities.length > 0 ? modalities : fallbackModalities,
    sensoryTags,
    xpAward: primary?.xpAward ?? 0,
    estimatedMinutes: primary?.estimatedMinutes,
    intent: primary?.intent,
  };
}

function filterTaskTemplatesByReason(
  templates: SkillTaskTemplate[],
  reason: Task["reason"] | undefined,
): SkillTaskTemplate[] {
  if (!reason) {
    return templates;
  }

  const targetIntents = new Set<SkillTaskTemplate["intent"]>();
  switch (reason) {
    case "frontier":
      targetIntents.add("learn");
      break;
    case "compressed_review":
      targetIntents.add("review_prompt");
      targetIntents.add("independent_practice");
      targetIntents.add("quick_check");
      break;
    case "struggling_support":
      targetIntents.add("guided_practice");
      targetIntents.add("independent_practice");
      break;
    case "speed_drill":
      targetIntents.add("fluency");
      break;
    case "diagnostic":
      targetIntents.add("quick_check");
      break;
    default:
      break;
  }

  if (targetIntents.size === 0) {
    return templates;
  }

  const filtered = templates.filter((template) => targetIntents.has(template.intent));
  return filtered.length > 0 ? filtered : templates;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function estimateMinutes(expectedTimeSeconds: number): number {
  return Math.min(40, Math.max(2, Math.round(expectedTimeSeconds / 60)));
}

function defaultModalities(
  domain: Skill["domain"],
  kind: "review" | "lesson" | "diagnostic",
): Task["modalities"] {
  if (kind === "diagnostic") {
    return ["tap"];
  }
  if (domain === "reading") {
    return ["voice", "tap"];
  }
  if (kind === "review") {
    return ["tap", "drag"];
  }
  return ["tap"];
}

function buildModalityCaps(skill: Skill, kind: "review" | "lesson" | "diagnostic") {
  if (kind === "diagnostic") {
    return { recommendedDevice: "touch" as const };
  }
  if (skill.domain === "reading") {
    return { requiresVoice: true, recommendedDevice: "touch" as const };
  }
  return { recommendedDevice: "touch" as const };
}

function computePriority(state: StudentSkillState): number {
  if (state.overdueDays >= 3) return 5;
  if (state.overdueDays >= 1) return 4;
  if (state.strugglingFlag) return 4;
  return 3;
}

function domainPriority(domain: Skill["domain"]): number {
  return domain === "math" ? 0 : 1;
}

function gradeBandPriority(gradeBand: Skill["gradeBand"]): number {
  switch (gradeBand) {
    case "PreK":
      return 0;
    case "K":
      return 1;
    case "1":
      return 2;
    default:
      return 99;
  }
}

function priorityScore(skillMap: Map<string, Skill>, state: StudentSkillState): number {
  const skill = skillMap.get(state.skillId);
  const domainScore = skill ? domainPriority(skill.domain) : 2;
  const dueDeltaHours = Math.max(0, (Date.now() - Date.parse(state.dueAt)) / (1000 * 60 * 60));
  const strugglingBoost = state.strugglingFlag ? -15 : 0;
  return domainScore * 100 - dueDeltaHours * 5 + strugglingBoost;
}
