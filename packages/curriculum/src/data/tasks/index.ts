import type { Skill, SkillTaskTemplate, TaskIntent, TaskStep } from "@repo/schemas";

const TEMPLATE_SCOPE: Record<TaskIntent, number> = {
  learn: 30,
  guided_practice: 31,
  independent_practice: 32,
  fluency: 33,
  review_prompt: 34,
  quick_check: 35,
};

const LEARN_XP = 25;
const GUIDED_XP = 18;
const INDEPENDENT_XP = 18;
const REVIEW_XP = 12;
const QUICK_CHECK_XP = 10;

const FLUENCY_TIMER_SECONDS = 60;

type TemplateIdFactory = (intent: TaskIntent) => string;

type StepInput = Omit<TaskStep, "assets" | "hints"> & Partial<Pick<TaskStep, "assets" | "hints">>;

const makeStep = (step: StepInput): TaskStep => ({
  assets: [],
  hints: [],
  ...step,
});

const createLearnTemplate = (skill: Skill, createId: TemplateIdFactory): SkillTaskTemplate => ({
  id: createId("learn"),
  skillId: skill.id,
  intent: "learn",
  title: `Learn: ${skill.title}`,
  xpAward: LEARN_XP,
  estimatedMinutes: 3,
  modalities: ["voice", "tap"],
  sensoryTags: ["auditory", "visual"],
  steps: [
    makeStep({
      kind: "instruction",
      prompt: `Let's get ready to ${skill.title.toLowerCase()}. Listen and watch.`,
      modality: "voice",
    }),
    makeStep({
      kind: "example",
      prompt: `Watch how we ${skill.title.toLowerCase()}.`,
      expectedResponse: "Learner points or echoes the model.",
      modality: "voice",
    }),
    makeStep({
      kind: "guided_practice",
      prompt: `Try it with me. We will ${skill.title.toLowerCase()} together.`,
      expectedResponse: "Learner responds with coach support.",
      modality: "tap",
      hints: ["Model once, then let the learner take the lead."],
    }),
    makeStep({
      kind: "reflection",
      prompt: "Show a thumbs up if that felt good, sideways if you want to try again.",
    }),
  ],
  metadata: { recommendedAdultSupport: true },
});

const createGuidedPracticeTemplate = (
  skill: Skill,
  createId: TemplateIdFactory,
): SkillTaskTemplate => ({
  id: createId("guided_practice"),
  skillId: skill.id,
  intent: "guided_practice",
  title: `We Do: ${skill.title}`,
  xpAward: GUIDED_XP,
  estimatedMinutes: 3,
  modalities: ["voice", "tap"],
  sensoryTags: ["auditory"],
  steps: [
    makeStep({
      kind: "guided_practice",
      prompt: `Let's ${skill.title.toLowerCase()} together. I'll start and you finish.`,
      expectedResponse: "Learner completes the routine with prompts.",
      modality: "voice",
      hints: ["Use hand-over-hand support if needed."],
    }),
    makeStep({
      kind: "practice",
      prompt: "Now you try while I cheer.",
      expectedResponse: "Learner attempts the skill.",
      modality: "voice",
      hints: ["Give immediate praise when the learner attempts."],
    }),
    makeStep({
      kind: "reflection",
      prompt: "Tell me one part that felt easy and one part we can practice again.",
    }),
  ],
  metadata: { supportLevel: "high" },
});

const createIndependentPracticeTemplate = (
  skill: Skill,
  createId: TemplateIdFactory,
): SkillTaskTemplate => ({
  id: createId("independent_practice"),
  skillId: skill.id,
  intent: "independent_practice",
  title: `Your Turn: ${skill.title}`,
  xpAward: INDEPENDENT_XP,
  estimatedMinutes: 2,
  modalities: ["tap"],
  sensoryTags: ["auditory"],
  steps: [
    makeStep({
      kind: "practice",
      prompt: `Show me how you ${skill.title.toLowerCase()} all by yourself.`,
      modality: "tap",
      items: [
        {
          prompt: `Try it once: ${skill.title}.`,
          explanation: "Celebrate with a cheer if correct; model quickly if not.",
        },
        {
          prompt: `Try it one more time: ${skill.title}.`,
          explanation: "Notice what changed and praise effort.",
        },
      ],
      exitAfterConsecutiveCorrect: 2,
      hints: ["Keep the pace quick and positive."],
    }),
  ],
  metadata: { masteryRule: "2_consecutive_correct" },
});

