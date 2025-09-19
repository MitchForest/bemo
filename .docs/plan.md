Below are **two companion documents** for engineering, product, and content teams.

* **Document A** — *Learning Engine & Motivation Model* (system architecture, data flow, algorithms, tasks, XP, analytics).
* **Document B** — *Curriculum Primitives (Pre-K → Grade 2)* (skills, task templates, examples, authoring workflow).

---

# Document A — Learning Engine & Motivation Model

## A.1 Product principles
- **Skill-first.** Every plan, evidence event, and report references a `skillId`. There are no topics or knowledge-point aliases.
- **Micro tasks.** Templates are 1–4 minutes and follow the “I do → We do → You do” cadence so Pre‑K learners stay engaged.
- **Agency with guardrails.** The daily plan offers a small set of choices (learn, practice, review) with clear XP rewards and estimated time.
- **Gentle motivation.** XP fuels stickers/collectibles and daily/weekly goals. No competitive leagues for early learners.

## A.2 Module snapshot

| Module | Responsibility | Status |
|--------|----------------|--------|
| Curriculum | Emits skills + skill task templates, XP tracks, sticker rewards. | Seeds generate baseline templates; needs authoring. |
| Plan | Chooses tasks (learn/practice/review) based on mastery, spacing, and non-interference. | Active. Uses skill templates; requires content polish. |
| Evidence | Records attempts, updates mastery, awards XP, unlocks stickers. | Active. XP sourced from template metadata. |
| Motivation | Daily/weekly goal tracking, sticker unlocks, optional joy breaks. | Active; sticker catalog minimal. |
| Reporting | Aggregates skill mastery, XP progress, goal attainment. | Needs update to surface new fields. |

## A.3 Data model (condensed)
- **Skill**: atomic node with prerequisites, grade band, interference group, expected seconds, check-chart tags.
- **SkillTaskTemplate**: `{ intent, xpAward, estimatedMinutes, modalities, steps[], metadata }`.
  - Steps capture `kind`, `prompt`, optional `expectedResponse`, `hints`, and optional `items` (mini practice/check items).
- **StudentSkillState**: mastery metrics + `taskTemplateTallies` + spaced repetition schedule.
- **Motivation**: XP ledger, sticker rewards (type `sticker`), daily and weekly targets.

## A.4 Planning & spacing
1. Gather due skills + unlocked frontier skills.
2. Score with domain rotation + non-interference.
3. Map reasons to template intents:
   - `frontier` → `learn`
   - `struggling_support` → `guided_practice` / `independent_practice`
   - `compressed_review` → `review_prompt` / `independent_practice`
   - `speed_drill` → `fluency`
   - `diagnostic` → `quick_check`
4. Build tasks including template IDs, XP award, intent, modalities.
5. Update spaced review after evidence events (review prompts default to 3-day interval).

## A.5 XP & stickers
- Each template awards XP (`learn` 25, `practice` 18, `review` 12, `check` 10 by default; tunable).
- Daily goal default 50 XP; weekly goal default 150 XP (configurable per learner).
- Sticker rewards unlock at XP thresholds (25, 50, 200 XP) and can be surfaced immediately to the learner.
- Motivation summary surfaces `xpEarnedToday`, `xpRemainingToday`, `xpEarnedThisWeek`, and `xpRemainingThisWeek`.

## A.6 API highlights
- `GET /api/plan` → skill tasks with template IDs, intent, XP, estimated minutes.
- `POST /api/evidence` → updates mastery + XP; metadata stores template intent.
- `GET /api/content/skill/:id` → `{ skill, taskTemplates }` direct from DB or seeds.
- `GET /api/motivation/summary` → daily/weekly XP + sticker progress.

## A.7 Roadmap
1. Replace generated template text with authored content (voice scripts, manipulatives, practice items).
2. Implement spacing configuration per skill (`recommendedIntervalDays`).
3. Extend reporting and dashboards to surface XP goals + unlocked stickers.
4. Add optional joy breaks and quests once base loop is validated.

---

# Document B — Curriculum Primitives (Pre-K → Grade 2)

## B.1 Scope snapshot

| Subject | Courses | Lessons | Skill count |
|---------|---------|---------|-------------|
| Foundational Literacy | Preliteracy • Kindergarten Phonics • Grade 1 Core • Grade 2 Extension | 16 | 101 |
| Foundational Math | Pre-number • Kindergarten Core • Grade 1 Number Sense • Grade 2 Extension | 15 | 86 |

## B.2 Skills
- Single, observable behaviours (decode CVC short a, blend three sounds, count to 5, compose shapes).
- Each skill stores prerequisites, interference group, XP estimate, and check-chart tags.
- Lessons are lightweight groupings (3–6 related skills) for adult reference only; the engine still plans per skill.

## B.3 Skill task templates
Per skill we ship:
- **Learn** – 3-minute micro-lesson introducing the skill (`xpAward ≈ 25`).
- **Guided Practice** – adult-supported repetition (`xpAward ≈ 18`).
- **Independent Practice** – short mastery check with `exitAfterConsecutiveCorrect = 2` (`xpAward ≈ 18`).
- **Review Prompt** – spaced retrieval cue (`xpAward ≈ 12`, `recommendedIntervalDays = 3`).
- **Quick Check** – single mastery verification (`xpAward ≈ 10`).
- **Fluency** (Grade 1/2 only) – 60-second speed round targeting automaticity.

Each template lists steps with adult language, learner actions, and optional item banks. Authors replace generated text with concrete instructions, manipulatives, and scaffolds.

## B.4 Example — “Count objects to 5” (M3_K_CORE)
- **Learn**: greet, model counting five blocks, guided tap-along, thumbs feedback.
- **Guided Practice**: adult starts counting; learner finishes; reflection prompt.
- **Independent Practice**: two quick tries with exit after two consecutive correct responses.
- **Review Prompt**: “Show me five fingers” (3-day spacing).
- **Quick Check**: single item; miss routes to guided practice.
- **Fluency**: 60-second “count the cubes” sprint for Grade 1+.

## B.5 Motivation hooks
- Two XP tracks (daily 50 XP, weekly 200 XP) with sticker rewards.
- Default stickers: Sparkle Star (25 XP), Rainbow Rocket (50 XP), Galaxy Badge (200 XP).
- Joy breaks, quests, and leagues remain empty scaffolds until we intentionally add them.

## B.6 Authoring workflow
1. Identify priority skills (e.g., Pre-K phonological awareness).
2. Duplicate template structure; rewrite prompts with concrete actions, gestures, manipulatives.
3. Add practice items with answers and explanations.
4. Validate XP/time assumptions with pilot users.
5. Commit updates (`seedSkillTaskTemplates`) and run `bun run typecheck`.

## B.7 Content gaps to fill
- Authentic scripts for all reading/maths strands (current templates are auto-generated placeholders).
- Practice items that align with each skill’s mastery definition.
- Review prompts tuned to actual spacing windows.
- Adult-facing guidance (coach notes, adaptive strategies) inside template metadata.
- Check charts, diagnostics, and motivation catalog once instruction exists.

Use this plan while authoring and integrating the simplified skill-first loop. All new content should attach directly to skill task templates so the engine, analytics, and UX stay perfectly aligned.
