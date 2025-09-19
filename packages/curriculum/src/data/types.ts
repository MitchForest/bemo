import type { Skill } from "@repo/schemas";

import type { CourseKey, LessonKey, SubjectKey } from "./keys";

export type GradeBand = Skill["gradeBand"];
export type StageCode = Skill["stageCode"];

export interface SubjectBlueprint {
  title: string;
  domain: "reading" | "math";
  description?: string;
}

export interface CourseBlueprint {
  subjectKey: SubjectKey;
  title: string;
  summary: string;
  gradeBand: GradeBand;
  sequence: number;
}

export interface LessonBlueprint {
  courseKey: CourseKey;
  title: string;
  summary: string;
  sequence: number;
  focusQuestion?: string;
  estimatedMinutes?: number;
}

export interface SkillBlueprint {
  key: string;
  courseKey: CourseKey;
  lessonKey: LessonKey;
  title: string;
  strand: string;
  gradeBand: GradeBand;
  stageCode: StageCode;
  description: string;
  prerequisites?: readonly string[];
  interferenceGroup?: string;
  expectedTimeSeconds: number;
  checkChartTags?: readonly string[];
}
