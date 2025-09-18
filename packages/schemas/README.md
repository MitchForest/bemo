# @repo/schemas

Single source of truth for Zod schemas and TypeScript types across the Bemo platform. Every API handler, engine module, and React component consumes these contracts, guaranteeing parity from persistence to UI.

## What's inside?

| File | Description |
| ---- | ----------- |
| `common.ts` | Shared enums (domains, grade bands, modalities, item types, etc.). |
| `student.ts` | Student profiles, topic states, and aggregate stats. |
| `curriculum.ts` | Topics, knowledge points, items, assets, and authoring helpers. |
| `content.ts` | Content catalog entities (practice activities, check charts, motivation assets). |
| `task.ts` | Learning tasks, planner requests/responses, and plan stats. |
| `evidence.ts` | Evidence events and submission envelopes. |
| `diagnostic.ts` | Diagnostic probes, sessions, and answer payloads. |
| `motivation.ts` | Motivation summary, reward progress, and reward claiming. |
| `profile.ts` | Dashboard-ready learner summaries and check-chart progress. |
| `report.ts` | Weekly report envelopes for adult digests. |
| `auth.ts` | Auth/session schemas shared with Better Auth. |

Each schema exports its TypeScript counterpart via `z.infer`, so you never write manual interfaces.

## Example usage

### Plan response
```ts
import { PlanResponseSchema } from "@repo/schemas";

const { tasks, stats, motivation } = PlanResponseSchema.parse(apiResponse);
```

### Diagnostic flow
```ts
import {
  DiagnosticNextRequestSchema,
  DiagnosticAnswerRequestSchema,
  DiagnosticAnswerResponseSchema,
} from "@repo/schemas";

const nextRequest = DiagnosticNextRequestSchema.parse({ studentId, topicId });
const answerPayload = DiagnosticAnswerRequestSchema.parse({
  studentId,
  probeId,
  result: "correct",
  latencyMs: 2500,
});
```

### Motivation summary
```ts
import { MotivationSummarySchema, ClaimRewardRequestSchema } from "@repo/schemas";

const motivation = MotivationSummarySchema.parse(summaryPayload);
const claimRequest = ClaimRewardRequestSchema.parse({ studentId, rewardId });
```

### Weekly report
```ts
import { WeeklyReportSchema } from "@repo/schemas";

const report = WeeklyReportSchema.parse(apiResponse);
```

### Motivation Schemas (`motivation.ts`)

```typescript
import {
  MotivationSummarySchema,
  MotivationLeagueSchema,
  MotivationQuestSchema,
  TimeBackLedgerEntrySchema,
  MotivationDigestSchema,
} from "@repo/schemas";

const summary = MotivationSummarySchema.parse(summaryPayload);
const leagues = MotivationLeagueSchema.array().parse(leaguesPayload);
const quests = MotivationQuestSchema.array().parse(questsPayload);
const ledger = TimeBackLedgerEntrySchema.array().parse(ledgerPayload);
const digest = MotivationDigestSchema.parse(digestPayload);
```

## Workflow tips

1. **Define schemas first** – routes and engine modules should import from here rather than declaring ad-hoc types.
2. **Annotate with `.openapi()`** to ensure API docs stay in sync.
3. **Prefer composition** – reuse enums from `common.ts` instead of redefining string unions.
4. **Run `bun x tsc --noEmit -p packages/schemas`** whenever schemas change; downstream packages will catch mismatches immediately.

Keeping the schemas current ensures every consumer—from the planner to the web app—shares the same contract.
