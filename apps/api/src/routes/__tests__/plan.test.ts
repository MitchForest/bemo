import { expect, test } from "bun:test";

import { PlanResponseSchema } from "@repo/schemas";

process.env.DATABASE_URL = "";

const { app } = await import("../../app");

test("GET /api/plan respects stringy query params", async () => {
  const response = await app.request("/api/plan?includeSpeedDrills=false&max=4");

  expect(response.status).toBe(200);

  const payload = await response.json();
  const plan = PlanResponseSchema.parse(payload);

  expect(plan.tasks.length).toBeLessThanOrEqual(4);
  const hasSpeedDrill = plan.tasks.some((task) => task.type === "speed_drill");
  expect(hasSpeedDrill).toBe(false);
});
