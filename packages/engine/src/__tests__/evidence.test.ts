import { randomUUID } from "node:crypto";
import { test, expect } from "bun:test";
import { submitEvidence, getPlan } from "../index";
import { SKILL_IDS, KNOWLEDGE_POINT_IDS } from "@repo/curriculum";

const TEST_STUDENT_ID = "22222222-2222-4222-8222-222222222222";

test("submitEvidence updates topic state and awards XP", async () => {
  const evidence = {
    taskId: randomUUID(),
    events: [
      {
        studentId: TEST_STUDENT_ID,
        skillId: SKILL_IDS.MATH_K_ADD_WITHIN_5,
        knowledgePointId: KNOWLEDGE_POINT_IDS.MATH_K_ADD_WITHIN_5_DRILL,
        itemId: randomUUID(),
        taskId: randomUUID(),
        timestamp: new Date().toISOString(),
        result: "correct" as const,
        latencyMs: 3200,
        hintsUsed: 0,
      },
    ],
  };

  const result = await submitEvidence(TEST_STUDENT_ID, evidence);
  expect(result.xpEarned).toBeGreaterThan(0);
  expect(result.updatedStates.length).toBeGreaterThan(0);
  expect(
    result.updatedStates.some((state) => state.skillId === SKILL_IDS.MATH_K_ADD_WITHIN_5),
  ).toBe(true);

  const plan = await getPlan({
    studentId: TEST_STUDENT_ID,
    includeDiagnostic: false,
    includeSpeedDrills: true,
    max: 5,
  });

  expect(plan.stats.dueSkills).toBeGreaterThanOrEqual(0);
});
