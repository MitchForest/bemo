import { test, expect } from "bun:test";
import { getPlan } from "../index";

const TEST_STUDENT_ID = "11111111-1111-4111-8111-111111111111";

test("getPlan creates a blended task list", async () => {
  const result = await getPlan({
    studentId: TEST_STUDENT_ID,
    max: 5,
    includeSpeedDrills: true,
    includeDiagnostic: false,
  });

  expect(result.tasks.length).toBeGreaterThan(0);
  expect(result.tasks.length).toBeLessThanOrEqual(5);
  expect(result.stats.dueSkills).toBeGreaterThanOrEqual(0);
  expect(result.stats.overdueSkills).toBeGreaterThanOrEqual(0);
  expect(result.stats.strugglingSkills).toBeGreaterThanOrEqual(0);

  const hasReview = result.tasks.some((task) => task.type === "review");
  const hasLesson = result.tasks.some((task) => task.type === "lesson");

  expect(hasReview || hasLesson).toBe(true);

  const firstTask = result.tasks[0];
  expect(firstTask.skillIds.length).toBeGreaterThan(0);
  expect(firstTask.priority).toBeGreaterThanOrEqual(1);
  expect(firstTask.priority).toBeLessThanOrEqual(5);

  if (result.stats.compressionRatio !== undefined) {
    expect(result.stats.compressionRatio).toBeGreaterThan(0);
    expect(result.stats.compressionRatio).toBeLessThanOrEqual(1);
  }

  expect(result.motivation?.xpTarget).toBeGreaterThan(0);
  expect(result.motivation?.projectedXp).toBeGreaterThan(0);
});
