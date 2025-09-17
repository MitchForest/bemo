import { z } from "@hono/zod-openapi";
import { DomainSchema, GradeBandSchema, ItemTypeSchema, PrereqGateSchema } from "./common";

export const PrerequisiteSchema = z
  .object({
    topicId: z.string().uuid(),
    gate: PrereqGateSchema,
  })
  .openapi({ description: "Topic prerequisite" });

export const EncompassingEdgeSchema = z
  .object({
    parentTopicId: z.string().uuid(),
    weight: z.number().min(0).max(1).openapi({
      description: "Weight of implicit credit",
      example: 0.5,
    }),
  })
  .openapi({ description: "Encompassing relationship" });

export const TopicSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(200),
    domain: DomainSchema,
    strand: z.string().openapi({
      description: "Curriculum strand",
      example: "Counting & Cardinality",
    }),
    gradeBand: GradeBandSchema,
    description: z.string().optional(),
    prerequisites: z.array(PrerequisiteSchema).default([]),
    encompassedBy: z.array(EncompassingEdgeSchema).default([]),
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
    description: "Learning topic",
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
          topicId: z.string().uuid(),
          weight: z.number().min(0).max(1),
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
    topicId: z.string().uuid(),
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
      topicId: "123e4567-e89b-12d3-a456-426614174000",
      objective: "Blend and read -at words",
      workedExample: ["Sound out c-a-t", "Blend to say cat"],
      reteachSnippet: "Stretch sounds with blocks: c—a—t → cat",
      expectedTimeSeconds: 120,
      practiceItems: [],
    },
  });

export type Topic = z.infer<typeof TopicSchema>;
export type KnowledgePoint = z.infer<typeof KnowledgePointSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Prerequisite = z.infer<typeof PrerequisiteSchema>;
export type EncompassingEdge = z.infer<typeof EncompassingEdgeSchema>;
