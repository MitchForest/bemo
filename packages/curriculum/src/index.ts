import type {
  Asset,
  CheckChart,
  CheckChartEntry,
  DiagnosticProbe,
  JoyBreak,
  MicroGame,
  MotivationLeague,
  MotivationQuest,
  MotivationReward,
  MotivationTrack,
  PracticeActivity,
  Skill,
  SkillTaskTemplate,
  TimeBackLedgerEntry,
} from "@repo/schemas";

import { COURSE_BLUEPRINTS } from "./data/courses";
import type { CourseKey, LessonKey, SubjectKey } from "./data/keys";
import { LESSON_BLUEPRINTS } from "./data/lessons";
import { allSkillBlueprints } from "./data/skills";
import { SUBJECT_BLUEPRINTS } from "./data/subjects";
import { buildSkillTaskTemplates } from "./data/tasks";

type GradeBand = Skill["gradeBand"];

interface CurriculumLesson {
  id: string;
  courseId: string;
  title: string;
  summary?: string;
  sequence: number;
  focusQuestion?: string;
  skillIds: string[];
  estimatedMinutes?: number;
  metadata: Record<string, unknown>;
}

interface CurriculumCourse {
  id: string;
  subjectId: string;
  title: string;
  summary?: string;
  gradeBand?: GradeBand;
  sequence: number;
  lessonIds: string[];
  metadata: Record<string, unknown>;
}

interface CurriculumSubject {
  id: string;
  title: string;
  domain: "reading" | "math";
  description?: string;
  courseIds: string[];
  metadata: Record<string, unknown>;
}

const makeId = (scope: number, index: number): string => {
  // For large scopes (90+), use a different pattern to stay within UUID limits
  let suffix: string;
  if (scope >= 90) {
    // Use format: 9X00000000YY where X is (scope-90) and YY is index
    const adjustedScope = scope - 90;
    suffix = `9${adjustedScope.toString().padStart(1, "0")}00000000${index.toString().padStart(2, "0")}`;
  } else {
    suffix = (scope * 1_000_000_000 + index).toString().padStart(12, "0");
  }
  return `00000000-0000-4000-8000-${suffix}`;
};

const SUBJECT_ID_ENTRIES = (Object.keys(SUBJECT_BLUEPRINTS) as SubjectKey[]).map(
  (key, index) => [key, makeId(90, index + 1)] as const,
);

export const SUBJECT_IDS = Object.freeze(Object.fromEntries(SUBJECT_ID_ENTRIES)) as Readonly<
  Record<SubjectKey, string>
>;

const COURSE_ID_ENTRIES = (Object.keys(COURSE_BLUEPRINTS) as CourseKey[]).map(
  (key, index) => [key, makeId(91, index + 1)] as const,
);

export const COURSE_IDS = Object.freeze(Object.fromEntries(COURSE_ID_ENTRIES)) as Readonly<
  Record<CourseKey, string>
>;

const LESSON_ID_ENTRIES = (Object.keys(LESSON_BLUEPRINTS) as LessonKey[]).map(
  (key, index) => [key, makeId(92, index + 1)] as const,
);

export const LESSON_IDS = Object.freeze(Object.fromEntries(LESSON_ID_ENTRIES)) as Readonly<
  Record<LessonKey, string>
>;

type SkillKey = (typeof allSkillBlueprints)[number]["key"];

const skillIdEntries: Array<[SkillKey, string]> = [];
const skillCategoryCount: Record<"reading" | "math", number> = { reading: 0, math: 0 };

const encompassingBySkillKey: Partial<
  Record<
    SkillKey,
    Array<{
      skillKey: SkillKey;
      weight: number;
    }>
  >
