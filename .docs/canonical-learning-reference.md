# Canonical Learning Model Reference

## TODOs / Open Follow-ups
- [ ] Update database migrations/seeds to persist subjects, courses, lessons, skills, and experience metadata (currently seed-only).
- [ ] Sweep frontend usage of `topicIds` to ensure UI elements consume `skillIds` (knowledge graph, teacher journey cards, etc.).
- [ ] Align API clients and docs (diagnostic, content, plan) with the new `skillId` terminology.
- [ ] Expose skill metric snapshots (mean/σ accuracy & latency) through reporting endpoints or dashboards.
- [ ] Extend evidence payloads/workflows to write aggregated skill metrics into analytics storage once DB is wired.
- [ ] Remove transitional topic-based fields/routes once consumers migrate (no long-term backward compatibility debt).

---

## Hierarchy & Primitives

| Level   | Description | Key Schema / Seeds |
|---------|-------------|--------------------|
| **Subject** | Top-level track (e.g., Foundational Literacy, Foundational Math) containing multiple courses. | `SubjectSchema`, `seedSubjects`, `SUBJECT_IDS` |
| **Course**  | Grade-band pathway inside a subject (PreK Foundations, Kindergarten Core). | `CourseSchema`, `seedCourses`, `COURSE_IDS` |
| **Lesson**  | Teacher-facing bundle of skills that should be experienced together; includes estimated minutes and focus question. | `LessonSchema`, `seedLessons`, `LESSON_IDS` |
| **Skill**   | Smallest adaptive unit the engine plans for and the student masters (was `Topic`). Skills track prerequisites, encompassing links, stage, grade band, time estimates. | `SkillSchema`, `seedSkills`, `SKILL_IDS` |
| **Knowledge Point (KP)** | Objective-level breakdown inside a skill (2–4 per skill) with worked examples, reteach snippets, and practice item IDs. | `KnowledgePointSchema`, `seedKnowledgePoints`, `KNOWLEDGE_POINT_IDS` |
| **Experience** | Concrete delivery variant for a KP (delivery kind, modalities, sensory tags, linked practice). | `KnowledgePointExperienceSchema`, `seedKnowledgePointExperiences` |

### Relationships
- **Prerequisites**: Skill-level AND/OR requirements (`SkillPrerequisiteSchema`). Planner checks `prerequisitesMet` before surfacing frontier work.
- **Encompassing**: Weighted relations between skills. Positive weights add fractional reps to encompassing skills on success; negative weights subtract reps on errors (captures interference / hole-filling needs).
- **Lessons to Skills**: `Lesson.skillIds` enumerates the skills taught within the lesson; planner can group sequential tasks accordingly.
- **Courses / Subjects**: Courses reference lessons; subjects reference courses, keeping long-term scope visible.

## Learning Loop
1. **Plan** (`plan.ts`)
   - Pulls all skills (`seedSkills`) and learner states (`StudentSkillState`).
   - Computes due set (spaced review) + frontier set (unseen/struggling skills) honoring prerequisites.
   - Schedules tasks with mapped experiences (`experienceIds`, modalities, sensory tags) and rotated skill IDs.
   - Injects hole-filling or speed drills based on retention and latency thresholds.
   - Outputs stats: `dueSkills`, `overdueSkills`, `strugglingSkills`, `speedDrillOpportunities`, `compressionRatio`.

2. **Delivery**
   - Lessons & reviews use experiences to vary modality (manipulative, storytelling, movement, fluency loop, etc.).
   - UI launches tasks by reading `skillIds`, `knowledgePointIds`, `experienceIds`.

3. **Evidence** (`evidence.ts`)
   - Events include `skillId`, `result`, `latencyMs`, `experienceId`.
   - Updates skill state via `memory.ts` (strength/stability) and logs experience tallies.
   - Propagates fractional reps to encompassing skills (positive/negative weights).
   - Records aggregate metrics (mean / σ accuracy, latency) globally and segmented by learner grade/gender.

4. **Memory & Mastery** (`memory.ts`)
   - Maintains `strength`, `stability`, `repNum`, `avgLatencyMs`, `speedFactor`, `experienceTallies`.
   - Computes due interval from success, latency penalty, and weight.
   - Calculates `retentionProbability365` using an exponential decay model (half-life ≈ stability × 26 days).
   - Mastery is dynamic: threshold = retention probability ≥ 0.95 for 365 days; decay reintroduces review.

5. **Feedback & Reporting**
   - `profile.ts` summarises mastery by domain (mean strength, due/struggling counts), due skill queue, plan snapshot, check charts (now keyed by `skillIds`).
   - `report.ts` builds weekly digest (XP/minutes totals, highlights, coach actions per skill).
   - Motivation module unaffected but consumes skill identifiers when referencing tasks.

## Student Data Model
- **StudentSkillState**
  - `skillId`, `strength`, `stability`, `repNum`, `dueAt`, `avgLatencyMs`, `speedFactor`, `experienceTallies`, `retentionProbability365`.
  - `strugglingFlag` toggled when strength < 0.45 or latest success < 0.4.
  - `overdueDays` tracks how far past due the repetition is.
- **StudentStats**
  - `skillsCompleted`, `speedDrillsCompleted`, `totalXp`, `minutes`, streaks, and rolling 14-day XP timeline.
- **Aggregates**
  - `recordSkillMetricSample` accumulates accuracy/latency metrics per skill, by gender, by grade.
  - `getSkillMetricSnapshot` returns means/standard deviations for analytics (currently in-memory; TODO: persist via DB/export).

## Content & API Surface
- **Curriculum API (`/api/content/...`)**
  - `GET /content/experiences` → list experiences.
  - `GET /content/topic/:id` (back-compat) returns `{ topic: skill, knowledgePoints, experiences }`.
  - Practice activities now expose `skillId` alongside legacy `topicId` for transitional support.
- **Plan API (`/api/plan`)**
  - Tasks include `skillIds`, `experienceIds`, sensory tags, reason, and modality caps.
- **Evidence API (`/api/evidence`)**
  - Expects `skillId` per event.
- **Diagnostic API (`/api/diagnostic/*`)**
  - Query/body now accept `skillId`; responses return probes keyed by `skillId` and session metadata listing `activeSkillIds`.

## Motivation & Check Charts
- Check chart statements reference `skillIds`; thresholds include accuracy, consecutive passes, optional latency caps.
- Rewards, streaks, joy breaks continue to operate unchanged but plan/motivation stats now use skill metrics.

## Analytics & Monitoring
- Skill metric snapshot data is ready for dashboards or anomaly detection.
- Profile & report modules utilise `skillStates` to derive mastery, due counts, and reteach prompts.
- TODO: expose aggregated metrics via API / telemetry sink.

## Terminology Quick Reference
- **Skill** (previously “topic”): atomic adaptive unit.
- **Experience**: a multimodal lesson/practice variant tied to a knowledge point.
- **Repetition (rep)**: every evidence event increments reps; fractional credit flows through encompassing relations.
- **Retention Probability**: estimated likelihood (%) the learner retains the skill after 365 days; mastery threshold at 95%.
- **Hole Filling**: planner injects prerequisite experiences (tagged `hole_fill`) when errors or negative transfer emerge.

## Data Flow Summary
```
Planner (skills) → Task (skillIds, experienceIds) → UI Experience → Evidence (skillId, result, latency) →
Memory Update (strength/stability/retention) → Aggregates (mean/σ) → Profile/Report (skill-centric views)
```

Use this document as the canonical source when evolving curriculum content, adaptive behaviours, or analytics.
