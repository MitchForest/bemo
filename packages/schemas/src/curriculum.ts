import { z } from "@hono/zod-openapi";
import {
  DomainSchema,
  GradeBandSchema,
  ItemTypeSchema,
  ModalitySchema,
  PrereqGateSchema,
  SensoryTagSchema,
  TaskIntentSchema,
  TaskStepKindSchema,
} from "./common";

export const MathStageCodeSchema = z
  .enum([
    "M0_FOUNDATIONS",
    "M1_PREK_CORE",
    "M2_PREK_STRETCH",
    "M3_K_CORE",
    "M4_G1_CORE",
    "M5_G2_EXTENSION",
  ])
  .openapi({
    description: "Math learning progression stage",
    example: "M2_PREK_STRETCH",
  });

export const ReadingStageCodeSchema = z
  .enum([
    "R0_FOUNDATIONS",
    "R1_PREK_CORE",
    "R2_K_PHONICS",
    "R3_K_AUTOMATIC",
    "R4_G1_CORE",
    "R5_G2_EXTENSION",
  ])
  .openapi({
    description: "Reading learning progression stage",
    example: "R2_K_PHONICS",
  });

export const StageCodeSchema = z.union([MathStageCodeSchema, ReadingStageCodeSchema]).openapi({
  description: "Subject-specific progression stage code",
  example: "R2_K_PHONICS",
});

export const SkillPrerequisiteSchema = z
  .object({
    skillId: z.string().uuid(),
    gate: PrereqGateSchema,
  })
  .openapi({ description: "Skill prerequisite" });

export const EncompassingRelationSchema = z
  .object({
    skillId: z.string().uuid(),
    weight: z.number().min(-1).max(1).openapi({
      description:
        "Fractional repetition credit applied to the related skill (negative values subtract reps)",
      example: 0.4,
    }),
  })
  .openapi({ description: "Encompassing skill relationship" });

export const SkillSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    domain: DomainSchema,
    strand: z.string().openapi({
      description: "Curriculum strand",
      example: "Counting & Cardinality",
    }),
    gradeBand: GradeBandSchema,
    stageCode: StageCodeSchema.optional(),
    description: z.string().optional(),
    subjectId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    lessonId: z.string().uuid().optional(),
    prerequisites: z.array(SkillPrerequisiteSchema).default([]),
    encompassing: z.array(EncompassingRelationSchema).default([]),
    interferenceGroup: z.string().optional().openapi({
      description: "Group of confusable skills",
      example: "cvc-short-vowels",
    }),
    expectedTimeSeconds: z.number().int().positive(),
    checkChartTags: z.array(z.string()).default([]),
    assets: z.array(z.string()).default([]).openapi({
      description: "Media asset IDs",
    }),
  })
  .openapi({
    description: "Skill (fundamental practice unit)",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Decode CVC words with short a",
      domain: "reading",
      strand: "Phonics",
      gradeBand: "K",
      expectedTimeSeconds: 240,
      checkChartTags: ["I can read CVC words"],
    },
  });

export const RubricSchema = z
  .object({
    type: z.enum([
      "exact",
      "phoneme_match",
      "count_equals",
      "path_tolerance",
      "latency_thresholds",
    ]),
    config: z.record(z.any()).optional(),
  })
  .openapi({ description: "Scoring rubric" });

export const ItemPromptSchema = z
  .object({
    text: z.string().optional(),
    audioUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    ttsScript: z.string().optional(),
  })
  .openapi({ description: "Item prompt content" });

export const LearningItemSchema = z
  .object({
    id: z.string().uuid(),
    skillId: z.string().uuid(),
    taskTemplateId: z.string().uuid().optional(),
    type: ItemTypeSchema,
    prompt: ItemPromptSchema,
    rubric: RubricSchema,
    difficulty: z.number().int().min(1).max(5),
    timeEstimateMs: z.number().int().positive(),
    randomization: z.record(z.any()).optional(),
    encompassingTargets: z
      .array(
        z.object({
          skillId: z.string().uuid(),
          weight: z.number().min(-1).max(1),
        }),
      )
      .default([]),
  })
  .openapi({
    description: "Instructional item linked to a skill task",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174001",
      skillId: "123e4567-e89b-12d3-a456-426614174000",
      type: "choice_text",
      prompt: { text: 'Which word is "cat"?' },
      rubric: { type: "exact" },
      difficulty: 2,
      timeEstimateMs: 5000,
    },
  });

export const TaskStepItemSchema = z
  .object({
    prompt: z.string().min(1),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional(),
    choices: z.array(z.string()).optional(),
  })
  .openapi({ description: "Practice or check item inside a task step" });

export const TaskStepSchema = z
  .object({
    kind: TaskStepKindSchema,
    prompt: z.string().min(1),
    expectedResponse: z.string().optional(),
    modality: ModalitySchema.optional(),
    assets: z.array(z.string().uuid()).default([]),
    hints: z.array(z.string()).default([]),
    items: z.array(TaskStepItemSchema).optional(),
    exitAfterConsecutiveCorrect: z.number().int().min(1).optional(),
  })
  .openapi({ description: "Single instructional or practice move inside a template" });

export const SkillTaskTemplateSchema = z
  .object({
    id: z.string().uuid(),
    skillId: z.string().uuid(),
    intent: TaskIntentSchema,
    title: z.string().min(1).max(200),
    xpAward: z.number().int().min(0).default(0),
    estimatedMinutes: z.number().int().min(1).max(10).default(3),
    modalities: z.array(ModalitySchema).default([]),
    sensoryTags: z.array(SensoryTagSchema).default([]),
    steps: z.array(TaskStepSchema),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({
    description: "Reusable micro-lesson specifying how to move a skill forward",
    example: {
      id: "987e6543-e21b-45d3-a456-426614174111",
      skillId: "123e4567-e89b-12d3-a456-426614174000",
      intent: "learn",
      title: "Learn: Decode CVC words with short a",
      xpAward: 20,
      estimatedMinutes: 3,
      modalities: ["voice", "tap"],
      steps: [
        {
          kind: "instruction",
          prompt: "Listen and point as we sound out cat.",
          modality: "voice",
        },
      ],
    },
  });

export type Skill = z.infer<typeof SkillSchema>;
export type SkillPrerequisite = z.infer<typeof SkillPrerequisiteSchema>;
export type EncompassingRelation = z.infer<typeof EncompassingRelationSchema>;
export type LearningItem = z.infer<typeof LearningItemSchema>;
export type SkillTaskTemplate = z.infer<typeof SkillTaskTemplateSchema>;
export type TaskStep = z.infer<typeof TaskStepSchema>;
export type TaskStepItem = z.infer<typeof TaskStepItemSchema>;
export type StageCode = z.infer<typeof StageCodeSchema>;
