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

export const AssetTypeSchema = z
  .enum([
    "audio",
    "image",
    "video",
    "animation",
    "document",
    "manipulative",
    "tts_script",
    "interactive",
    "other",
  ])
  .openapi({
    description: "Type of media or reusable asset",
    example: "audio",
  });

export const LessonStepKindSchema = z
  .enum([
    "coach_prompt",
    "student_action",
    "modeling",
    "manipulative_setup",
    "guided_practice",
    "independent_practice",
    "reflection",
    "celebration",
    "transition",
  ])
  .openapi({
    description: "Granular action within a lesson section",
    example: "coach_prompt",
  });

export const ExperienceDeliveryKindSchema = z
  .enum([
    "explicit_instruction",
    "guided_exploration",
    "manipulative_play",
    "movement",
    "storytelling",
    "fluency_loop",
    "retrieval",
    "creative_application",
  ])
  .openapi({
    description: "Design pattern for delivering a knowledge point experience",
    example: "guided_exploration",
  });

export const ExperiencePurposeSchema = z
  .enum(["entry", "reteach", "fluency", "challenge"])
  .openapi({
    description: "Intended moment in the learning loop for an experience",
    example: "reteach",
  });

export const SensoryTagSchema = z
  .enum(["visual", "auditory", "kinesthetic", "tactile", "verbal", "creative"])
  .openapi({
    description: "Primary sensory emphasis for an activity or experience",
    example: "kinesthetic",
  });

export const PracticeActivityTypeSchema = z
  .enum([
    "manipulative",
    "game",
    "speed_drill",
    "story_read",
    "movement",
    "breathing",
    "interactive_quiz",
    "custom",
  ])
  .openapi({
    description: "Reusable activity archetype",
    example: "speed_drill",
  });

export const MicroGameGenreSchema = z
  .enum(["arcade", "puzzle", "simulation", "story", "creative", "movement"])
  .openapi({
    description: "Experience genre for a micro-game",
    example: "arcade",
  });

export const RewardTypeSchema = z
  .enum(["badge", "sticker", "joy_break", "time_back", "unlockable"])
  .openapi({
    description: "Motivation reward category",
    example: "badge",
  });

export type Domain = z.infer<typeof DomainSchema>;
export type GradeBand = z.infer<typeof GradeBandSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type Modality = z.infer<typeof ModalitySchema>;
export type PrereqGate = z.infer<typeof PrereqGateSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type LessonStepKind = z.infer<typeof LessonStepKindSchema>;
export type PracticeActivityType = z.infer<typeof PracticeActivityTypeSchema>;
export type MicroGameGenre = z.infer<typeof MicroGameGenreSchema>;
export type RewardType = z.infer<typeof RewardTypeSchema>;
export type ExperienceDeliveryKind = z.infer<typeof ExperienceDeliveryKindSchema>;
export type ExperiencePurpose = z.infer<typeof ExperiencePurposeSchema>;
export type SensoryTag = z.infer<typeof SensoryTagSchema>;
