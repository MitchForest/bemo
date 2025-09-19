import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import { getStudentProfileSummary } from "@repo/engine";
import { StudentProfileSummarySchema } from "@repo/schemas";

const app = new OpenAPIHono();

const profileRoute = createRoute({
  method: "get",
  path: "/api/profile",
  tags: ["Profile"],
  summary: "Get student profile summary",
  request: {
    query: z.object({
      studentId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: "Student profile",
      content: {
        "application/json": {
          schema: StudentProfileSummarySchema,
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

app.openapi(profileRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { studentId } = c.req.valid("query");
  const summary = await getStudentProfileSummary(studentId ?? session.user.id);
  return c.json(summary, 200);
});

export default app;
