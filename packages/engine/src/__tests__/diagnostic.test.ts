import { test, expect } from "bun:test";
import { getNextDiagnosticProbe, submitDiagnosticAnswer } from "../index";

const STUDENT_ID = "33333333-3333-4333-8333-333333333333";

test("diagnostic session provides probes and updates mastery", async () => {
  const next = await getNextDiagnosticProbe({ studentId: STUDENT_ID });
  expect(next.session.status).toBe("in_progress");
  expect(next.probe).toBeDefined();

  if (!next.probe) {
    throw new Error("Expected a diagnostic probe");
  }

  const answer = await submitDiagnosticAnswer({
    studentId: STUDENT_ID,
    probeId: next.probe.id,
    result: "correct",
    latencyMs: 2500,
  });

  expect(answer.session.provisionalMastery.length).toBeGreaterThan(0);
  expect(answer.completed).toBe(false);
});
