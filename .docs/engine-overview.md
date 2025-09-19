# Learning Engine & Motivation Platform — 2025 Refresh

## Modules
- `packages/engine/src/plan.ts` — builds daily playlists from skill mastery, XP goals, and spacing; selects appropriate task templates (`learn`, `practice`, `review`, `quick_check`, `fluency`).
- `packages/engine/src/memory.ts` — updates mastery, spacing intervals, and template tallies after each attempt.
- `packages/engine/src/evidence.ts` — ingests evidence payloads, awards template XP, unlocks stickers, logs achievements.
- `packages/engine/src/motivation.ts` — tracks daily/weekly XP goals, sticker rewards, and optional joy breaks.
- `packages/engine/src/data.ts` — persistence boundary: uses Kysely when `DATABASE_URL` is present and rich in-memory seeds when it is not.
- `packages/engine/src/profile.ts` — surfaces progress snapshots (mastery, XP progress, sticker unlocks).
- `packages/engine/src/report.ts` — weekly digest with XP, minutes-on-task, suggested actions.

## Skill-first data model
- **Skill** — atomic node with prerequisites, interference tags, stage code, expected seconds, check-chart tags.
- **SkillTaskTemplate** — micro-lesson definition: `{ intent, xpAward, estimatedMinutes, modalities, steps[], metadata }`.
  - Step kinds: `instruction`, `example`, `guided_practice`, `practice`, `prompt`, `reflection`.
  - Steps optionally include `items` for practice/quick checks and `exitAfterConsecutiveCorrect` for mastery rules.
- **StudentSkillState** — mastery, stability, due dates, `taskTemplateTallies`, retention probability.
- **Motivation** — XP tracks (daily/weekly), sticker rewards, streak, optional joy breaks.

## Planning loop
1. Pull the skill graph (from Postgres or the seed set) and learner skill states.
2. Classify reasons (`frontier`, `struggling_support`, `compressed_review`, `speed_drill`, `diagnostic`).
3. Map reasons to template intents and choose templated micro-tasks.
4. Emit tasks with template IDs, XP award, modality hints, estimated minutes, and metadata (`primarySkillId`, `primarySkillTitle`, latency targets, etc.).
5. Alternate domains (math ↔ reading) while respecting interference groups.
6. Persist updates back to Postgres when available; otherwise refresh the in-memory map so subsequent calls see the new state.

## Evidence & XP
- `submitEvidence` updates mastery and stability, increments XP using template `xpAward`, and unlocks stickers when thresholds are reached (25, 50, 200 XP).
- Metadata records template IDs and intent for analytics.

## Motivation summary
- Daily goal (default 50 XP) and weekly goal (150 XP) live on the student profile and can be changed per learner.
- Summary API returns XP progress, streak data, sticker unlocks, available joy breaks, and seeded league/squad records when Postgres is not configured.
- Leagues/quests are kept intentionally lightweight in seeds so tests and demos have deterministic data.

## API surface
- `GET /api/plan` — skill tasks with template intent, XP, estimated minutes, and metadata (primary skill, latency targets).
- `POST /api/evidence` — logs events, updates mastery, awards XP, updates skill metrics.
- `GET /api/content/skill/:id` — returns `{ skill, taskTemplates }` from Postgres or seeds.
- `GET /api/motivation/summary` — XP goals, stickers, joy breaks, and seeded league/quest data.

## Implementation checklist
1. Replace auto-generated template text with authored scripts, manipulatives, and practice items.
2. Configure spacing intervals per skill or stage.
3. Extend reporting to surface intent-specific mastery (e.g., how often quick checks fail).
4. Add optional quests or joy breaks after the base experience is validated.

Everything is type-safe end-to-end through `@repo/schemas`. With knowledge-point debt gone, the skill task template is the contract for plan, evidence, content, and analytics.
