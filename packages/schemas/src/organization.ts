import { z } from "@hono/zod-openapi";
import { DomainSchema, GradeBandSchema } from "./common";

export const OrganizationTypeSchema = z
  .enum(["district", "school", "microschool", "cohort", "homeschool"])
  .openapi({
    description: "Type of organization container",
    example: "microschool",
  });

export const OrganizationSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    slug: z.string().min(1).max(100),
    type: OrganizationTypeSchema,
    settings: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({
    description: "Organization such as a district, school, or microschool",
  });

export const SubjectSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    slug: z.string().min(1).max(100),
    title: z.string().min(1).max(150),
    domain: DomainSchema,
    color: z.string().optional(),
    icon: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Subject grouping topics and courses" });

export const CourseSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    subjectId: z.string().uuid(),
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(120),
    gradeBand: GradeBandSchema.optional(),
    summary: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    estimatedMinutes: z.number().int().min(0).optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Course container for units and lessons" });

export const CourseUnitSchema = z
  .object({
    id: z.string().uuid(),
    courseId: z.string().uuid(),
    title: z.string().min(1).max(200),
    summary: z.string().optional(),
    sequence: z.number().int().min(0).default(0),
    icon: z.string().optional(),
    color: z.string().optional(),
    expectedMinutes: z.number().int().min(0).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Unit within a course" });

export const LessonSectionTypeSchema = z
  .enum([
    "direct_instruction",
    "guided_practice",
    "independent_practice",
    "collaborative",
    "reteach",
    "assessment",
    "reflection",
  ])
  .openapi({
    description: "Structured block within a lesson",
    example: "guided_practice",
  });

export const LessonSchema = z
  .object({
    id: z.string().uuid(),
    unitId: z.string().uuid(),
    topicId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    slug: z.string().min(1).max(120),
    focusStatement: z.string().optional(),
    essentialQuestion: z.string().optional(),
    objective: z.string().optional(),
    expectedTimeMinutes: z.number().int().min(1),
    moodColor: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Lesson aligned to a topic" });

export const LessonSectionSchema = z
  .object({
    id: z.string().uuid(),
    lessonId: z.string().uuid(),
    title: z.string().min(1).max(200),
    type: LessonSectionTypeSchema,
    sequence: z.number().int().min(0).default(0),
    knowledgePointIds: z.array(z.string().uuid()).default([]),
    instructions: z.array(z.string()).default([]),
    mediaAssets: z.array(z.string()).default([]),
    expectedMinutes: z.number().int().min(0).optional(),
    stepIds: z.array(z.string().uuid()).default([]),
    practiceActivityIds: z.array(z.string().uuid()).default([]),
  })
  .openapi({ description: "Section of a lesson" });

export const EnrollmentStatusSchema = z
  .enum(["active", "paused", "completed", "withdrawn"])
  .openapi({ description: "Lifecycle status of a course enrollment" });

export const EnrollmentSchema = z
  .object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    courseId: z.string().uuid(),
    cohortId: z.string().uuid().optional(),
    status: EnrollmentStatusSchema.default("active"),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Student enrollment into a course" });

export const CohortSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    courseId: z.string().uuid().optional(),
    name: z.string().min(1).max(150),
    gradeBand: GradeBandSchema.optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    settings: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Instructional cohort / classroom" });

export const StaffAssignmentSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    cohortId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    role: z.enum(["teacher", "coach", "admin"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Assignment of a staff member to a cohort or course" });

export const AssessmentTypeSchema = z
  .enum(["adaptive_entry", "checkpoint", "benchmark", "exit_ticket"])
  .openapi({ description: "Purpose of the assessment" });

export const AssessmentModeSchema = z
  .enum(["adaptive", "fixed"])
  .openapi({ description: "Delivery mode of the assessment" });

export const AssessmentSchema = z
  .object({
    id: z.string().uuid(),
    courseId: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    type: AssessmentTypeSchema,
    mode: AssessmentModeSchema,
    description: z.string().optional(),
    entryTopicIds: z.array(z.string().uuid()).default([]),
    config: z.record(z.any()).default({}),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi({ description: "Assessment definition" });

export const AdaptiveAssessmentNodeSchema = z
  .object({
    id: z.string().uuid(),
    assessmentId: z.string().uuid(),
    topicId: z.string().uuid(),
    knowledgePointId: z.string().uuid().optional(),
    difficulty: z.number().int().min(1).max(5).default(3),
    nextOnCorrect: z.array(z.string().uuid()).default([]),
    nextOnIncorrect: z.array(z.string().uuid()).default([]),
    metadata: z.record(z.any()).optional(),
  })
  .openapi({ description: "Node in an adaptive assessment graph" });

export const AssessmentAttemptStatusSchema = z
  .enum(["in_progress", "completed", "abandoned"])
  .openapi({ description: "Status of an assessment attempt" });

export const AssessmentAttemptSchema = z
  .object({
    id: z.string().uuid(),
    assessmentId: z.string().uuid(),
    studentId: z.string().uuid(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    status: AssessmentAttemptStatusSchema,
    score: z.number().min(0).max(1).optional(),
    masteryTopicId: z.string().uuid().optional(),
    summary: z.record(z.any()).optional(),
  })
  .openapi({ description: "Student assessment attempt" });

export const AssessmentResponseSchema = z
  .object({
    id: z.string().uuid(),
    attemptId: z.string().uuid(),
    itemId: z.string().uuid().optional(),
    topicId: z.string().uuid(),
    knowledgePointId: z.string().uuid().optional(),
    result: z.enum(["correct", "incorrect", "partial", "skipped"]),
    latencyMs: z.number().int().min(0),
    payload: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
  })
  .openapi({ description: "Response captured during an assessment" });

export type OrganizationType = z.infer<typeof OrganizationTypeSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type CourseUnit = z.infer<typeof CourseUnitSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonSection = z.infer<typeof LessonSectionSchema>;
export type Enrollment = z.infer<typeof EnrollmentSchema>;
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;
export type Cohort = z.infer<typeof CohortSchema>;
export type StaffAssignment = z.infer<typeof StaffAssignmentSchema>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;
export type AssessmentMode = z.infer<typeof AssessmentModeSchema>;
export type AdaptiveAssessmentNode = z.infer<typeof AdaptiveAssessmentNodeSchema>;
export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>;
export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;
