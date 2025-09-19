import type { SubjectKey } from "./keys";
import type { SubjectBlueprint } from "./types";

export const SUBJECT_BLUEPRINTS = {
  READING_FOUNDATIONAL: {
    title: "Foundational Literacy",
    domain: "reading",
    description: "Early literacy progression from print concepts to Grade 2 comprehension",
  },
  MATH_FOUNDATIONAL: {
    title: "Foundational Math",
    domain: "math",
    description: "Numeracy progression from pre-number sense through Grade 2 problem solving",
  },
} as const satisfies Record<SubjectKey, SubjectBlueprint>;