> = {
  MATH_FLUENCY_ADDITION_WITHIN_10: [{ skillKey: "MATH_ADD_WITHIN_10", weight: 1 }],
  MATH_FLUENCY_SUBTRACTION_WITHIN_10: [{ skillKey: "MATH_SUBTRACT_WITHIN_10", weight: 1 }],
  MATH_FLUENCY_WITHIN_20: [
    { skillKey: "MATH_FLUENCY_ADDITION_WITHIN_10", weight: 0.5 },
    { skillKey: "MATH_FLUENCY_SUBTRACTION_WITHIN_10", weight: 0.5 },
  ],
  MATH_COMPOSE_DECOMPOSE_10: [
    { skillKey: "MATH_COMPOSE_DECOMPOSE_5", weight: 0.5 },
    { skillKey: "MATH_TEN_FRAME_NUMBER_BONDS", weight: 0.5 },
  ],
  MATH_FOUNDATION_MULTIPLICATION_ARRAYS: [
    { skillKey: "MATH_FOUNDATION_MULTIPLICATION_EQUAL_GROUPS", weight: 1 },
  ],
  MATH_SOLVE_TWO_STEP_WORD_PROBLEMS: [
    { skillKey: "MATH_ADD_WITHIN_1000_WITH_REGROUP", weight: 0.5 },
    { skillKey: "MATH_SUBTRACT_WITHIN_1000_WITH_REGROUP", weight: 0.5 },
  ],
  MATH_UNDERSTAND_SIMPLE_FRACTIONS: [
    { skillKey: "MATH_PARTITION_SHAPES_HALVES_QUARTERS", weight: 0.6 },
    { skillKey: "MATH_SHARE_OBJECTS_EQUALLY", weight: 0.4 },
  ],
  MATH_FRACTIONS_NUMBER_LINE: [
    { skillKey: "MATH_NUMBER_LINE_TO_20", weight: 0.3 },
    { skillKey: "MATH_TELL_TIME_TO_NEAREST_FIVE", weight: 0.3 },
    { skillKey: "MATH_UNDERSTAND_SIMPLE_FRACTIONS", weight: 0.4 },
  ],
};

for (const blueprint of allSkillBlueprints) {
  const category = blueprint.key.startsWith("RD_") ? "reading" : "math";
  skillCategoryCount[category] += 1;
  const scope = category === "reading" ? 1 : 2;
  skillIdEntries.push([blueprint.key, makeId(scope, skillCategoryCount[category])]);
}

export const SKILL_IDS = Object.freeze(Object.fromEntries(skillIdEntries)) as Readonly<
  Record<SkillKey, string>
>;

const lessonSkillMap = new Map<LessonKey, string[]>();
const courseSkillMap = new Map<CourseKey, string[]>();
const skillRecords: Skill[] = allSkillBlueprints.map((blueprint) => {
  const id = SKILL_IDS[blueprint.key];
  const courseId = COURSE_IDS[blueprint.courseKey];
  const lessonId = LESSON_IDS[blueprint.lessonKey];
  const subjectId = SUBJECT_IDS[COURSE_BLUEPRINTS[blueprint.courseKey].subjectKey];

  lessonSkillMap.set(blueprint.lessonKey, [...(lessonSkillMap.get(blueprint.lessonKey) ?? []), id]);
  courseSkillMap.set(blueprint.courseKey, [...(courseSkillMap.get(blueprint.courseKey) ?? []), id]);

  const record: Skill = {
    id,
    title: blueprint.title,
    domain: blueprint.key.startsWith("RD_") ? "reading" : "math",
    strand: blueprint.strand,
    gradeBand: blueprint.gradeBand,
    stageCode: blueprint.stageCode,
    description: blueprint.description,
    subjectId,
    courseId,
    lessonId,
    prerequisites: (blueprint.prerequisites ?? []).map((key) => ({
      skillId: SKILL_IDS[key],
      gate: "AND",
    })),
    encompassing: (encompassingBySkillKey[blueprint.key] ?? []).map(({ skillKey, weight }) => ({
      skillId: SKILL_IDS[skillKey],
      weight,
    })),
    interferenceGroup: blueprint.interferenceGroup,
    expectedTimeSeconds: blueprint.expectedTimeSeconds,
    checkChartTags: [...(blueprint.checkChartTags ?? [blueprint.title])],
    assets: [],
  } as Skill;
  return record;
});

export const seedSkills: Skill[] = skillRecords;
export const seedLessons: CurriculumLesson[] = (Object.keys(LESSON_BLUEPRINTS) as LessonKey[]).map(
  (lessonKey) => {
    const blueprint = LESSON_BLUEPRINTS[lessonKey];
    return {
      id: LESSON_IDS[lessonKey],
      courseId: COURSE_IDS[blueprint.courseKey],
      title: blueprint.title,
      summary: blueprint.summary,
      sequence: blueprint.sequence,
      focusQuestion: blueprint.focusQuestion,
      skillIds: lessonSkillMap.get(lessonKey) ?? [],
      estimatedMinutes: blueprint.estimatedMinutes,
      metadata: {},
    } satisfies CurriculumLesson;
  },
);

