import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import {
  DiagnosticNextRequestSchema,
  DiagnosticNextResponseSchema,
  DiagnosticAnswerRequestSchema,
  DiagnosticAnswerResponseSchema,
} from "@repo/schemas";
import { getNextDiagnosticProbe, submitDiagnosticAnswer } from "@repo/engine";

const app = new OpenAPIHono();

const nextRoute = createRoute({
  method: "get",
  path: "/api/diagnostic/next",
  tags: ["Diagnostic"],
  summary: "Get next diagnostic probe",
  request: {
    query: DiagnosticNextRequestSchema,
  },
  responses: {
    200: {
      description: "Next diagnostic probe",
      content: {
        "application/json": {
          schema: DiagnosticNextResponseSchema,
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

app.openapi(nextRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  const response = await getNextDiagnosticProbe({
    studentId: query.studentId ?? session.user.id,
    skillId: query.skillId,
  });

  return c.json(response, 200);
});

const answerRoute = createRoute({
  method: "post",
  path: "/api/diagnostic/answer",
  tags: ["Diagnostic"],
  summary: "Submit diagnostic answer",
  request: {
    body: {
      content: {
        "application/json": {
          schema: DiagnosticAnswerRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated diagnostic session",
      content: {
        "application/json": {
          schema: DiagnosticAnswerResponseSchema,
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
    400: {
      description: "Invalid payload",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(answerRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = c.req.valid("json");
  try {
    const response = await submitDiagnosticAnswer(body);
    return c.json(response, 200);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to submit answer" },
      400,
    );
  }
});

export default app;
