import { z } from "@hono/zod-openapi";
import {
  DomainSchema,
  GradeBandSchema,
  ItemTypeSchema,
  ModalitySchema,
  PrereqGateSchema,
  ExperienceDeliveryKindSchema,
  ExperiencePurposeSchema,
  SensoryTagSchema,
} from "./common";

export const MathStageCodeSchema = z
  .enum(["M0_FOUNDATIONS", "M1_PREK_CORE", "M2_PREK_STRETCH", "M3_K_CORE", "M4_G1_CORE"])
  .openapi({
    description: "Math learning progression stage",
    example: "M2_PREK_STRETCH",
  });

export const ReadingStageCodeSchema = z
  .enum(["R0_FOUNDATIONS", "R1_PREK_CORE", "R2_K_PHONICS", "R3_K_AUTOMATIC", "R4_G1_CORE"])
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
      description: "Group of confusable topics",
      example: "CVC-short-vowels",
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

// Commented out - using organization.ts version
/* export const LessonSchema = z
  .object({
    id: z.string().uuid(),
    courseId: z.string().uuid(),
    title: z.string().min(1).max(200),
    summary: z.string().optional(),
    sequence: z.number().int().min(0).default(0),
    focusQuestion: z.string().optional(),
    skillIds: z.array(z.string().uuid()).default([]),
    estimatedMinutes: z.number().int().min(0).optional(),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({ description: "Lesson grouping a set of skills" }); */

// Commented out - using organization.ts version
/* export const CourseSchema = z
  .object({
    id: z.string().uuid(),
    subjectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    summary: z.string().optional(),
    gradeBand: GradeBandSchema.optional(),
    sequence: z.number().int().min(0).default(0),
    lessonIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({ description: "Course within a subject" }); */

// Commented out - using organization.ts version
/* export const SubjectSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    domain: DomainSchema,
    description: z.string().optional(),
    courseIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({ description: "Subject (e.g., Reading, Math)" }); */

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

export const ItemSchema = z
  .object({
    id: z.string().uuid(),
    knowledgePointId: z.string().uuid(),
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
    description: "Learning item",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174001",
      knowledgePointId: "123e4567-e89b-12d3-a456-426614174002",
      type: "choice_text",
      prompt: { text: 'Which word is "cat"?' },
      rubric: { type: "exact" },
      difficulty: 2,
      timeEstimateMs: 5000,
    },
  });

export const KnowledgePointSchema = z
  .object({
    id: z.string().uuid(),
    skillId: z.string().uuid(),
    objective: z.string().min(1).max(200),
    workedExample: z.array(z.string()),
    practiceItems: z.array(z.string()).openapi({
      description: "Item IDs for practice",
    }),
    reteachSnippet: z.string(),
    expectedTimeSeconds: z.number().int().positive(),
    hints: z.array(z.string()).default([]),
  })
  .openapi({
    description: "Knowledge point within a topic",
    example: {
      id: "123e4567-e89b-12d3-a456-426614174002",
      skillId: "123e4567-e89b-12d3-a456-426614174000",
      objective: "Blend and read -at words",
      workedExample: ["Sound out c-a-t", "Blend to say cat"],
      reteachSnippet: "Stretch sounds with blocks: c—a—t → cat",
      expectedTimeSeconds: 120,
      practiceItems: [],
    },
  });

export const KnowledgePointExperienceSchema = z
  .object({
    id: z.string().uuid(),
    knowledgePointId: z.string().uuid(),
    title: z.string().min(1).max(200),
    deliveryKind: ExperienceDeliveryKindSchema,
    purposes: z.array(ExperiencePurposeSchema).default(["entry"]),
    modalities: z.array(ModalitySchema).default([]),
    sensoryTags: z.array(SensoryTagSchema).default([]),
    estimatedMinutes: z.number().int().min(1).max(20).optional(),
    stepIds: z.array(z.string().uuid()).default([]),
    practiceActivityIds: z.array(z.string().uuid()).default([]),
    assetIds: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).default({}),
  })
  .openapi({
    description: "Configured delivery experience for a knowledge point",
    example: {
      id: "987e6543-e21b-45d3-a456-426614174111",
      knowledgePointId: "123e4567-e89b-12d3-a456-426614174002",
      title: "Tile build with audio blend",
      deliveryKind: "manipulative_play",
      modalities: ["drag", "voice"],
      sensoryTags: ["tactile", "auditory"],
      practiceActivityIds: ["32000000-0000-4000-8000-000000000301"],
    },
  });

export const TopicSchema = SkillSchema;
export const PrerequisiteSchema = SkillPrerequisiteSchema;
export const EncompassingEdgeSchema = EncompassingRelationSchema;

// Commented out - using organization.ts versions
// export type Subject = z.infer<typeof SubjectSchema>;
// export type Course = z.infer<typeof CourseSchema>;
// export type Lesson = z.infer<typeof LessonSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Topic = Skill;
export type MathStageCode = z.infer<typeof MathStageCodeSchema>;
export type ReadingStageCode = z.infer<typeof ReadingStageCodeSchema>;
export type StageCode = z.infer<typeof StageCodeSchema>;
export type KnowledgePoint = z.infer<typeof KnowledgePointSchema>;
export type KnowledgePointExperience = z.infer<typeof KnowledgePointExperienceSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Prerequisite = z.infer<typeof SkillPrerequisiteSchema>;
export type EncompassingRelation = z.infer<typeof EncompassingRelationSchema>;
export type EncompassingEdge = EncompassingRelation;
