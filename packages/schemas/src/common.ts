import { z } from "@hono/zod-openapi";

export const DomainSchema = z.enum(["math", "reading"]).openapi({
  description: "Learning domain",
  example: "math",
});

export const GradeBandSchema = z.enum(["PreK", "K", "1"]).openapi({
  description: "Grade band",
  example: "K",
});

export const ItemTypeSchema = z
  .enum([
    "choice_image",
    "choice_text",
    "choice_audio",
    "drag_drop",
    "tap_to_count",
    "speak",
    "record_audio",
    "trace_path",
    "short_answer",
    "timer_speed_drill",
    "phrase_reading",
    "comprehension_choice",
  ])
  .openapi({
    description: "Type of learning item",
    example: "choice_text",
  });

export const ResultSchema = z.enum(["correct", "incorrect", "partial", "skipped"]).openapi({
  description: "Result of student attempt",
  example: "correct",
});

export const TaskTypeSchema = z
  .enum(["lesson", "review", "quiz", "speed_drill", "diagnostic", "multistep"])
  .openapi({
    description: "Type of learning task",
    example: "lesson",
  });

export const ModalitySchema = z.enum(["voice", "tap", "trace", "type", "drag"]).openapi({
  description: "Input modality",
  example: "tap",
});

export const PrereqGateSchema = z.enum(["AND", "OR"]).openapi({
  description: "Prerequisite gate type",
  example: "AND",
});

export type Domain = z.infer<typeof DomainSchema>;
export type GradeBand = z.infer<typeof GradeBandSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Modality = z.infer<typeof ModalitySchema>;
export type PrereqGate = z.infer<typeof PrereqGateSchema>;
