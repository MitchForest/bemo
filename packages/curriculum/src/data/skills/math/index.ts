import type { SkillBlueprint } from "../../types";

import { mathGrade1Skills } from "./grade1";
import { mathGrade2Skills } from "./grade2";
import { mathKindergartenSkills } from "./kindergarten";
import { mathPrekSkills } from "./prek";

export const mathSkillsByGrade = {
  PreK: mathPrekSkills,
  K: mathKindergartenSkills,
  "1": mathGrade1Skills,
  "2": mathGrade2Skills,
} as const;

export const mathSkills = [
  ...mathPrekSkills,
  ...mathKindergartenSkills,
  ...mathGrade1Skills,
  ...mathGrade2Skills,
] satisfies readonly SkillBlueprint[];
