# Canonical Learning Model Reference

## Current State (March 2025)
- **187 skills** spanning Pre‑K → Grade 2 (101 reading, 86 math) with explicit prerequisites, non‑interference tags, check‑chart statements, XP estimates.
- **Skill task templates** automatically generated per skill:
  - `learn`, `guided_practice`, `independent_practice`, `review_prompt`, `quick_check`, and `fluency` (for Grade 1+).
  - Each template includes an intent, expected minutes, XP award, modalities, and a sequence of short steps.
- **Motivation scaffolding**: Daily (50 XP) and weekly (200 XP) tracks with sticker rewards; no leagues or squads in the early-childhood loop.
- **Seeds**: Database seeding writes subjects → courses → lessons → skills → templates. Assets, microgames, diagnostics, and check charts remain empty placeholders until authored.

## Immediate Priorities
1. **Author domain-specific content**
   - Replace generated text with real scripts, manipulatives, and visuals for high-priority skill clusters.
   - Add coaching notes, gestures, and culturally responsive examples.
2. **Enrich practice items**
   - Provide concrete item banks (2–5 items per practice step) with explanations and variation.
3. **Populate review prompts**
   - Define recommended intervals and caregiver language for each `review_prompt` template.
4. **Fill motivation catalog**
   - Add sticker art, badge assets, and optional joy breaks aligned with daily/weekly goals.
5. **Build reporting surfaces**
   - Map skill templates to check-chart statements and adult dashboards.

## Core Primitives
### Skill
- Atomic learning target.
- Carries: `title`, `domain`, `gradeBand`, `stageCode`, `expectedTimeSeconds`, `interferenceGroup`, `checkChartTags`, `prerequisites`.
- Planner alternates domains and honours prerequisites + non‑interference.

### Skill Task Template
Reusable micro‑lesson for a single skill.

| Field | Description |
| ----- | ----------- |
| `intent` | Instructional purpose (`learn`, `guided_practice`, `independent_practice`, `review_prompt`, `quick_check`, `fluency`). |
| `xpAward` | XP granted on completion; fuels stickers and daily/weekly goals. |
| `estimatedMinutes` | Expected seat time (1–3 minutes). |
| `modalities` / `sensoryTags` | Input/output channel hints (voice, tap, manipulatives). |
| `steps` | Ordered array of short moves. Each step captures `kind` (instruction, example, practice, prompt, reflection), `prompt`, optional `expectedResponse`, `hints`, and optional `items` (mini practice/check questions). |
| `metadata` | Freeform (e.g., `{ recommendedIntervalDays: 3 }`). |

#### Step Anatomy
- **Instruction** – adult-facing narration.
- **Example** – worked example for dual coding.
- **Guided Practice** – “We do” with prompts.
- **Practice** – learner attempt; may include `items` with exit rules (`exitAfterConsecutiveCorrect`).
- **Prompt** – retrieval cue used for spaced review.
- **Reflection** – simple affect check (thumbs, “How did that feel?”).

### XP & Stickers
- **Daily goal** (default 50 XP) and **weekly goal** (default 150 XP) stored on the student profile.
- Completing a template grants its `xpAward`; reaching thresholds unlocks sticker rewards (`Sparkle Star`, `Rainbow Rocket`, `Galaxy Badge`).
- Adults can set different goals per learner; planner surfaces XP progress in every task card.

## Learning Loop
1. **Plan** – engine proposes ~3 cards: “Learn something new”, “Practice what’s almost there”, “Quick review”. Each card:
   - references a single skill
   - lists the template intent (e.g., `learn`, `review_prompt`)
   - shows time + XP reward.
2. **Execute Template** – adult/learner follows 2–4 concise steps. No long-form media; rely on voice, simple manipulatives, and tap interactions.
3. **Evidence & XP** – completion records mastery outcome, increments XP by `xpAward`, updates daily/weekly totals, and unlocks stickers when thresholds hit.
4. **Spacing & Non-Interference** – planner schedules review prompts after 3 days, alternates domains, and avoids skills in the same interference group back-to-back.
5. **Progress Tracking** – check charts and dashboards key off `skillId`, `intent`, and streaks; no knowledge-point aliases.

## Example: “Count objects to 5”
- **Learn** (3 minutes / 25 XP):
  1. Instruction – “Let’s count the dots together.”
  2. Example – adult models counting five blocks.
  3. Guided practice – learner taps counters with the adult.
  4. Reflection – thumbs up/sideways check-in.
- **Independent Practice** (2 minutes / 18 XP): two prompts with `exitAfterConsecutiveCorrect = 2`.
- **Review Prompt** (1 minute / 12 XP): quick oral retrieval scheduled every 3 days.
- **Quick Check** (1 minute / 10 XP): single “Show me 5” verification; miss slides the skill back into guided practice.

## Data Model Summary
- `skills` table → canonical nodes.
- `skill_task_templates` table → JSON definition of steps + XP + modalities.
- All downstream services (plan, evidence, content API) consume these templates; there is no knowledge-point shim or topic alias.

## Authoring Playbook
1. Duplicate an existing template for the target skill group.
2. Replace prompts with domain-specific language, visuals, and manipulatives.
3. Ensure practice items include explanations and success criteria.
4. Set XP/estimated minutes realistically (2–4 minutes per template).
5. Publish via `seedSkillTaskTemplates` (and future CMS) and run `bun run typecheck`.

Use this document as the living source of truth for how skills, task templates, XP, and stickers interlock. Once domain authors replace the generated text, we can roll the experience into pilots.
