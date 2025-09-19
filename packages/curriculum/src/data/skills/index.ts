import type { SkillBlueprint } from "../types";

import { mathSkills, mathSkillsByGrade } from "./math";
import { readingSkills, readingSkillsByGrade } from "./reading";

export { mathSkills, mathSkillsByGrade };
export { readingSkills, readingSkillsByGrade };

export const allSkillBlueprints = [
  ...readingSkills,
  ...mathSkills,
] satisfies readonly SkillBlueprint[];