const courseLessonMap = new Map<CourseKey, string[]>();
for (const lesson of seedLessons) {
  const courseKey = Object.entries(LESSON_IDS).find(([, id]) => id === lesson.id)?.[0] as
    | LessonKey
    | undefined;
  if (!courseKey) continue;
  const courseKeyForLesson = LESSON_BLUEPRINTS[courseKey].courseKey;
  courseLessonMap.set(courseKeyForLesson, [
    ...(courseLessonMap.get(courseKeyForLesson) ?? []),
    lesson.id,
  ]);
}

export const seedCourses: CurriculumCourse[] = (Object.keys(COURSE_BLUEPRINTS) as CourseKey[]).map(
  (courseKey) => {
    const blueprint = COURSE_BLUEPRINTS[courseKey];
    return {
      id: COURSE_IDS[courseKey],
      subjectId: SUBJECT_IDS[blueprint.subjectKey],
      title: blueprint.title,
      summary: blueprint.summary,
      gradeBand: blueprint.gradeBand,
      sequence: blueprint.sequence,
      lessonIds: courseLessonMap.get(courseKey) ?? [],
      metadata: {},
    } satisfies CurriculumCourse;
  },
);

const subjectCourseMap = new Map<SubjectKey, string[]>();
for (const course of seedCourses) {
  const courseKey = Object.entries(COURSE_IDS).find(([, id]) => id === course.id)?.[0] as
    | CourseKey
    | undefined;
  if (!courseKey) continue;
  const subjectKey = COURSE_BLUEPRINTS[courseKey].subjectKey;
  subjectCourseMap.set(subjectKey, [...(subjectCourseMap.get(subjectKey) ?? []), course.id]);
}

export const seedSubjects: CurriculumSubject[] = (
  Object.keys(SUBJECT_BLUEPRINTS) as SubjectKey[]
).map((subjectKey) => {
  const blueprint = SUBJECT_BLUEPRINTS[subjectKey];
  return {
    id: SUBJECT_IDS[subjectKey],
    title: blueprint.title,
    domain: blueprint.domain,
    description: blueprint.description,
    courseIds: subjectCourseMap.get(subjectKey) ?? [],
    metadata: {},
  } satisfies CurriculumSubject;
});

const DEFAULT_TIMESTAMP = "2024-01-01T00:00:00.000Z";
const DEMO_STUDENT_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
] as const;

const readingBenchmarkSkill =
  seedSkills.find((skill) => skill.domain === "reading") ?? seedSkills[0];
const mathBenchmarkSkill = seedSkills.find((skill) => skill.domain === "math") ?? seedSkills[0];

