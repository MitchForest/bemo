# @repo/engine

Adaptive learning engine powering Bemo's 80/20 math-first roadmap, motivation system, diagnostics, and reporting.

## Module snapshot

| Module | Responsibility |
| ------ | --------------- |
| `plan.ts` | Builds daily playlists (compressed review → frontier lessons → speed drills → optional diagnostics) with modality caps and motivation metadata. |
| `memory.ts` | Updates stability/strength after each evidence event and applies weighted credit to encompassing topics. |
| `evidence.ts` | Processes evidence batches, awards XP, and emits achievement hooks. |
| `motivation.ts` | Computes XP goal progress, streak state, reward eligibility, and joy-break availability. |
| `diagnostic.ts` | Manages lightweight adaptive math probes with retry logic and provisional mastery estimates. |
| `profile.ts` | Aggregates mastery, due/overdue topics, speed flags, latest plan, and check-chart progress for dashboards. |
| `report.ts` | Generates weekly XP/minutes rollups and coach action items. |
| `data.ts` | In-memory fallback store for topic states, profiles, and stats until the Kysely persistence layer is enabled. |

Everything re-exports through `index.ts` with types sourced from `@repo/schemas`, giving end-to-end type safety.

## Key capabilities

- **80/20 playlisting** with math-first prioritisation, struggling-topic boosts, and implicit review compression.
- **Speed fluency targeting** using latency thresholds and speed-factor metrics to launch timed drills.
- **Motivation mechanics** including daily XP goal tracking, streak updates, reward thresholds, and time-back calculations.
- **Diagnostics** seeded with subitizing, counting, addition, and telling time probes plus retry variants.
- **Dashboards & reports** that surface mastery trends, overdue items, and weekly highlights for adults.

## Usage examples

### Generate a plan
```ts
import { getPlan } from "@repo/engine";
import type { PlanRequest } from "@repo/schemas";

const planRequest: PlanRequest = {
  studentId: "11111111-1111-4111-8111-111111111111",
  max: 5,
  includeSpeedDrills: true,
  includeDiagnostic: true,
};

const { tasks, stats, motivation, studentStates } = await getPlan(planRequest);
```

### Submit evidence
```ts
import { submitEvidence } from "@repo/engine";
import type { SubmitEvidence } from "@repo/schemas";

const payload: SubmitEvidence = {
  taskId: "task-uuid",
  events: [
    {
      studentId: "11111111-1111-4111-8111-111111111111",
      topicId: "00000000-0000-4000-8000-000000000204",
      knowledgePointId: "10000000-0000-4000-8000-000000000207",
      itemId: "item-uuid",
      result: "correct",
      latencyMs: 3200,
      hintsUsed: 0,
      timestamp: new Date().toISOString(),
    },
  ],
};

const { xpEarned, updatedStates, achievements } = await submitEvidence(
  payload.events[0].studentId,
  payload,
);
```

### Motivation & diagnostics
```ts
import {
  getMotivationSummary,
  getMotivationLeagues,
  joinMotivationSquad,
  getMotivationQuests,
  updateQuestTaskProgress,
  claimQuestReward,
  getTimeBackLedgerEntries,
  getMotivationDigest,
  getNextDiagnosticProbe,
  submitDiagnosticAnswer,
} from "@repo/engine";

const motivation = await getMotivationSummary(studentId);

const leagues = await getMotivationLeagues(studentId);
await joinMotivationSquad(studentId, leagues[0].id, leagues[0].squads[0]?.id);

const quests = await getMotivationQuests(studentId);
if (quests[0]) {
  for (const task of quests[0].tasks) {
    await updateQuestTaskProgress(studentId, quests[0].id, task.id, 1, true);
  }
  await claimQuestReward(studentId, quests[0].id);
}

const ledger = await getTimeBackLedgerEntries(studentId);
const digest = await getMotivationDigest(studentId, "coach");

const { probe, session } = await getNextDiagnosticProbe({ studentId });
if (probe) {
  await submitDiagnosticAnswer({
    studentId,
    probeId: probe.id,
    result: "correct",
    latencyMs: 2400,
  });
}
```

### Dashboards & reports
```ts
import { getStudentProfileSummary, getWeeklyReport } from "@repo/engine";

const profile = await getStudentProfileSummary(studentId);
const weeklyReport = await getWeeklyReport(studentId);
```

## Memory model

- **Strength** (0–1) reflects retrieval confidence and reacts to accuracy, hints, and latency.
- **Stability** tracks half-life; strong retrievals boost it while misses shorten spacing.
- **Encompassing edges** allow implicit review credit to parent topics for compressed playlists.
- **Speed factor** compares observed latency vs. expected latency to surface fluency gaps.

`data.ts` currently provides seeded, in-memory fallbacks. Once the database tables include the necessary audit columns, swap in the commented Kysely helpers to persist learner state.

## Testing

```bash
bun test packages/engine               # Bun unit tests for plan/evidence/diagnostics/motivation/profile
bun x tsc --noEmit -p packages/engine  # Strict type checking
```

All tests run against in-memory state and require no external services.
