import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import { getWeeklyReport } from "@repo/engine";
import { WeeklyReportSchema } from "@repo/schemas";

const app = new OpenAPIHono();

const weeklyRoute = createRoute({
  method: "get",
  path: "/api/report/weekly",
  tags: ["Reports"],
  summary: "Get weekly report",
  request: {
    query: z.object({
      studentId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: "Weekly progress report",
      content: {
        "application/json": {
          schema: WeeklyReportSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(weeklyRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { studentId } = c.req.valid("query");
  const report = await getWeeklyReport(studentId ?? session.user.id);
  return c.json(report, 200);
});

export default app;
