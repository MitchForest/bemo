import type { SkillBlueprint } from "../../types";

import { readingGrade1Skills } from "./grade1";
import { readingGrade2Skills } from "./grade2";
import { readingKindergartenSkills } from "./kindergarten";
import { readingPrekSkills } from "./prek";

export const readingSkillsByGrade = {
  PreK: readingPrekSkills,
  K: readingKindergartenSkills,
  "1": readingGrade1Skills,
  "2": readingGrade2Skills,
} as const;

export const readingSkills = [
  ...readingPrekSkills,
  ...readingKindergartenSkills,
  ...readingGrade1Skills,
  ...readingGrade2Skills,
] satisfies readonly SkillBlueprint[];
