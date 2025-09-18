# Learning Engine & Motivation Platform — 2024 Learning-Science Refresh

## Module layout
- `packages/engine/src/plan.ts` — computes daily playlists by blending spaced review, hole-filling backtracks, frontier lessons, diagnostics, and speed reps. Tasks now target *skills* and surface the exact instructional experience that should fire.
- `packages/engine/src/memory.ts` — updates skill memory with reps, strength, stability, expected latency, and retention probability (`P(365d)`). Reps increment fractional credit for encompassing skills (positive or negative weight) and log experience usage.
- `packages/engine/src/evidence.ts` — ingests evidence batches (accuracy + latency), fans fractional reps to encompassing skills, updates aggregates, and flags hole-filling prerequisites whenever accuracy drops.
- `packages/engine/src/motivation.ts` — streaks, rewards, joy breaks, and time-back ledger (unchanged API, enhanced metrics wiring).
- `packages/engine/src/diagnostic.ts` — adaptive probe queue keyed by skill IDs.
- `packages/engine/src/profile.ts` — assembles dashboards with mastery, due skills, streaks, check-chart progress, and latest plan snapshot.
- `packages/engine/src/report.ts` — weekly digest builder summarising XP, minutes, highlights, and reteach actions per skill cluster.
- `packages/engine/src/data.ts` — in-memory fallback store (skills, skill states, aggregates, motivation); persistence hooks remain ready for DB wiring.

## Updated data model
### Subject → Course → Lesson → Skill hierarchy
- **Subject** (`seedSubjects`) groups a domain (e.g., Foundational Literacy, Foundational Math).
- **Course** (`seedCourses`) denotes grade-band pathways (PreK Foundations, Kindergarten Core, etc.).
- **Lesson** (`seedLessons`) bundles related skills with estimated time and focus statements.
- **Skill** (`seedSkills`) is the atomic practice target. Each skill lists:
  - `prerequisites`: AND/OR gated dependencies on other skills.
  - `encompassing`: weighted relations (positive = fractional reps awarded; negative = fractional penalty when errors occur).
  - `stageCode`, `gradeBand`, `expectedTimeSeconds`, and experience hooks.

Knowledge points stay mapped to skills (`skillId`) and own worked examples, reteach scripts, and practice item IDs.

### Experiences & modalities
- `seedKnowledgePointExperiences` define multimodal delivery variants per skill (e.g., manipulative play, storytelling, fluency loop, challenge). Each experience carries delivery kind, sensory tags, modalities, and associated practice activities.
- `Task.experienceIds` mirrors the chosen experiences so clients can render the correct flow.

### Repetitions & retention
- Every evidence event increments the skill’s `total reps`, `success reps`, and updates retention probability over a 365-day horizon (stored on the student skill state).
- Fractional reps propagate through encompassing relationships (e.g., +0.4 for aligned skill, −0.2 if errors signal interference).
- Mastery is defined as a ≥0.95 retention probability at 365 days; the engine never “locks” mastery: decay continues and spaced reps regenerate when needed.

### Hole-filling
- When accuracy drops or negative fractional reps accrue, the planner injects prerequisite experiences tagged `hole_fill` so students shore up missing fundamentals before reattempting frontier lessons.

### Student state & aggregates
- `StudentSkillState` now stores `skillId`, `experienceTallies`, rep counts, stability, strength, average latency, `retentionProbability365`, and running streak flags.
- `StudentStats` tracks `skillsCompleted`, streaks, XP, minutes, and weekly XP timeline.
- Engine aggregates maintain running means/standard deviations per skill segmented by demographic slices (grade, gender) to inform future adaptations.

## API surface
- `GET /api/plan` → skill-centric tasks (lesson/review/diagnostic/speed) with modality and experience metadata, plus new stats (`dueSkills`, `overdueSkills`, `strugglingSkills`).
- `POST /api/evidence` → accepts `skillId` evidence events, updates reps, retention, aggregates, and achievements.
- `GET /api/content/experiences` → exposes experience catalog for authoring and clients.
- `GET /api/content/topic/:id` now returns `{ topic: skill, knowledgePoints, experiences }` for backward compatibility.
- Remaining endpoints (`/motivation`, `/profile`, `/report`, `/diagnostic`) continue to function with skill-aware identifiers.

## Learning-science alignment
- **Sequencing**: Subject → Course → Lesson → Skill hierarchy clarifies scope and enables playlist assembly in meaningful chunks.
- **Prerequisite integrity**: AND/OR prerequisite gating and hole-filling logic ensure gaps surface immediately.
- **Retrieval & spacing**: Reps drive schedule spacing; experiences rotate modalities so recall sticks across sensory channels.
- **Positive/negative transfer**: Encompassing relations with signed weights award or subtract reps to capture interference.
- **Fluency**: Latency and speed-factor thresholds remain central; speed drills trigger when retention is high but response time lags.
- **Analytics**: Aggregated means/standard deviations per skill and demographic ready the system for benchmarking and adaptive scaling.

## Next implementation steps
1. **Persistence** — wire skills, lessons, experiences, and student states into Postgres (tables already scaffolded; migrate once schema stabilises).
2. **CMS authoring** — connect experience definitions and lesson scripts to the content authoring UI.
3. **Adaptive weighting** — tune encompassing weights using collected accuracy/latency data to better model positive vs. negative transfer.
4. **Reporting** — surface retention probability, rep streaks, and experience tallies in coach dashboards.
5. **Assessment expansion** — add skill-level probes for reading diagnostics, now that pipeline accepts `skillId`.

Everything remains type-safe end to end via the updated schemas in `@repo/schemas`.