export const seedAssets: Asset[] = [
  {
    id: makeId(93, 1),
    organizationId: undefined,
    title: "Galaxy Breathing Track",
    type: "audio",
    uri: "https://assets.bemo.dev/audio/galaxy-breathing.mp3",
    altText: "Guided breathing for joyful calm",
    locale: "en",
    durationMs: 60000,
    transcript:
      "Take a slow breath in as the stars sparkle... hold... now breathe out as the rocket glides.",
    metadata: { usage: "joy_break" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: makeId(93, 2),
    organizationId: undefined,
    title: "Counting Stars Illustration",
    type: "image",
    uri: "https://assets.bemo.dev/images/counting-stars.png",
    altText: "Night sky with ten sparkling stars",
    locale: "en",
    durationMs: undefined,
    transcript: undefined,
    metadata: { usage: "diagnostic" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

export const seedMicroGames: MicroGame[] = [
  {
    id: makeId(94, 1),
    slug: "rocket-run",
    title: "Rocket Run",
    genre: "arcade",
    description: "Tap numbers in sequence to fuel your rocket and soar past the moon.",
    domain: "math",
    engineHooks: { awardXp: 12 },
    ioSchema: { input: "tap" },
    ui: { theme: "space" },
    assetIds: [seedAssets[1].id],
    modalities: ["tap"],
    sensoryTags: ["visual", "auditory"],
    purposes: ["fluency"],
    difficultyBand: "core",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

export const seedPracticeActivities: PracticeActivity[] = [
  {
    id: makeId(94, 2),
    skillId: mathBenchmarkSkill.id,
    type: "game",
    title: "Rocket Skip Count",
    description: "Skip count by tens to keep the rocket engines humming.",
    microGameId: seedMicroGames[0].id,
    config: { skipBy: 10, maxTarget: 120 },
    expectedMinutes: 3,
    assetIds: [],
    modalities: ["tap"],
    sensoryTags: ["visual"],
    purposes: ["fluency"],
    difficultyBand: "core",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

const checkChartId = makeId(95, 1);
const checkChartStatements: CheckChartEntry[] = [
  {
    id: makeId(95, 2),
    chartId: checkChartId,
    label: `I can ${readingBenchmarkSkill.title.toLowerCase()}`,
    skillIds: [readingBenchmarkSkill.id],
    threshold: { accuracy: 0.85, consecutivePasses: 2 },
    displayOrder: 0,
    iconAssetId: undefined,
    badgeId: undefined,
    coachOnly: false,
    celebrationCopy: "Reading spark unlocked!",
    metadata: {},
  },
  {
    id: makeId(95, 3),
    chartId: checkChartId,
    label: `I can review ${mathBenchmarkSkill.title.toLowerCase()}`,
    skillIds: [mathBenchmarkSkill.id],
    threshold: { accuracy: 0.8, consecutivePasses: 2 },
    displayOrder: 1,
    iconAssetId: undefined,
    badgeId: undefined,
    coachOnly: false,
    celebrationCopy: "Math muscles flexed!",
    metadata: {},
  },
];

export const seedCheckCharts: CheckChart[] = [
  {
    id: checkChartId,
    organizationId: undefined,
    title: "Early Learning Highlights",
    description: "Snapshots of joyful progress across reading and math.",
    domain: readingBenchmarkSkill.domain,
    gradeBand: readingBenchmarkSkill.gradeBand,
    stageCode: undefined,
    icon: "sparkles",
    color: "#2563eb",
    displayOrder: 0,
    statements: checkChartStatements,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

export const seedCheckChartEntries: CheckChartEntry[] = checkChartStatements;

const XP_TRACK_ID = makeId(90, 1);
const WEEKLY_TRACK_ID = makeId(90, 2);

export const seedMotivationTracks: MotivationTrack[] = [
  {
    id: XP_TRACK_ID,
    organizationId: undefined,
    title: "Daily Spark Track",
    description: "Collect XP to earn playful stickers.",
    targetXp: 50,
    cadence: "daily",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: WEEKLY_TRACK_ID,
    organizationId: undefined,
    title: "Weekly Glow Track",
    description: "Aim for your weekly XP goal to unlock big rewards.",
    targetXp: 200,
    cadence: "weekly",
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

export const seedMotivationRewards: MotivationReward[] = [
  {
    id: makeId(91, 1),
    trackId: XP_TRACK_ID,
    type: "sticker",
    title: "Sparkle Star Sticker",
    description: "Unlocked after earning 25 XP in a day.",
    threshold: 25,
    icon: undefined,
    assetIds: [],
    metadata: { stickerSlug: "sparkle-star" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: makeId(91, 2),
    trackId: XP_TRACK_ID,
    type: "sticker",
    title: "Rainbow Rocket Sticker",
    description: "Earned at the daily goal of 50 XP.",
    threshold: 50,
    icon: undefined,
    assetIds: [],
    metadata: { stickerSlug: "rainbow-rocket" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: makeId(91, 3),
    trackId: WEEKLY_TRACK_ID,
    type: "sticker",
    title: "Galaxy Badge",
    description: "Celebrate meeting the weekly XP goal!",
    threshold: 200,
    icon: undefined,
    assetIds: [],
    metadata: { stickerSlug: "galaxy-badge" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

const motivationLeagueId = makeId(96, 1);
const motivationSquadId = makeId(96, 2);

export const seedMotivationLeagues: MotivationLeague[] = [
  {
    id: motivationLeagueId,
    title: "Spark League",
    type: "squad",
    tier: "spark",
    rank: 1,
    weeklyXpTarget: 200,
    squads: [
      {
        id: motivationSquadId,
        leagueId: motivationLeagueId,
        name: "Trailblazers",
        description: "Joyful explorers cheering each other on.",
        invitationCode: "SPARK1",
        members: [
          {
            studentId: DEMO_STUDENT_IDS[0],
            displayName: "Maya",
            avatarUrl: undefined,
            xpThisWeek: 120,
            isLeader: true,
          },
          {
            studentId: DEMO_STUDENT_IDS[1],
            displayName: "Lucas",
            avatarUrl: undefined,
            xpThisWeek: 95,
            isLeader: false,
          },
        ],
        weeklyXp: 215,
        rank: 1,
      },
    ],
  },
];

export const seedMotivationQuests: MotivationQuest[] = [
  {
    id: makeId(96, 3),
    title: "Launch Prep",
    description: "Complete three quick wins to launch today's quest.",
    type: "daily",
    xpReward: 30,
    badgeId: undefined,
    tasks: [
      {
        id: makeId(96, 4),
        description: "Finish a review card",
        progress: 0,
        completed: false,
      },
      {
        id: makeId(96, 5),
        description: "Check in with a joy break",
        progress: 0,
        completed: false,
      },
      {
        id: makeId(96, 6),
        description: "Earn 20 XP in math today",
        progress: 0,
        completed: false,
      },
    ],
    status: "active",
    progressPercent: 0,
    expiresAt: undefined,
  },
];

export const seedJoyBreaks: JoyBreak[] = [
  {
    id: makeId(96, 7),
    title: "Galaxy Breathing",
    description: "A calming space-themed breathing exercise to celebrate progress.",
    durationSeconds: 120,
    assetIds: [seedAssets[0].id],
    metadata: { category: "calm" },
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  },
];

export const seedDiagnosticProbes: DiagnosticProbe[] = [
  {
    id: makeId(97, 1),
    skillId: mathBenchmarkSkill.id,
    difficulty: 0.35,
    prompt: {
      stem: "How many stars do you see in the sky?",
      itemType: "tap_to_count",
      assetIds: [seedAssets[1].id],
      timerSeconds: 45,
      hints: ["Touch each star once"],
    },
    expectedLatencyMs: 4500,
    tags: ["counting", "entry"],
  },
  {
    id: makeId(97, 2),
    skillId: readingBenchmarkSkill.id,
    difficulty: 0.5,
    prompt: {
      stem: "Which word spells the sound 'at'?",
      itemType: "choice_text",
      options: ["cat", "cup", "cap"],
      hints: ["Look for the ending letter"],
    },
    expectedLatencyMs: 6500,
    tags: ["phonics"],
  },
];

export const seedTimeBackLedger: TimeBackLedgerEntry[] = [
  {
    id: makeId(97, 3),
    studentId: DEMO_STUDENT_IDS[0],
    source: "daily_goal",
    minutesGranted: 10,
    grantedAt: DEFAULT_TIMESTAMP,
    expiresAt: undefined,
    consumedAt: undefined,
    note: "Daily spark complete",
  },
];

export function getSkillsByDomain(domain: Skill["domain"]): Skill[] {
  return seedSkills.filter((skill) => skill.domain === domain);
}

export function getSkillsByGrade(gradeBand: Skill["gradeBand"]): Skill[] {
  return seedSkills.filter((skill) => skill.gradeBand === gradeBand);
}

export function getSkillById(id: string): Skill | undefined {
  return seedSkills.find((skill) => skill.id === id);
}

export const seedSkillTaskTemplates: SkillTaskTemplate[] = buildSkillTaskTemplates(
  seedSkills,
  makeId,
);

export function getTaskTemplatesBySkill(skillId: string): SkillTaskTemplate[] {
  return seedSkillTaskTemplates.filter((template) => template.skillId === skillId);
}

export function getDiagnosticProbeById(id: string): DiagnosticProbe | undefined {
  return seedDiagnosticProbes.find((probe) => probe.id === id);
}

export function getDiagnosticProbesBySkill(skillId: string): DiagnosticProbe[] {
  return seedDiagnosticProbes.filter((probe) => probe.skillId === skillId);
}

export function getMotivationLeagues(): MotivationLeague[] {
  return seedMotivationLeagues;
}

export function getMotivationLeagueById(id: string): MotivationLeague | undefined {
  return seedMotivationLeagues.find((league) => league.id === id);
}

export function getMotivationQuests(): MotivationQuest[] {
  return seedMotivationQuests;
}

export function getTimeBackLedgerEntries(_: string): TimeBackLedgerEntry[] {
  return [];
}