const createReviewPromptTemplate = (
  skill: Skill,
  createId: TemplateIdFactory,
): SkillTaskTemplate => ({
  id: createId("review_prompt"),
  skillId: skill.id,
  intent: "review_prompt",
  title: `Remember: ${skill.title}`,
  xpAward: REVIEW_XP,
  estimatedMinutes: 1,
  modalities: ["voice"],
  sensoryTags: ["auditory"],
  steps: [
    makeStep({
      kind: "prompt",
      prompt: `Remember how to ${skill.title.toLowerCase()}? Show or tell it again.`,
      modality: "voice",
      hints: ["If the learner pauses, give a tiny reminder then let them try."],
    }),
  ],
  metadata: { recommendedIntervalDays: 3 },
});

const createQuickCheckTemplate = (
  skill: Skill,
  createId: TemplateIdFactory,
): SkillTaskTemplate => ({
  id: createId("quick_check"),
  skillId: skill.id,
  intent: "quick_check",
  title: `Check: ${skill.title}`,
  xpAward: QUICK_CHECK_XP,
  estimatedMinutes: 1,
  modalities: ["tap"],
  sensoryTags: ["auditory"],
  steps: [
    makeStep({
      kind: "practice",
      prompt: `Can you ${skill.title.toLowerCase()} right now?`,
      modality: "voice",
      items: [
        {
          prompt: `Do it once: ${skill.title}.`,
          explanation: "If yes, celebrate. If not yet, note it for reteach.",
        },
      ],
      hints: ["Keep this short and upbeat."],
    }),
  ],
  metadata: { lockOnFailure: true },
});

const createFluencyTemplate = (skill: Skill, createId: TemplateIdFactory): SkillTaskTemplate => ({
  id: createId("fluency"),
  skillId: skill.id,
  intent: "fluency",
  title: `Speedy: ${skill.title}`,
  xpAward: QUICK_CHECK_XP,
  estimatedMinutes: 1,
  modalities: ["tap"],
  sensoryTags: ["auditory"],
  steps: [
    makeStep({
      kind: "practice",
      prompt: `Play a quick round of ${skill.title.toLowerCase()} in ${FLUENCY_TIMER_SECONDS} seconds.`,
      modality: "tap",
      items: [
        {
          prompt: "Repeat the skill three times quickly.",
          explanation: "Count how many tries fit in the time.",
        },
      ],
    }),
  ],
  metadata: { timerSeconds: FLUENCY_TIMER_SECONDS },
});

const createTemplatesForSkill = (
  skill: Skill,
  createId: TemplateIdFactory,
): SkillTaskTemplate[] => {
  const templates: SkillTaskTemplate[] = [
    createLearnTemplate(skill, createId),
    createGuidedPracticeTemplate(skill, createId),
    createIndependentPracticeTemplate(skill, createId),
    createReviewPromptTemplate(skill, createId),
    createQuickCheckTemplate(skill, createId),
  ];

  if (skill.gradeBand === "1" || skill.gradeBand === "2") {
    templates.push(createFluencyTemplate(skill, createId));
  }

  return templates;
};

export function buildSkillTaskTemplates(
  skills: readonly Skill[],
  makeId: (scope: number, index: number) => string,
): SkillTaskTemplate[] {
  const templateCounters: Record<TaskIntent, number> = {
    learn: 0,
    guided_practice: 0,
    independent_practice: 0,
    fluency: 0,
    review_prompt: 0,
    quick_check: 0,
  };

  const createTemplateId: TemplateIdFactory = (intent) => {
    templateCounters[intent] += 1;
    return makeId(TEMPLATE_SCOPE[intent], templateCounters[intent]);
  };

  const templates: SkillTaskTemplate[] = [];
  for (const skill of skills) {
    templates.push(...createTemplatesForSkill(skill, createTemplateId));
  }
  return templates;
}
