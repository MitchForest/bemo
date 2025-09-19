import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { auth } from "@repo/auth";
import {
  claimQuestReward,
  claimReward,
  claimTimeBackEntry,
  getMotivationDigest,
  getMotivationLeagues,
  getMotivationQuests,
  getMotivationSummary,
  getTimeBackLedgerEntries,
  joinMotivationSquad,
  updateQuestTaskProgress,
} from "@repo/engine";
import {
  ClaimRewardRequestSchema,
  ClaimRewardResponseSchema,
  MotivationDigestSchema,
  MotivationLeagueSchema,
  MotivationQuestSchema,
  MotivationSquadSchema,
  MotivationSummarySchema,
  TimeBackLedgerEntrySchema,
} from "@repo/schemas";

const app = new OpenAPIHono();

const studentIdQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
});

const summaryRoute = createRoute({
  method: "get",
  path: "/api/motivation",
  tags: ["Motivation"],
  summary: "Get motivation summary",
  request: {
    query: z.object({
      studentId: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      description: "Motivation summary",
      content: {
        "application/json": {
          schema: MotivationSummarySchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(summaryRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { studentId } = c.req.valid("query");
  if (studentId && studentId !== session.user.id) {
    return c.json({ error: "Cannot view another student" }, 403);
  }
  const summary = await getMotivationSummary(studentId ?? session.user.id);
  return c.json(summary, 200);
});

const leaguesRoute = createRoute({
  method: "get",
  path: "/api/motivation/leagues",
  tags: ["Motivation"],
  summary: "List motivation leagues",
  request: {
    query: studentIdQuerySchema,
  },
  responses: {
    200: {
      description: "Active leagues",
      content: {
        "application/json": {
          schema: z.array(MotivationLeagueSchema),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(leaguesRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  if (query.studentId && query.studentId !== session.user.id) {
    return c.json({ error: "Cannot view another student" }, 403);
  }

  const leagues = await getMotivationLeagues(query.studentId ?? session.user.id);
  return c.json(leagues, 200);
});

const joinBodySchema = z
  .object({
    studentId: z.string().uuid().optional(),
    leagueId: z.string().uuid(),
    squadId: z.string().uuid().optional(),
  })
  .openapi({ description: "Join a motivation league/squad" });

const joinResponseSchema = z
  .object({
    league: MotivationLeagueSchema.optional(),
    squad: MotivationSquadSchema.optional(),
  })
  .openapi({ description: "Updated league membership" });

const joinRoute = createRoute({
  method: "post",
  path: "/api/motivation/leagues/join",
  tags: ["Motivation"],
  summary: "Join or switch squads",
  request: {
    body: {
      content: {
        "application/json": {
          schema: joinBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated membership",
      content: {
        "application/json": {
          schema: joinResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(joinRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = c.req.valid("json");
  const studentId = body.studentId ?? session.user.id;
  if (studentId !== session.user.id) {
    return c.json({ error: "Cannot modify another student" }, 403);
  }

  const membership = await joinMotivationSquad(studentId, body.leagueId, body.squadId);
  return c.json(membership, 200);
});

const questsRoute = createRoute({
  method: "get",
  path: "/api/motivation/quests",
  tags: ["Motivation"],
  summary: "List active quests",
  request: {
    query: studentIdQuerySchema,
  },
  responses: {
    200: {
      description: "Quest list",
      content: {
        "application/json": {
          schema: z.array(MotivationQuestSchema),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(questsRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  if (query.studentId && query.studentId !== session.user.id) {
    return c.json({ error: "Cannot view another student" }, 403);
  }

  const quests = await getMotivationQuests(query.studentId ?? session.user.id);
  return c.json(quests, 200);
});

const questTaskRoute = createRoute({
  method: "post",
  path: "/api/motivation/quests/:questId/tasks/:taskId",
  tags: ["Motivation"],
  summary: "Update quest task progress",
  request: {
    params: z.object({
      questId: z.string().uuid(),
      taskId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z
            .object({
              studentId: z.string().uuid().optional(),
              progress: z.number().min(0).max(1).default(0),
              completed: z.boolean().default(false),
            })
            .openapi({ description: "Quest task update payload" }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated quest list",
      content: {
        "application/json": {
          schema: z.array(MotivationQuestSchema),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(questTaskRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const params = c.req.valid("param");
  const body = c.req.valid("json");
  const studentId = body.studentId ?? session.user.id;
  if (studentId !== session.user.id) {
    return c.json({ error: "Cannot modify another student" }, 403);
  }

  const quests = await updateQuestTaskProgress(
    studentId,
    params.questId,
    params.taskId,
    body.progress,
    body.completed,
  );
  return c.json(quests, 200);
});

const questClaimRoute = createRoute({
  method: "post",
  path: "/api/motivation/quests/:questId/claim",
  tags: ["Motivation"],
  summary: "Claim quest reward",
  request: {
    params: z.object({ questId: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z
            .object({ studentId: z.string().uuid().optional() })
            .openapi({ description: "Quest claim payload" }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated quest",
      content: {
        "application/json": {
          schema: MotivationQuestSchema.optional(),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(questClaimRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const params = c.req.valid("param");
  const body = c.req.valid("json");
  const studentId = body.studentId ?? session.user.id;
  if (studentId !== session.user.id) {
    return c.json({ error: "Cannot modify another student" }, 403);
  }

  const quest = await claimQuestReward(studentId, params.questId);
  return c.json(quest, 200);
});

const timeBackRoute = createRoute({
  method: "get",
  path: "/api/motivation/time-back",
  tags: ["Motivation"],
  summary: "List time-back ledger entries",
  request: {
    query: studentIdQuerySchema,
  },
  responses: {
    200: {
      description: "Ledger entries",
      content: {
        "application/json": {
          schema: z.array(TimeBackLedgerEntrySchema),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(timeBackRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  if (query.studentId && query.studentId !== session.user.id) {
    return c.json({ error: "Cannot view another student" }, 403);
  }

  const ledger = await getTimeBackLedgerEntries(query.studentId ?? session.user.id);
  return c.json(ledger, 200);
});

const timeBackClaimRoute = createRoute({
  method: "post",
  path: "/api/motivation/time-back/:entryId/claim",
  tags: ["Motivation"],
  summary: "Mark time-back entry as used",
  request: {
    params: z.object({ entryId: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z
            .object({ studentId: z.string().uuid().optional() })
            .openapi({ description: "Time-back claim payload" }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated ledger",
      content: {
        "application/json": {
          schema: z.array(TimeBackLedgerEntrySchema),
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(timeBackClaimRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const params = c.req.valid("param");
  const body = c.req.valid("json");
  const studentId = body.studentId ?? session.user.id;
  if (studentId !== session.user.id) {
    return c.json({ error: "Cannot modify another student" }, 403);
  }

  const ledger = await claimTimeBackEntry(studentId, params.entryId);
  return c.json(ledger, 200);
});

const digestRoute = createRoute({
  method: "get",
  path: "/api/motivation/digest",
  tags: ["Motivation"],
  summary: "Coach or parent motivation digest",
  request: {
    query: z.object({
      studentId: z.string().uuid().optional(),
      recipient: z.enum(["coach", "parent"]).default("coach"),
    }),
  },
  responses: {
    200: {
      description: "Motivation digest",
      content: {
        "application/json": {
          schema: MotivationDigestSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(digestRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const query = c.req.valid("query");
  if (query.studentId && query.studentId !== session.user.id) {
    return c.json({ error: "Cannot view another student" }, 403);
  }
  const digest = await getMotivationDigest(query.studentId ?? session.user.id, query.recipient);
  return c.json(digest, 200);
});

const claimRoute = createRoute({
  method: "post",
  path: "/api/motivation/claim",
  tags: ["Motivation"],
  summary: "Claim motivation reward",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ClaimRewardRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reward claim response",
      content: {
        "application/json": {
          schema: ClaimRewardResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    400: {
      description: "Reward cannot be claimed",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

app.openapi(claimRoute, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = c.req.valid("json");
  if (body.studentId !== session.user.id) {
    return c.json({ error: "Cannot claim reward for another student" }, 403);
  }

  const response = await claimReward(body);
  if (!response.success) {
    return c.json({ error: "Reward threshold not met yet" }, 400);
  }

  return c.json(response, 200);
});

export default app;
