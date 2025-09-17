import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import { getPlan } from "@repo/engine";
import { PlanRequestSchema, PlanResponseSchema } from "@repo/schemas";

const app = new OpenAPIHono();

const planRoute = createRoute({
  method: "get",
  path: "/api/plan",
  tags: ["Learning"],
  summary: "Get personalized learning plan",
  description: "Returns a list of recommended tasks based on spaced repetition and student state",
  request: {
    query: PlanRequestSchema,
  },
  responses: {
    200: {
      description: "Successful response with learning tasks",
      content: {
        "application/json": {
          schema: PlanResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

app.openapi(planRoute, async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  const tasks = await getPlan({
    ...query,
    studentId: query.studentId || session.user.id,
  });

  return c.json(
    {
      tasks,
      metadata: {
        dueTopicsCount: 0,
        overdueTopicsCount: 0,
      },
    },
    200,
  );
});

export default app;
