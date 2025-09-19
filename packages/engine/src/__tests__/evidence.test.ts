process.env.DATABASE_URL = "";

import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { SKILL_IDS } from "@repo/curriculum";
import { getPlan, submitEvidence } from "../index";

const TEST_STUDENT_ID = "22222222-2222-4222-8222-222222222222";

test("submitEvidence updates skill state and awards XP", async () => {
  const evidence = {
    taskId: randomUUID(),
    events: [
      {
        studentId: TEST_STUDENT_ID,
        skillId: SKILL_IDS.MATH_ADD_WITH_OBJECTS_WITHIN_5,
        itemId: randomUUID(),
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
    result.updatedStates.some(
      (state) => state.skillId === SKILL_IDS.MATH_ADD_WITH_OBJECTS_WITHIN_5,
    ),
  ).toBe(true);

  const plan = await getPlan({
    studentId: TEST_STUDENT_ID,
    includeDiagnostic: false,
    includeSpeedDrills: true,
    max: 5,
  });

  expect(plan.stats.dueSkills).toBeGreaterThanOrEqual(0);
});
