import { test, expect } from "bun:test";
import { getStudentProfileSummary } from "../index";

const STUDENT_ID = "55555555-5555-4555-8555-555555555555";

test("profile summary includes mastery and plan", async () => {
  const summary = await getStudentProfileSummary(STUDENT_ID);
  expect(summary.profile.id).toBe(STUDENT_ID);
  expect(summary.mastery.length).toBeGreaterThan(0);
  expect(summary.latestPlan?.tasks.length).toBeGreaterThan(0);
  expect(summary.motivation).toBeDefined();
});
