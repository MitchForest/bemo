import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import { submitEvidence } from "@repo/engine";
import { EvidenceResponseSchema, SubmitEvidenceSchema } from "@repo/schemas";

const app = new OpenAPIHono();

const evidenceRoute = createRoute({
  method: "post",
  path: "/api/evidence",
  tags: ["Learning"],
  summary: "Submit learning evidence",
  description: "Submit evidence of student interactions for memory model updates",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SubmitEvidenceSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Evidence processed successfully",
      content: {
        "application/json": {
          schema: EvidenceResponseSchema,
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
    400: {
      description: "Bad request",
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

app.openapi(evidenceRoute, async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = c.req.valid("json");

  try {
    await submitEvidence(session.user.id, body);

    return c.json(
      {
        success: true,
        xpEarned: 10, // Placeholder
      },
      200,
    );
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to process evidence",
      },
      400,
    );
  }
});

export default app;
