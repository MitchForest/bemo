Below are **two self‑contained documents** you can hand to engineering, product, and content teams.

* **Document A** — *Learning Engine & Motivation Model* (system architecture, data model, algorithms, APIs, UX & accessibility, analytics, privacy).
* **Document B** — *Curriculum Primitives (Pre‑K → Grade 1): Reading & Math* (topics, knowledge points, lessons, practice activities, micro‑games, and “check charts”).

---

# Document A — Learning Engine & Motivation Model

## A.1 Product philosophy & scope

* **Retrieval practice + spaced repetition forever.** Everything in the system (lessons, practice, games, “check chart” goals) is scheduled by the engine so items re‑surface at expanding intervals to lock in memory.
* **Hierarchical mastery.** A **knowledge graph** (KG) breaks skills into **Topics** (small, teachable skills). Edges:

  * **Prerequisite** (gates unlocking of new topics).
  * **Encompassing** (weighted 0..1): doing Topic B also **implicitly practices** Topic A at weight *w* (supports *review compression*).
* **Reusable core.** The engine, motivation model, and content schema are **frontend‑agnostic** (web app first; later iPad apps/games via API).
* **Pre‑K → Grade 1** initial scope across **Reading** and **Math**, with age‑appropriate UX (large targets, few choices, multimodal inputs, stylus tracing on tablet).

---

## A.2 System architecture (web app + APIs)

**Services (initial monolith, modular boundaries defined):**

1. **Content Service**

   * Stores Topics, Knowledge Points (KPs), problem banks, media, instruction scripts, “reteach” snippets, and micro‑game configs.
2. **Graph Service**

   * Prerequisite & Encompassing edges, weights, interference groups.
3. **Learning Engine**

   * Student model, memory scheduler, task selector, diagnostic, review compression, speed‑drill generator.
4. **Motivation Service**

   * XP goals, streaks, leagues (optional), badges/quests, “time‑back” unlocks, coach/parent digests.
5. **Session & Evidence Ingest**

   * Receives per‑item results (accuracy, latency, hints, audio traces, stylus traces), updates the student model, emits analytics.
6. **Report Service**

   * Knowledge map, due calendar, “check charts”, teacher/coach dashboards.
7. **Identity & Privacy**

   * Student/guardian accounts; COPPA/FERPA controls; data retention policies; device consent for mic/camera.

**Clients:**

* **Web app (MVP)** with kid mode (learner), adult mode (coach/parent).
* **Future iPad apps** (reading, math, handwriting) consuming `/plan`, `/evidence`, `/profile`, and micro‑game descriptors.

---

## A.3 Data model (core entities)

**Topic**

* `id`, `title`, `domain` (math|reading), `strand` (e.g., “Counting & Cardinality”), `grade_band` (Pre‑K/K/1), `stage_code` (`M0_FOUNDATIONS|M1_PREK_CORE|M2_PREK_STRETCH|M3_K_CORE|M4_G1_CORE`), `description`
* `prereqs`: array of `{topic_id, gate: "AND"|"OR"}`
* `encompassed_by`: array of `{parent_topic_id, weight}` // “this topic A gets implicit credit when practicing parent B at weight w”
* `interference_group` (e.g., similar phonemes; visually confusable letters)
* `expected_time_sec` (for a micro‑lesson)
* `assets`: media IDs (audio prompts, images, manipulatives instructions)
* `check_chart_tags`: array of progress statements

**KnowledgePoint (KP)**

* `id`, `topic_id`, `objective` (e.g., “Blend CVC with short a”)
* `worked_example`: step list + visuals/audio
* `practice_items`: list of item templates (see **Item**)
* `reteach_snippet`: short micro‑lesson shown on error
* `expected_time_sec`, `hints` (scripted tiers)

**Item** (lesson or assessment atom)

* `id`, `kp_id`, `type`:

  * `choice_image`, `choice_text`, `drag_drop`, `tap_to_count`, `speak`, `record_audio`, `trace_path`, `short_answer`, `timer_speed_drill`
* `prompt`: structured (text + TTS; picture/video; phoneme stream)
* `rubric`: how to score (`exact`, `phoneme_match`, `count_equals`, `path_tolerance`, `latency_thresholds`)
* `difficulty`: 1..5; `time_estimate_ms`: int
* `randomization`: parameters (e.g., counting start 7..19)
* `encompassing_targets`: array of topic\_ids that receive implicit credit for this item (and weights)

**StudentTopicState**

* `student_id`, `topic_id`
* `stability` (memory half‑life proxy), `strength` (0..1), `rep_num` (int)
* `due_at`, `last_seen_at`, `avg_latency_ms`, `speed_factor` (≈ how much faster or slower than expected time)
* `struggling_flag` (bool), `overdue_days`, `easiness` (optional, SM‑2 style)

**EvidenceEvent**

* `student_id`, `topic_id`, `kp_id`, `item_id`, `ts`
* `result` (`correct|incorrect|partial|skipped`), `latency_ms`, `hints_used`, `input_payload` (e.g., audio path, trace vector), `confidence` (for speech)

**Task**

* `id`, `type` (`lesson|review|quiz|speed_drill|diagnostic|multistep`)
* `topic_ids`, `kp_ids`, `estimated_minutes`, `xp_value`, `modality_caps` (e.g., voice required)

**CheckChart**

* `id`, `title`, `grade_band`
* `stage_code` (see **B.2** progression stages)
* `statements`: array of `{ id, label, topic_ids, threshold }`

  * `threshold`: `{ accuracy: number, consecutive_passes: number, latency_ms?: number }`
* `display_order`, `icon_asset_id`, `coach_only` (bool), `celebration_copy`

---

## A.4 Algorithms (learning engine)

### A.4.1 Memory model (hierarchical spaced repetition)

We use a **per‑topic stability model** with implicit credit flowing through the KG.

* **On each item result** for topic `t`:

  * Compute **quality** `q` ∈ {0, 1} (partial allowed) and **timeliness** (early/on time/late).
  * Update **stability** `S_t` and **strength** `R_t`:

    * `R_t ← clamp( R_t + α₁·q − α₂·(1−q) − α₃·late_penalty , 0, 1 )`
    * `S_t ← S_t · (1 + β₁·q − β₂·(1−q))`
    * `rep_num_t ← rep_num_t + 1`
  * Set **next due interval** `I_t` from `S_t` (e.g., `I_t = base · S_t^γ`, min 1 day; grows with stability).
  * **Implicit credit (encompassing):** for each ancestor `a` with weight `w` on edge `(t → a)`:

    * Apply a **discounted** update to `R_a` and `S_a`: `ΔR_a = w·k·(q − (1−q))` (smaller than explicit).
    * If `speed_factor_t < 1` (student slow), **suppress** implicit gains to prevent illusions of mastery.
  * **Implicit penalty (prereq violations):** if repeated failure on `t`, apply small negative to direct dependents.

**Defaults to start:**

* `base` = 1 day; `γ` ≈ 1.4; `α₁=0.10, α₂=0.15, α₃=0.05; β₁=0.10, β₂=0.08; k=0.5`.
* Tuning via offline replays + online A/B.

### A.4.2 Review compression (cover dues with fewer tasks)

* Build `DueSet = { topics | now ≥ due_at or due_at within N days }`.
* Find minimal set of **candidate tasks** (lessons/reviews) whose **encompassing coverage** knocks out most of `DueSet`:

  * Greedy set cover: iteratively choose candidate with highest `covered_due_weight / minutes`.
  * Add a small penalty for **interference** if chosen tasks are in the same `interference_group` back‑to‑back.

### A.4.3 Task selection (maximize learning/minute)

1. **Candidate pool** = {compressed reviews} ∪ {frontier lessons unlocked by prereqs} ∪ {speed drills if fact fluency targets lagging}.
2. Score each by **Expected Learning Gain** / **Expected Minutes**:

   * `Gain = Σ_t (ΔS_t + λ·ΔR_t) + unlock_bonus − interference_penalty`
3. Return **3–5 choices** (agency), pre‑sorted; kid sees 1–2 big cards at a time.

### A.4.4 Diagnostic (find knowledge frontier fast)

* Build a **cover set** of key Topics per strand.
* Present probe items adaptively (binary‑search‑like on KG depth). Use **latency & consistency** to compute confidence.
* Mark ambiguous nodes as **provisionally passed** with a **trailing review** scheduled soon to confirm.

### A.4.5 Errors → micro‑reteach → retry

* On incorrect + slow latency: show **reteach snippet** (one worked example with manipulatives/audio), then **1–2 scaffolded items** before returning to normal flow.

### A.4.6 Interference control

* Don’t sequence confusables together (e.g., *b/d/p/q*, or similar word families). Enforce **cool‑down windows** between items in the same `interference_group`.

### A.4.7 Speed drills

* Generate **timed decks** from mastered or near‑mastered Topics (e.g., 0–10 addition facts, CVC blends).
* Targets: green ≥ 90% correct within target latency; yellow otherwise. Engine schedules more speed drills if `avg_latency_ms` is above threshold.

---

## A.5 Motivation model (kid‑friendly, opt‑in social)

### A.5.1 Daily loop (XP & time‑back)

* **Daily XP goal** ≈ minutes on‑task (e.g., 20–40 min / subject).
* Meeting the goal unlocks **“time‑back”** (choice time, creative project, story mode).
* **Streaks** for consecutive days meeting goals; missed day decays gently (keep kids in the game).

### A.5.2 Surfaces

* **Today**: 1) New Lesson, 2) Compressed Review, 3) Quick Quiz / Speed Drill.
* **Big buttons, few actions**: *Answer*, *Hear Again*, *Hint*, *Skip*.
* **Positive feedback** (confetti, fanfare) only for mastery‑meaningful events: streaks, difficult review clears, speed‑target hits.
* **Coach/Guide mode**: scripts for praise, “pull‑aside” prompts when frustration spikes, quick reteach cards.

### A.5.3 Personalization & fairness

* **Motivation profile** (Competition / Mastery / Social) toggles: leaderboard visibility, solo quests vs squads.
* **Private mode** by default for Pre‑K/K; opt‑in social later.

---

## A.6 Multimodal inputs

* **Speech**: TTS for instructions; STT for letter‑sound and decoding checks.

  * Scoring: phoneme‑level tolerance; accept near‑misses for early learners; flag background noise; allow **tap‑to‑answer** fallback.
* **Stylus tracing** (tablet): capture vector path; score on path tolerance, directionality, stroke order (soft), and time; show ghost path & haptic feedback.
* **Camera (optional)**: manipulatives evidence photos; never required for progress (privacy).

---

## A.7 APIs (engine & content)

**Task planning**

```
GET /plan?student_id=...&max=5
→ [
  { task_id, type, topic_ids, kp_ids, estimated_minutes, xp_value,
    modalities: ["voice","tap","trace"], reason: "compressed_review|frontier|speed_drill" }
]
```

**Submit evidence**

```
POST /evidence
{
  "student_id": "...",
  "task_id": "...",
  "events": [
    { "topic_id":"...", "kp_id":"...", "item_id":"...",
      "result":"correct|incorrect|partial|skipped",
      "latency_ms": 2800,
      "hints_used": 0,
      "input": { "voice_conf":0.83 } // or { "trace":[[x,y,t]...] }
    }
  ]
}
→ 200 OK { "updated_states":[{topic_id, due_at, stability, strength}], "xp_earned": 12 }
```

**Diagnostic**

```
POST /diagnostic/answer { student_id, probe_id, result, latency_ms }
→ { next_probe, provisional_mastery: {...} }
```

**Profiles & reports**

```
GET /profile?student_id=...
→ { mastery_summary, due_calendar, speed_flags, check_chart_status }

GET /report/weekly?student_id=...
→ { xp_by_day, streak, highlights, suggested_coach_actions }
```

**Content**

```
GET /topic/:id → { topic, kps, sample_items }
GET /game/:id → { io_schema, assets, scoring, engine_hooks }
```

---

## A.8 UX standards for early learners

* **Targets** ≥ 9–12mm; **2–4 choices** per screen; minimal text; always TTS.
* **Primary actions** bottom‑center; consistent ordering.
* **Stateful hints**: 1) re‑read instructions; 2) highlight relevant parts; 3) show worked example.
* **Error handling**: neutral tone, immediate reteach, retry.
* **Accessibility**: captions, contrast, color‑blind safe palettes, switch‑friendly scanning, bilingual audio.

---

## A.9 Analytics & success metrics

* **Learning/minute** (Δstability + Δstrength per minute).
* **Review compression ratio** (due items vs. tasks assigned).
* **Retention check** pass rates at 1/7/30/60‑day lags.
* **Speed targets hit** for fact fluency & decoding.
* **Frustration index** (consecutive errors + latency spikes + hint spam).
* **Engagement**: streak adherence, time‑back earned, voluntary practice.

---

## A.10 Privacy & policy (baseline)

* **COPPA/FERPA** compliant: parental consent; data minimization; export/delete on request.
* **Audio** processed to scores; raw audio stored only if guardian opts in for review/improvement; otherwise discard.
* **No third‑party ad SDKs.**
* **Role‑based visibility** (learner, guide, parent).
* **Offline tolerant** (queue evidence, reconcile on reconnect).

---

## A.11 Delivery plan (MVP → v1)

* **Weeks 0–4:** Content & Graph v0 (Pre‑K “slice”), engine `/plan` + `/evidence`, speech & tracing prototypes, Today view, coach panel.
* **Weeks 5–10:** Diagnostic v0, review compression, speed drills, check charts, weekly report, “time‑back”.
* **Weeks 11–16:** Reading & Math coverage to K, stylus handwriting, decodable reader, parent digest, data dashboards.
* **Weeks 17–24:** Grade 1 expansion, leaderboards (opt‑in), squads, A/B harness.

---

# Document B — Curriculum Primitives (Pre‑K → Grade 1)

> For each strand below: **Topics** (T) are small teachable skills. Each Topic has **Knowledge Points** (KPs): 2–4 micro‑objectives with a **worked example**, **practice item types**, and **reteach** snippet. The examples illustrate the pattern; authors will scale these out in the CMS.

---

## B.1 Reading (Pre‑K → Grade 1)

### Strands

1. **Oral Language & Concepts of Print**
2. **Phonological Awareness (PA)** (ear‑only: syllables → rhyme → phonemes)
3. **Alphabet Knowledge** (letter names & *reliable* sounds)
4. **Phonics & Decoding** (CVC → digraphs → blends; short vowels → long vowels)
5. **High‑Frequency Words** (“Sight Word Ladder” levels 1–5)
6. **Fluency & Prosody** (phrase reading, pacing)
7. **Comprehension** (retell, who/what/where; literal → simple inference)
8. **Writing & Handwriting** (pre‑writing strokes → letters → sentences)

---

### Pre‑K targets (examples)

**T1: Handle a book & track print (Pre‑K)**

* *KPs:*

  * KP1: Hold book upright; identify front/back.
  * KP2: Track left‑to‑right across a line of print (finger‑tracking with TTS).
* *Items:* `choice_image` (which is front of book?), `drag_drop` (move finger along arrow).
* *Reteach:* Short animation + coach script.

**T2: Syllable awareness (Pre‑K)**

* *KPs:* Clap syllables in common words (1–3 syllables).
* *Items:* `speak` (clap & say), `choice_audio` (which has 2 claps?).
* *Reteach:* Model 2 exemplar words; try again with picture support.

**T3: Rhyme recognition (Pre‑K)**

* *KPs:* Identify rhyming pairs; odd‑one‑out.
* *Items:* `choice_image` with TTS; `speak` (say two words that rhyme with *cat*).
* *Reteach:* Minimal pairs audio.

**T4: Letter names A–Z (uppercase) (Pre‑K/K)**

* *KPs:* 6‑letter mini‑sets; confuse‑set separation (b/d/p/q separate days).
* *Items:* `choice_text` (find A), `trace_path` (uppercase A), `speak` (name the letter).
* *Reteach:* Outline + ghost trace.

**T5: Core letter‑sounds (K)**

* *KPs:* /m s t a p n/ then /c f b i r o g l d/ (reliable sounds first).
* *Items:* `choice_image` (hear /m/ → choose **m**), `speak` (see **b** → say /b/).
* *Reteach:* Mouth position animation; minimal pairs.

**T6: Phoneme blending (K)**

* *KPs:* Blend 2‑phoneme → 3‑phoneme orally.
* *Items:* `choice_image` (hear /c/ /ă/ /t/ → pick **cat**), `speak` (say the word).
* *Reteach:* Stretch‑and‑snap routine.

**T7: CVC decoding: short *a* (K)**

* *KPs:* `at, am, an` word families; nonsense words included.
* *Items:* `choice_text`, `speak` (child reads; STT checks phonemes), `timer_speed_drill` (word list).
* *Reteach:* Blend with blocks, then re‑attempt.

**T8: High‑Frequency Words (Sight Word Ladder L1–L5)**

* *KPs:* 10–20 words per level; retrieval practice & phrase reading.
* *Items:* `choice_text`, `phrase_reading` (I see the \_\_\_), `timer_speed_drill`.
* *Word list source:* Use the list you provided (Levels 1–5). Seed initial decks with 20 words/level, rotate via SRS.
* *Reteach:* Trace word + say; build with letter tiles.

**T9: Decodable sentences (late K / Grade 1)**

* *KPs:* Read decodable texts with taught GPCs + limited HFW.
* *Items:* `phrase_reading`, `speak` (recorded read), `comprehension_choice` (who/what/where).
* *Targets:* 60–70 wpm on Level J by end of Grade 1 (stretch).

**T10: Digraphs & blends (Grade 1)**

* /sh, ch, th, wh, ck/ → initial/final blends (*st, bl, gr, nd*).
* *Items:* decoding lists, picture match, dictation (spell what you hear).
* *Reteach:* Visual anchor cards + mouth shape video.

**T11: Writing (K → 1)**

* *KPs:* Pencil grip & strokes; write name; compose simple sentence (K); 5‑sentence story (1).
* *Items:* `trace_path` letters; `drag_drop` word order; `short_answer` with dictation support.
* *Reteach:* Sky‑grass‑dirt letter lines; model sentence frames.

---

### Reading micro‑game ideas (engine‑driven I/O)

* **Phoneme Factory**: hear sounds, choose letters to “build” the word.
* **Picture Decoder**: hear segmented phonemes, pick the matching picture.
* **Rhyme Race**: drag pictures into “rhyme carts.”
* **Sight Word Sprint**: timed tap‑to‑read flash; phrase embedding (I *can* see…).
* **Story Mode**: short decodables with tappable glossary pictures; simple Q\&A after each page.

---

## B.2 Math (Pre‑K → Grade 1)

### Strands

1. **Counting & Cardinality** (forward/backward, subitizing, compare sets)
2. **Operations & Algebraic Thinking** (add/subtract within 5→10→20; fact families; patterns)
3. **Number & Base‑Ten** (compose/decompose 10; place value; expanded form)
4. **Geometry** (shapes & spatial)
5. **Measurement & Data** (length/weight compare; time; coins)

---

### Pre‑K examples

**T1: Count forward to 10 (Pre‑K)**

* *KPs:* 1–5 with manipulatives; 6–10 rote; **random‑start counting** (e.g., start at 3→8).
* *Items:* `tap_to_count` bears; `choice_audio` (what number comes next?).
* *Reteach:* One‑to‑one demonstration; reset pace.

**T2: Subitize 1–4 (Pre‑K)**

* *KPs:* Dot cards, fingers.
* *Items:* quick‑flash `choice_number` within 2 seconds; latency tracked for speed drill later.
* *Reteach:* Show structured dots (dice patterns).

**T3: Compare sets ≤5 (Pre‑K)**

* *Items:* picture trays; `choice_image` (which has more?), manipulatives activity with coach checklist.

**T4: Patterns AB/ABB/AAB (Pre‑K)**

* *Items:* `drag_drop` continue pattern; create pattern with blocks (photo evidence).

**T5: 2D shapes (Pre‑K)**

* *KPs:* name circle/square/triangle/rectangle; position words (in, on, under, next to).

---

### Kindergarten examples

**T6: Count to 20 forward & backward (K)**

* *KPs:* **random‑start counting** anywhere 0–20; backward from random start ≤20.
* *Items:* `timer_speed_drill` (10 prompts), `speak` (count aloud; coach check).

**T7: Add & subtract within 10 (K)**

* *KPs:* join/separate with objects; equations (3+2, 7−4); story problems.
* *Items:* `tap_to_count`, `drag_drop` (ten‑frames), `choice_text`.
* *Reteach:* Ten‑frame demo + re‑attempt.

**T8: +0, +1, +2, +3 facts (K → 1)**

* *Items:* `timer_speed_drill` with mixed facts; targets 6s then 3s response per item.
* *Reteach:* Counting on; near‑doubles strategy.

**T9: Shapes (sort & identify 10 shapes) (K)**

* *Items:* `choice_image` and physical sort task (photo evidence).

**T10: Skip counting (K)**

* *KPs:* by 2s, 5s, 10s, and **25s** to 100.
* *Items:* `timer_speed_drill`; `missing_number` number lines.

**T11: Compose/decompose numbers 11–19 (K)**

* *Items:* `drag_drop` tens & ones; read/write teen numbers.

---

### Grade 1 examples

**T12: Add/Subtract within 20 (1)**

* *Items:* `timer_speed_drill`; word problems; number bonds; make‑10 strategy.
* *Targets:* 35 correct per minute on single‑op drills (stretch goal).

**T13: Place value & expanded form (1)**

* *Items:* `drag_drop` base‑ten blocks; `short_answer` expanded form (e.g., 324 → 300 + 20 + 4).

**T14: Time to the minute (1)**

* *Items:* interactive analog clock; set time; read time.
* *Reteach:* “hour hand short, minute hand long” visual mnemonics.

**T15: Coins & bills (1)**

* *Items:* identify value; count mixed coins; make given amount.

**T16: Early multiplication & division (1, intro only)**

* *KPs:* repeated addition via equal groups; sharing equally (conceptual division).
* *Items:* `drag_drop` into groups; `choice_number` arrays.
* *Note:* Facts tables proper can begin in Grade 2; here it’s conceptual readiness.

### Progression: Zero Knowledge → Grade 1 Check Chart

**Goal.** Provide a stage-coded, type-safe ladder from the first math exposures through mastery of the Grade 1 check chart. Each Topic uses the shared schema (Topic + Knowledge Points) and the new `stage_code` enumerations consumed by the engine, authoring tools, and reports.

#### Stage codes

| Stage Code | Label | Grade Band | Entry Criteria | Exit / Unlock Signal | Check Chart Alignment |
| --- | --- | --- | --- | --- | --- |
| `M0_FOUNDATIONS` | Math Foundations | Pre-K readiness | Diagnostic < 50% on one-to-one ≤5 or comparison probes | Strength ≥ 0.7 on `MA-FOUND-*` topics plus coach confirmation | New readiness tags (see Pre-K foundations in **B.4**) |
| `M1_PREK_CORE` | Pre-K Core (to 10) | Pre-K | Stage M0 exit or diagnostic pass on one-to-one ≤5 | `MA-COUNT-10`, `MA-CARD-10`, `MA-NUMERAL-0-10` strength ≥ 0.7 with on-target latency | Pre-K check chart (counting, numerals, simple operations) |
| `M2_PREK_STRETCH` | Pre-K Stretch (to 20) | Pre-K | Stage M1 exit | Mastery on `MA-COUNT-20`, `MA-ADD-10`, fact families; average latency ≤ 6s | Pre-K check chart (20 counting, facts ±≤10, shapes/patterns) |
| `M3_K_CORE` | Kindergarten Core | Kindergarten | Stage M2 exit or diagnostic pass on addition/subtraction within 10 | Mastery on operations to 20, skip counting, place value to 100 | Kindergarten math check chart |
| `M4_G1_CORE` | Grade 1 Core | Grade 1 | Stage M3 exit + diagnostic probes on place value/time/coins | Mastery on `MA-PLACE-120`, `MA-WORDPROB-20`, `MA-SPEED-ADD/SUB-20`, measurement, time, geometry | Grade 1 math check chart |

```ts
export const MATH_STAGE_CODES = [
  'M0_FOUNDATIONS',
  'M1_PREK_CORE',
  'M2_PREK_STRETCH',
  'M3_K_CORE',
  'M4_G1_CORE',
] as const;

export type MathStageCode = (typeof MATH_STAGE_CODES)[number];
```

#### Stage M0 — Math Foundations (Pre-K entry)

Learners are building routines for attention, matching, and one-to-one correspondence. Sessions stay ≤ 2 minutes with heavy coach presence.

| Topic ID | Title | Strand | Summary | Prereqs | Check Chart Tags |
| --- | --- | --- | --- | --- | --- |
| `MA-FOUND-MATCH` | Match & sort objects | Foundations | Sort by attribute and build same-sized sets up to 3 | — | `I can match sets up to 3` |
| `MA-FOUND-ONE2ONE` | One-to-one counting to 5 | Counting & Cardinality | Point-count objects to 5 with stable order words | `MA-FOUND-MATCH` | `I can count objects to 5` |
| `MA-FOUND-SUBITIZE-3` | Subitize 1–3 | Counting & Cardinality | Instantly recognize quantities 1–3 | `MA-FOUND-MATCH` | `I can instantly see groups up to 3` |
| `MA-FOUND-COMPARE-3` | Compare sets ≤3 | Counting & Cardinality | Use more/less/same with small sets | `MA-FOUND-ONE2ONE` | `I can tell which group has more (≤3)` |
| `MA-FOUND-POSITION` | Spatial language (in/on/under) | Geometry | Use positional words with shapes/manipulatives | — | `I can use math position words` |

**Knowledge Points**

- `MA-FOUND-MATCH`: `MA-FOUND-MATCH-K1` sort objects by one attribute (≤4 items); `MA-FOUND-MATCH-K2` match two sets with the same quantity (1–3) using one-to-one moves.
- `MA-FOUND-ONE2ONE`: `MA-FOUND-ONE2ONE-K1` point-count 1–3 with finger taps; `MA-FOUND-ONE2ONE-K2` count up to 5 and verbalize the last number as the total.
- `MA-FOUND-SUBITIZE-3`: `MA-FOUND-SUBITIZE-3-K1` identify dot patterns flashed ≤2s; `MA-FOUND-SUBITIZE-3-K2` match a spoken number 1–3 to a flashed pattern.
- `MA-FOUND-COMPARE-3`: `MA-FOUND-COMPARE-3-K1` state which set has more/fewer (≤3); `MA-FOUND-COMPARE-3-K2` build a set that is “one more” or “one fewer.”
- `MA-FOUND-POSITION`: `MA-FOUND-POSITION-K1` follow positional instructions with shapes; `MA-FOUND-POSITION-K2` describe positions using visuals and words.

#### Stage M1 — Pre-K Core (counting to 10)

Focus on stable counting, numeral recognition, and first operations. Lessons stay playful with manipulatives and quick audio prompts.

| Topic ID | Title | Strand | Summary | Prereqs | Check Chart Tags |
| --- | --- | --- | --- | --- | --- |
| `MA-COUNT-10` | Count to 10 from any start | Counting & Cardinality | Count objects/orally 0–10 with random starts | `MA-FOUND-ONE2ONE` | `I can count to 10 and show numbers with objects` |
| `MA-CARD-10` | Cardinality ≤10 | Counting & Cardinality | Use last number to state “how many” up to 10 | `MA-COUNT-10` | `I can count and tell how many` |
| `MA-NUMERAL-0-10` | Numerals 0–10 | Number & Base-Ten | Match numerals to sets and form digits | `MA-COUNT-10` | `I can read and write numerals 0–10` |
| `MA-COMP-10` | Compare numbers ≤10 | Counting & Cardinality | Compare sets/numerals using >, <, = | `MA-CARD-10` | `I can compare numbers to 10` |
| `MA-SUBITIZE-1-4` | Subitize 1–4 | Counting & Cardinality | Instant recognition of 1–4 | `MA-FOUND-SUBITIZE-3` | `I can instantly see groups up to 4` |
| `MA-PATTERN-AB` | Extend simple patterns | Operations & Algebraic Thinking | Continue/create AB and ABB patterns | `MA-FOUND-MATCH` | `I can make simple patterns` |
| `MA-ADD-5` | Add within 5 | Operations & Algebraic Thinking | Join sets ≤5 with objects and equations | `MA-CARD-10`, `MA-SUBITIZE-1-4` | `I can add and subtract within 5` |
| `MA-SUB-5` | Subtract within 5 | Operations & Algebraic Thinking | Separate sets ≤5 and relate to unknown addends | `MA-CARD-10`, `MA-SUBITIZE-1-4` | `I can add and subtract within 5` |
| `MA-SHAPES-2D-BASICS` | Describe basic 2D shapes | Geometry | Name circle/square/triangle/rectangle & attributes | `MA-FOUND-POSITION` | `I can describe basic 2D shapes` |
| `MA-MEASURE-COMPARE` | Compare length/weight | Measurement & Data | Use words longer/shorter, heavier/lighter | `MA-FOUND-COMPARE-3` | `I can compare length and weight with words` |

**Knowledge Points**

- `MA-COUNT-10`: `MA-COUNT-10-K1` count objects 0–10 with manipulatives; `MA-COUNT-10-K2` count from random start ≤10 and back to 0.
- `MA-CARD-10`: `MA-CARD-10-K1` state the total after counting ≤10; `MA-CARD-10-K2` build a set that matches a numeral ≤10.
- `MA-NUMERAL-0-10`: `MA-NUMERAL-0-10-K1` identify numerals presented in mixed order; `MA-NUMERAL-0-10-K2` form/write digits with tracing scaffold.
- `MA-COMP-10`: `MA-COMP-10-K1` compare two sets ≤10 using manipulatives; `MA-COMP-10-K2` compare two numerals on a number line.
- `MA-SUBITIZE-1-4`: `MA-SUBITIZE-1-4-K1` quick-flash dot cards 1–4; `MA-SUBITIZE-1-4-K2` link subitized sets to numerals or word cards.
- `MA-PATTERN-AB`: `MA-PATTERN-AB-K1` continue AB/ABB strip patterns; `MA-PATTERN-AB-K2` build a repeating pattern with blocks and capture evidence.
- `MA-ADD-5`: `MA-ADD-5-K1` join sets with counters and record equations; `MA-ADD-5-K2` solve story problems with visuals ≤5.
- `MA-SUB-5`: `MA-SUB-5-K1` act out take-away stories ≤5; `MA-SUB-5-K2` use unknown addend to check subtraction.
- `MA-SHAPES-2D-BASICS`: `MA-SHAPES-2D-BASICS-K1` identify shapes regardless of orientation; `MA-SHAPES-2D-BASICS-K2` describe sides/corners using tactile tracing.
- `MA-MEASURE-COMPARE`: `MA-MEASURE-COMPARE-K1` compare two objects by length using direct comparison; `MA-MEASURE-COMPARE-K2` use nonstandard units (cubes) to report “taller by __ cubes.”

#### Stage M2 — Pre-K Stretch (counting to 20)

Students extend counting, fact fluency, and patterning to be fully check-chart ready before Kindergarten.

| Topic ID | Title | Strand | Summary | Prereqs | Check Chart Tags |
| --- | --- | --- | --- | --- | --- |
| `MA-COUNT-20` | Count to 20 | Counting & Cardinality | Count forward 0–20 with random starts | `MA-COUNT-10` | `I can count forward to 20 / backward from 20` |
| `MA-COUNT-BWD-20` | Count backward from 20 | Counting & Cardinality | Count down from random start ≤20 | `MA-COUNT-20` | `I can count forward to 20 / backward from 20` |
| `MA-NUMERAL-11-20` | Numerals 11–20 | Number & Base-Ten | Match teen numerals to representations | `MA-NUMERAL-0-10` | `I can count and tell how many` |
| `MA-CARD-20` | Cardinality ≤20 | Counting & Cardinality | Build, count, and state totals up to 20 | `MA-COUNT-20` | `I can count and tell how many` |
| `MA-COMP-20` | Compare numbers ≤20 | Counting & Cardinality | Compare sets/numerals up to 20 | `MA-CARD-20`, `MA-COMP-10` | `I can count and tell how many` |
| `MA-ADD-10` | Add within 10 | Operations & Algebraic Thinking | Combine sets ≤10, introduce make-10 | `MA-ADD-5` | `I can add / subtract single digit numbers` |
| `MA-SUB-10` | Subtract within 10 | Operations & Algebraic Thinking | Separate sets ≤10, count-on strategy | `MA-SUB-5` | `I can add / subtract single digit numbers` |
| `MA-FACTS-+0` | +0 facts | Fact Fluency | Automaticity for +0 within 10 | `MA-ADD-10` | `I know my +0/+1/+2/+3 facts` |
| `MA-FACTS-+1` | +1 facts | Fact Fluency | Automaticity for +1 within 10 | `MA-ADD-10` | `I know my +0/+1/+2/+3 facts` |
| `MA-FACTS-+2` | +2 facts | Fact Fluency | Automaticity for +2 within 10 | `MA-ADD-10` | `I know my +0/+1/+2/+3 facts` |
| `MA-FACTS-+3` | +3 facts | Fact Fluency | Automaticity for +3 within 10 | `MA-ADD-10` | `I know my +0/+1/+2/+3 facts` |
| `MA-PATTERN-ABC` | Extend complex patterns | Operations & Algebraic Thinking | ABC, AAB, ABB patterns | `MA-PATTERN-AB` | `I can create AB/ABC/ABCD patterns` |
| `MA-SHAPES-10` | Identify/sort 10 shapes | Geometry | 2D and 3D shape names & attributes | `MA-SHAPES-2D-BASICS` | `I can sort and identify 10 shapes` |
| `MA-MEASURE-LENGTH-COMP` | Compare length (indirect) | Measurement & Data | Use indirect comparison + nonstandard units | `MA-MEASURE-COMPARE` | `I can compare length and weight with words` |
| `MA-DATA-SORT-3` | Sort & classify data | Measurement & Data | Sort objects into ≤3 categories and count | `MA-FOUND-MATCH` | `I can count and tell how many` |

**Knowledge Points**

- `MA-COUNT-20`: `MA-COUNT-20-K1` count 0–20 with tens frame support; `MA-COUNT-20-K2` count from random start 5–20 without visuals.
- `MA-COUNT-BWD-20`: `MA-COUNT-BWD-20-K1` count back from ≤10; `MA-COUNT-BWD-20-K2` count back from random start ≤20 with number line.
- `MA-NUMERAL-11-20`: `MA-NUMERAL-11-20-K1` match teen numerals to ten-frame cards; `MA-NUMERAL-11-20-K2` write/read teen numerals in mixed order.
- `MA-CARD-20`: `MA-CARD-20-K1` build sets to match teen numerals; `MA-CARD-20-K2` state “how many” after counting a teen set.
- `MA-COMP-20`: `MA-COMP-20-K1` compare two teen numbers using number line; `MA-COMP-20-K2` justify comparisons with tens frames.
- `MA-ADD-10`: `MA-ADD-10-K1` join sets up to 10 with manipulatives; `MA-ADD-10-K2` apply make-10 or count-on strategies in equations.
- `MA-SUB-10`: `MA-SUB-10-K1` separate sets ≤10; `MA-SUB-10-K2` represent subtraction as unknown addend.
- `MA-FACTS-+0`: `MA-FACTS-+0-K1` flashcard deck ±0 within 10; `MA-FACTS-+0-K2` speed drill ≤6s average latency.
- `MA-FACTS-+1`: `MA-FACTS-+1-K1` flashcards +1; `MA-FACTS-+1-K2` apply near-doubles to +1.
- `MA-FACTS-+2`: `MA-FACTS-+2-K1` flashcards +2; `MA-FACTS-+2-K2` apply make-10 bridging for +2.
- `MA-FACTS-+3`: `MA-FACTS-+3-K1` flashcards +3; `MA-FACTS-+3-K2` use double +1 strategy.
- `MA-PATTERN-ABC`: `MA-PATTERN-ABC-K1` extend ABC patterns; `MA-PATTERN-ABC-K2` design a pattern with at least three elements and label it.
- `MA-SHAPES-10`: `MA-SHAPES-10-K1` identify/pronounce shape names; `MA-SHAPES-10-K2` sort shapes by attribute and explain the rule.
- `MA-MEASURE-LENGTH-COMP`: `MA-MEASURE-LENGTH-COMP-K1` use string to compare lengths indirectly; `MA-MEASURE-LENGTH-COMP-K2` measure using repeated nonstandard units.
- `MA-DATA-SORT-3`: `MA-DATA-SORT-3-K1` sort a collection into labeled categories; `MA-DATA-SORT-3-K2` count each group and answer “which has more/fewer?”

#### Stage M3 — Kindergarten Core

Learners consolidate Kindergarten standards: operations within 20, place value foundations, measurement, and data.

| Topic ID | Title | Strand | Summary | Prereqs | Check Chart Tags |
| --- | --- | --- | --- | --- | --- |
| `MA-COUNT-100` | Count to 100 | Counting & Cardinality | Count by ones to 100 | `MA-COUNT-20` | `I can count to 100` |
| `MA-SKIP-2/5/10/25` | Skip counting | Counting & Cardinality | Skip count by 2s/5s/10s/25s to 100 | `MA-COUNT-100` | `I can skip count by 2s, 5s, 10s, 25s` |
| `MA-PLACE-TEENS` | Compose/decompose 11–19 | Number & Base-Ten | Represent 10 + ones | `MA-CARD-20`, `MA-ADD-10` | `I can decompose teen numbers into tens and ones` |
| `MA-PLACE-2DIGIT` | Tens & ones to 99 | Number & Base-Ten | Represent two-digit numbers with base-ten blocks | `MA-PLACE-TEENS` | `I can compare and order numbers up to 100` |
| `MA-ADD-20` | Add within 20 | Operations & Algebraic Thinking | Make-10, doubles, decomposing | `MA-ADD-10`, `MA-FACTS-+3` | `I can add and subtract numbers 0–20` |
| `MA-SUB-20` | Subtract within 20 | Operations & Algebraic Thinking | Count-on, decomposition, inverse | `MA-SUB-10`, `MA-FACTS-+3` | `I can add and subtract numbers 0–20` |
| `MA-FACTS-0-10` | Fluency 0–10 | Fact Fluency | Mixed ± facts speed targets | `MA-FACTS-+3` | `I know my 0–10 facts in 6s → 3s` |
| `MA-COMP-100` | Compare numbers ≤100 | Number & Base-Ten | Compare two-digit numbers | `MA-PLACE-2DIGIT` | `I can compare and order numbers up to 100` |
| `MA-ORDER-100` | Order numbers ≤100 | Number & Base-Ten | Order 3+ numbers, locate on number line | `MA-COMP-100` | `I can compare and order numbers up to 100` |
| `MA-MEASURE-LENGTH-UNIT` | Measure length with units | Measurement & Data | Use nonstandard then standard units | `MA-MEASURE-LENGTH-COMP` | `I can measure and compare lengths using units` |
| `MA-TIME-HALF` | Tell time to hour/half hour | Measurement & Data | Read analog/digital clocks hour/half hour | `MA-COUNT-100` | `I can tell time to the half hour and identify coins` |
| `MA-MONEY-INTRO` | Coins & bills basics | Measurement & Data | Identify pennies, nickels, dimes, quarters, $1 | `MA-COUNT-10`, `MA-CARD-20` | `I can tell time to the half hour and identify coins` |
| `MA-DATA-TALLY` | Tally & picture graphs | Measurement & Data | Collect data, tally, make picture graph | `MA-DATA-SORT-3` | `I can collect and graph data` |
| `MA-GEO-3D-BUILD` | Compose simple 3D shapes | Geometry | Build/pronounce cube, sphere, cone, cylinder | `MA-SHAPES-10` | `I can build and describe 3D shapes` |

**Knowledge Points**

- `MA-COUNT-100`: `MA-COUNT-100-K1` count 0–100 with hundred chart; `MA-COUNT-100-K2` count from random start ≤100 without chart.
- `MA-SKIP-2/5/10/25`: `MA-SKIP-2/5/10/25-K1` skip count by 2s/5s/10s; `MA-SKIP-2/5/10/25-K2` skip count by 25s with supportive visuals.
- `MA-PLACE-TEENS`: `MA-PLACE-TEENS-K1` show teen numbers as 10 + ones using rods/units; `MA-PLACE-TEENS-K2` write teen numbers in expanded form and equations.
- `MA-PLACE-2DIGIT`: `MA-PLACE-2DIGIT-K1` build two-digit numbers with base-ten blocks; `MA-PLACE-2DIGIT-K2` write expanded form and compare tens/ones.
- `MA-ADD-20`: `MA-ADD-20-K1` solve with manipulatives/number line; `MA-ADD-20-K2` apply make-10 and doubles strategies.
- `MA-SUB-20`: `MA-SUB-20-K1` model subtraction with number bonds; `MA-SUB-20-K2` solve unknown-addend stories within 20.
- `MA-FACTS-0-10`: `MA-FACTS-0-10-K1` complete 20 facts under 6s average; `MA-FACTS-0-10-K2` complete 20 facts under 3s average.
- `MA-COMP-100`: `MA-COMP-100-K1` compare two-digit numbers using place value reasoning; `MA-COMP-100-K2` justify comparisons with tens/ones evidence.
- `MA-ORDER-100`: `MA-ORDER-100-K1` place numbers on number line 0–100; `MA-ORDER-100-K2` order three numbers ascending/descending.
- `MA-MEASURE-LENGTH-UNIT`: `MA-MEASURE-LENGTH-UNIT-K1` measure with repeated units (cubes); `MA-MEASURE-LENGTH-UNIT-K2` measure with rulers to the inch and explain measurement.
- `MA-TIME-HALF`: `MA-TIME-HALF-K1` read analog clocks to hour/half hour; `MA-TIME-HALF-K2` match digital times and set clock to requested time.
- `MA-MONEY-INTRO`: `MA-MONEY-INTRO-K1` identify coin names/values; `MA-MONEY-INTRO-K2` count mixed coins to 50¢.
- `MA-DATA-TALLY`: `MA-DATA-TALLY-K1` record tally marks from collected data; `MA-DATA-TALLY-K2` interpret a picture graph with three categories.
- `MA-GEO-3D-BUILD`: `MA-GEO-3D-BUILD-K1` name 3D shapes and attributes; `MA-GEO-3D-BUILD-K2` compose a new shape from two shapes (e.g., prisms).

#### Stage M4 — Grade 1 Core

Learners aim to pass the Grade 1 math check chart: fact fluency, place value to 120, measurement, money, time, data, and geometry.

| Topic ID | Title | Strand | Summary | Prereqs | Check Chart Tags |
| --- | --- | --- | --- | --- | --- |
| `MA-PLACE-120` | Numbers to 120 | Number & Base-Ten | Read/write numbers to 120, understand tens & ones | `MA-PLACE-2DIGIT` | `I can read, write, and show numbers to 120` |
| `MA-COMP-120` | Compare/order to 120 | Number & Base-Ten | Compare/order three numbers to 120 | `MA-PLACE-120` | `I can read, write, and show numbers to 120` |
| `MA-ADD-2DIGIT-100` | Add within 100 | Operations & Algebraic Thinking | Add 2-digit + 2-digit using place value/regrouping | `MA-ADD-20`, `MA-PLACE-120` | `I can add and subtract 2-digit numbers` |
| `MA-SUB-2DIGIT-100` | Subtract within 100 | Operations & Algebraic Thinking | Subtract 2-digit numbers using strategies | `MA-SUB-20`, `MA-PLACE-120` | `I can add and subtract 2-digit numbers` |
| `MA-WORDPROB-20` | Word problems within 20 | Operations & Algebraic Thinking | Represent/solve all problem types within 20 | `MA-ADD-20`, `MA-SUB-20` | `I can solve word problems within 20` |
| `MA-EQ-TRUE-FALSE` | True/false equations | Operations & Algebraic Thinking | Determine if equations are true; balance both sides | `MA-ADD-20`, `MA-SUB-20` | `I can decide if equations are true or false` |
| `MA-SPEED-ADD/SUB-20` | Fact fluency sprint | Fact Fluency | 35 mixed facts/min with ≥90% accuracy | `MA-FACTS-0-10` | `I can answer 35 add/sub facts in a minute` |
| `MA-TIME-MIN` | Time to the minute | Measurement & Data | Read/write time to the minute, elapsed time ≤1 hr | `MA-TIME-HALF`, `MA-COUNT-100` | `I can tell time to the minute` |
| `MA-MONEY-1` | Count money to $1 | Measurement & Data | Count coins/bills to $1 and make change | `MA-MONEY-INTRO`, `MA-ADD-20` | `I can count coins up to $1.00 and make change` |
| `MA-MEASURE-LENGTH-TOOLS` | Measure & compare lengths | Measurement & Data | Measure with rulers (in/cm) and compare/record | `MA-MEASURE-LENGTH-UNIT` | `I can measure lengths and show my data` |
| `MA-DATA-CHART-1` | Organize & interpret data | Measurement & Data | Bar/picture graphs with up to four categories | `MA-DATA-TALLY` | `I can measure lengths and show my data` |
| `MA-GEO-ATTR-1` | Describe/compose shapes | Geometry | Attributes of 2D/3D shapes, halves/quarters | `MA-GEO-3D-BUILD` | `I can describe and compose shapes with equal shares` |
| `MA-FRACTION-HALF-FOURTHS` | Partition shapes | Geometry | Halves and fourths as equal shares | `MA-GEO-ATTR-1` | `I can describe and compose shapes with equal shares` |
| `MA-WORDPROB-DATA` | Data word problems | Measurement & Data | Solve add/sub problems using tables/graphs | `MA-DATA-CHART-1`, `MA-WORDPROB-20` | `I can measure lengths and show my data` |

**Knowledge Points**

- `MA-PLACE-120`: `MA-PLACE-120-K1` read/write numbers to 120 in standard and expanded form; `MA-PLACE-120-K2` model tens/ones with base-ten blocks or number line jumps.
- `MA-COMP-120`: `MA-COMP-120-K1` compare numbers to 120 using >, <, =; `MA-COMP-120-K2` order three numbers and justify using place value.
- `MA-ADD-2DIGIT-100`: `MA-ADD-2DIGIT-100-K1` add 2-digit + 1-digit without regrouping using strategies; `MA-ADD-2DIGIT-100-K2` add 2-digit + 2-digit with regrouping using base-ten representation then algorithm.
- `MA-SUB-2DIGIT-100`: `MA-SUB-2DIGIT-100-K1` subtract 2-digit numbers without regrouping using number line; `MA-SUB-2DIGIT-100-K2` subtract with regrouping using place value models.
- `MA-WORDPROB-20`: `MA-WORDPROB-20-K1` translate problems into equations with unknowns; `MA-WORDPROB-20-K2` solve start/change/result unknown problems with explanations.
- `MA-EQ-TRUE-FALSE`: `MA-EQ-TRUE-FALSE-K1` classify true/false equations (e.g., 12 = 7 + 5); `MA-EQ-TRUE-FALSE-K2` create a true equation to match a target using two operations.
- `MA-SPEED-ADD/SUB-20`: `MA-SPEED-ADD/SUB-20-K1` 35 facts/min accuracy ≥90% for two consecutive sessions; `MA-SPEED-ADD/SUB-20-K2` maintain speed at a 30-day review interval.
- `MA-TIME-MIN`: `MA-TIME-MIN-K1` read and write times to the minute; `MA-TIME-MIN-K2` solve elapsed time within one hour using a number line strategy.
- `MA-MONEY-1`: `MA-MONEY-1-K1` count mixed coins/bills to $1.00; `MA-MONEY-1-K2` make change from $1.00 using the least coins.
- `MA-MEASURE-LENGTH-TOOLS`: `MA-MEASURE-LENGTH-TOOLS-K1` measure and record lengths with inches/centimeters; `MA-MEASURE-LENGTH-TOOLS-K2` compare two measurements and express the difference.
- `MA-DATA-CHART-1`: `MA-DATA-CHART-1-K1` build a bar graph from measured data; `MA-DATA-CHART-1-K2` answer comparison questions using the graph.
- `MA-GEO-ATTR-1`: `MA-GEO-ATTR-1-K1` describe shapes by sides/vertices/faces; `MA-GEO-ATTR-1-K2` compose shapes and partition into halves/quarters.
- `MA-FRACTION-HALF-FOURTHS`: `MA-FRACTION-HALF-FOURTHS-K1` partition shapes into equal halves/quarters; `MA-FRACTION-HALF-FOURTHS-K2` identify unit fractions in word problems.
- `MA-WORDPROB-DATA`: `MA-WORDPROB-DATA-K1` interpret data tables to form equations; `MA-WORDPROB-DATA-K2` solve two-step data problems (e.g., “How many more?”).

#### Diagnostics & review hooks

* **Stage diagnostics:** 6–8 item probes target `MA-FOUND-ONE2ONE`, `MA-COUNT-10`, `MA-ADD-10`, `MA-ADD-20`, and `MA-PLACE-120` to route learners to the correct stage. Probes mix modalities (tap, speak, drag) and log latency for confidence.
* **Prereq fallbacks:** failing two consecutive KPs inside a stage schedules the strongest prerequisite Topic from the prior stage plus a reteach micro-lesson tagged with the same `stage_code`.
* **Encompassing weights:** higher-stage Topics encompass prerequisite practice (e.g., `MA-WORDPROB-20` encompasses `MA-ADD-20` weight 0.4 and `MA-SUB-20` weight 0.4) to support compressed review while respecting `interference_group` limits.
* **Speed drill gating:** `MA-SPEED-ADD/SUB-20` unlocks when `MA-FACTS-0-10` strength ≥ 0.8 and average latency ≤ 6s; the engine pauses drills if strength drops below 0.6 during review.
* **Coach prompts:** Stage transitions trigger adult-facing guidance (celebrate completion, introduce new manipulatives) surfaced via the dashboard using the same `stage_code` metadata.

#### Stage delivery roadmap (content × engine × UX)

| Stage | Content deliverables | Engine & data | Coach/family surfaces | QA & field tests |
| --- | --- | --- | --- | --- |
| `M0_FOUNDATIONS` | 5 Topics with ≥ 8 items/KP; manipulatives scripts for matching/counting; picture asset kit | Diagnostic probes for one-to-one ≤5; evidence capture for coach-observed items (photo/checkbox) | Coach-only cards for readiness statements; setup tips for manipulatives; daily micro-play prompts | 8–10 learner pilots (2 mins max sessions) capturing mis-taps & audio noise; ensure coach evidence logging is usable |
| `M1_PREK_CORE` | 10 Topics (counting, cardinality, numerals, compare, patterns, shapes, measurement); ten-frame assets; printable numeral cards | Review compression config enabling implicit credit from `MA-COUNT-10` → `MA-COUNT-20`; ensure `stage_code` travel in `/plan` payloads | Check chart tiles unlock sequentially; daily summary email shows “Core in progress” vs “Ready for Stretch” | Kid usability with manipulatives + tablet; latency threshold tuning for subitizing (≤2s) |
| `M2_PREK_STRETCH` | 14 Topics (teens numbers, ± within 10, fact ladders, complex patterns, data sort); speed drill decks | Speed drill scheduler tuning, fact mastery thresholds (6s → 3s); stage-specific diagnostic confirmers | Parent digest highlights upcoming Kindergarten readiness; motivational quests unlock (e.g., “Shape Master”) | Pilot speed drills with headset to capture voice/excitement; review mixed-modality fatigue |
| `M3_K_CORE` | 13 Topics (skip count, place value, ±20, measurement, time half-hour, money ID, data, 3D shapes); story problems set | Stage-aware review compression to prefer encompassing lessons (e.g., `MA-ADD-20`); unlock `MA-SPEED-ADD/SUB-20` gating rules | Coach dashboard shows “K Core checklist” progress; Check chart auto-tags when speed thresholds hit | Classroom pilots with 12–15 learners; capture confusion around clock interface and money visuals |
| `M4_G1_CORE` | 13 Topics (place value 120, 2-digit ops, data problems, true/false, fractions, time to minute, money to $1); word problem scripts | Extend `/plan` to bias mixed operations tasks; 30-day retention checks for `MA-SPEED-ADD/SUB-20`; stage_code filters in `/report` | Parent report highlights “Grade 1 mastery”; celebration copy & badges triggered when `stage_code` transitions complete | A/B test reteach variants for regrouping; audio scoring tolerance for word problems; evaluate cognitive load via task logs |

**Implementation checklist**

1. **Schemas**
   * Add `stage_code?: MathStageCode` to Topic schema in `packages/schemas` with domain-specific enums; allow `null` for non-math domains until reading stages are defined.
   * Add `CheckChart` DTO + JSON Schema referencing `stage_code`, `coach_only`, and thresholds.
2. **Content tooling**
   * Update authoring spreadsheets/templates to include `stage_code`, `coach_only`, and `threshold` columns.
   * Generate starter CSV/JSON for each stage (Topics, KPs, Item templates).
3. **Engine**
   * Ensure `/plan` and `/diagnostic` responses include `stage_code` for tasks and topics to drive UI gating.
   * Add stage-aware throttles (e.g., limit new lesson unlocks per session in `M0`/`M1`).
4. **Coach UX & reports**
   * Display stage progress, readiness prompts, and check chart state in Today/Reports surfaces.
   * Highlight `coach_only` statements awaiting evidence.
5. **Analytics**
   * Track time-to-stage-completion, stage regressions, and latency distribution per stage for pacing refinements.
6. **QA**
   * Build scripted walkthroughs per stage with expected task sequencing, reteach triggers, and check chart unlock order.

---

### Math micro‑game ideas

* **Smoothie Shop** (Khan‑style): add ingredients to match a recipe; supports addition and measurement.
* **Ten‑Frame Fill**: drag counters to complete to 10 (bridge to make‑10 strategy).
* **Number Line Ninja**: jumps by 2s, 5s, 10s, 25s; avoid wrong landings.
* **Clocksmith**: set clock to times; race mode for fluency.
* **Shape Sorter**: drop shapes into labeled bins; stretch: compose pictures from shapes.

---

## B.3 Knowledge graph sketch & samples

### Graph rules

* **Prereq edges** unlock progression (e.g., “Blend 3 phonemes” → “Read CVC”).
* **Encompassing edges** grant **implicit credit**:

  * “Read decodable sentence” encompasses: CVC decoding (w=0.5), taught HFW (w=0.3), basic punctuation (w=0.2).
  * “Add within 10 using ten‑frames” encompasses: subitizing (w=0.2), counting on (w=0.4).

### Sample JSON (Reading — CVC short *a*)

```json
{
  "topic": {
    "id": "RD-CVC-A",
    "title": "Decode CVC words with short a",
    "domain": "reading",
    "strand": "Phonics",
    "grade_band": "K",
    "prereqs": [{"topic_id": "RD-BLEND-3PH", "gate": "AND"}, {"topic_id": "RD-LS-SET1", "gate": "AND"}],
    "encompassed_by": [{"parent_topic_id": "RD-DEC-SENT-A", "weight": 0.5}],
    "interference_group": "CVC-short-vowels",
    "expected_time_sec": 240,
    "check_chart_tags": ["I can read CVC words"]
  },
  "kps": [
    { "id": "RD-CVC-A-K1", "objective": "Blend and read -at words",
      "worked_example": ["Sound out c-a-t", "Blend to say 'cat'"],
      "practice_items": [
        {"type":"choice_text", "prompt":"Read and tap", "difficulty":2, "randomization":{}},
        {"type":"speak", "prompt":"Read this word aloud: 'mat'", "rubric":{"phoneme_match":true}}
      ],
      "reteach_snippet":"Stretch sounds with blocks: c—a—t → cat",
      "expected_time_sec": 120
    }
  ]
}
```

### Sample JSON (Math — Add within 10)

```json
{
  "topic": {
    "id": "MA-ADD-10",
    "title": "Add within 10",
    "domain": "math",
    "strand": "Operations",
    "grade_band": "K",
    "prereqs": [{"topic_id":"MA-COUNT-20","gate":"AND"},{"topic_id":"MA-SUBITIZE-1-4","gate":"OR"}],
    "encompassed_by": [{"parent_topic_id":"MA-ADD-20","weight":0.6}],
    "interference_group": "single-digit-add",
    "expected_time_sec": 300,
    "check_chart_tags": ["I can add single digit numbers"]
  },
  "kps": [
    { "id":"MA-ADD-10-K1", "objective":"Join with objects (≤10)",
      "worked_example":["Put 3 bears, add 2 bears → count 5"],
      "practice_items":[
        {"type":"tap_to_count","prompt":"Add 4 + 3","time_estimate_ms":15000},
        {"type":"drag_drop","prompt":"Complete the ten-frame for 6+3"}
      ],
      "reteach_snippet":"Model 'counting on' from the larger addend"
    },
    { "id":"MA-ADD-10-K2", "objective":"+1 and +2 facts",
      "practice_items":[{"type":"timer_speed_drill","prompt":"+1 and +2 mix","time_estimate_ms":60000}]
    }
  ]
}
```

---

## B.4 “Check charts” (Pre‑K → Grade 1) mapped to Topics

> These are shown to adults and to kids in icon‑first form. The engine marks items **Ready**, **Practicing**, **Locked‑in** (spaced out), **Stretch**.

### Pre‑K — Reading & Storytelling

* **I know all of my letter names** → Topics: `RD-LN-UPPER`, `RD-LN-LOWER`
* **I know all of my letter sounds** → `RD-LS-SET1..SETN`
* **I know 40 Pre‑K sight words** → `RD-HFW-L1` (40‑word subset from your list)
* **I can identify beginning/middle/ending sounds** → `RD-PA-INIT`, `RD-PA-MED`, `RD-PA-FIN`
* **I can identify the beginning, middle, and end of a story** → `RD-COMP-SEQUENCE`
* **I can read CVC words** → `RD-CVC-A/E/I/O/U`
* **I can create my own Tonies character story** → `RD-WRITE-ORAL-STORY` (recorded narration + sequence pictures)

### Pre‑K — Writing & Fine Motor

* **I can draw a picture to tell a story** → `WR-DRAW-STORY`
* **I can make a sign that helps our class** → `WR-ENV-PRINT`
* **I can write my first name** → `WR-NAME`
* **I can use scissors to complete 4 challenges** → `FM-SCISSORS` (observational rubric)
* **I can complete a DIY project / create usable item** → `FM-MAKER-1`

### Pre‑K — Math

* **(Coach)** I can match sets up to 3 → `MA-FOUND-MATCH`
* **(Coach)** I can count objects to 5 → `MA-FOUND-ONE2ONE`
* **(Coach)** I can instantly see groups up to 3 → `MA-FOUND-SUBITIZE-3`
* **(Coach)** I can tell which group has more (≤3) → `MA-FOUND-COMPARE-3`
* **(Coach)** I can use math position words → `MA-FOUND-POSITION`
* **I can count to 10 and show numbers with objects** → `MA-COUNT-10`, `MA-CARD-10`
* **I can read and write numerals 0–10** → `MA-NUMERAL-0-10`
* **I can compare numbers to 10** → `MA-COMP-10`
* **I can instantly see groups up to 4** → `MA-SUBITIZE-1-4`
* **I can make simple patterns** → `MA-PATTERN-AB`
* **I can add and subtract within 5** → `MA-ADD-5`, `MA-SUB-5`
* **I can describe basic 2D shapes** → `MA-SHAPES-2D-BASICS`
* **I can compare length and weight with words** → `MA-MEASURE-COMPARE`
* **I can count forward to 20 / backward from 20** → `MA-COUNT-20`, `MA-COUNT-BWD-20`
* **I can count and tell how many** → `MA-CARD-20`
* **I can create AB/ABC/ABCD patterns** → `MA-PATTERN-AB`, `MA-PATTERN-ABC`
* **I can sort and identify 10 shapes** → `MA-SHAPES-10`
* **I can add and subtract single digit numbers** → `MA-ADD-10`, `MA-SUB-10`
* **I know my +0/+1/+2/+3 facts** → `MA-FACTS-+0`, `MA-FACTS-+1`, `MA-FACTS-+2`, `MA-FACTS-+3`
* **I can compare length using units and sort data** → `MA-MEASURE-LENGTH-COMP`, `MA-DATA-SORT-3`

### Kindergarten — Math

* **I can count to 100** → `MA-COUNT-100`
* **I can skip count by 2s, 5s, 10s, 25s** → `MA-SKIP-2/5/10/25`
* **I can decompose teen numbers into tens and ones** → `MA-PLACE-TEENS`
* **I can compare and order numbers up to 100** → `MA-PLACE-2DIGIT`, `MA-COMP-100`, `MA-ORDER-100`
* **I can add and subtract numbers 0–20** → `MA-ADD-20`, `MA-SUB-20`
* **I know my 0–10 facts in 6s → 3s** → `MA-FACTS-0-10`
* **I can measure and compare lengths using units** → `MA-MEASURE-LENGTH-UNIT`
* **I can tell time to the half hour and identify coins** → `MA-TIME-HALF`, `MA-MONEY-INTRO`
* **I can collect and graph data** → `MA-DATA-TALLY`
* **I can build and describe 3D shapes** → `MA-GEO-3D-BUILD`

### Kindergarten — Reading & Writing

* **Read 60 wpm at Level J (stretch for 1st)** → `RD-FLUENCY-J`
* **Identify nouns, proper nouns, verbs, adjectives** → `RD-GRAMMAR-BASICS`
* **Unlocked my second reading app** → Motivation tag on `RD-FLUENCY-LEVEL2`
* **Write sentences/handwriting milestones** → `WR-HANDWRITING-HERO L1..L10`, `WR-SENTENCE-5`, `WR-STORY-8+`

### Grade 1 — Reading & Writing

* **Independently read Level M at 70 wpm** → `RD-FLUENCY-M`
* **5‑sentence cursive letter** → `WR-CURSIVE-LETTER`
* **600 sight words** (long‑term ladder) → `RD-HFW-L1..L5..Lx`
* **Type 15 wpm @ 90%** → `WR-TYPING-15`

> The **Sight Word Ladder** uses the exact five‑level list you provided. We’ll seed L1..L5 decks from that list in the CMS and allow schools to customize.

---

### Grade 1 — Math

* **I can add and subtract 2-digit numbers** → `MA-ADD-2DIGIT-100`, `MA-SUB-2DIGIT-100`
* **I can solve word problems within 20** → `MA-WORDPROB-20`, `MA-WORDPROB-DATA`
* **I can answer 35 add/sub facts in a minute** → `MA-SPEED-ADD/SUB-20`
* **I can read, write, and show numbers to 120** → `MA-PLACE-120`, `MA-COMP-120`
* **I can tell time to the minute** → `MA-TIME-MIN`
* **I can count coins up to $1.00 and make change** → `MA-MONEY-1`
* **I can measure lengths and show my data** → `MA-MEASURE-LENGTH-TOOLS`, `MA-DATA-CHART-1`
* **I can describe and compose shapes with equal shares** → `MA-GEO-ATTR-1`, `MA-FRACTION-HALF-FOURTHS`
* **I can decide if equations are true or false** → `MA-EQ-TRUE-FALSE`

---

## B.5 Lesson & practice patterns (how each Topic is implemented)

Every Topic uses this **3‑part template** (duration 3–7 minutes):

1. **Teach (Worked Example)**

   * One clear example (audio + visuals; manipulatives for math; mouth‑shape animation for phonics).
   * Optional coach script shown to adult.

2. **Practice (2–8 Items)**

   * Mixture of item types targeting the KPs.
   * **Random‑start variants** (counting, alphabet recitation) to avoid rote.
   * **Speed items** sprinkled for near‑mastered facts/words, measured but not blocking.

3. **Reteach on Error**

   * Ultra‑short reteach snippet + 1–2 scaffolded retries.
   * If 2 reteaches in one session: engine schedules a **separate, simpler Topic** before returning (reduce frustration).

**Examples**

* *Reading—“Blend 3 phonemes”:*

  * Teach: “c—ă—t → cat” with blocks.
  * Practice: `choice_image` (sound then choose), `speak` (say the word), `timer_speed_drill` (5 blends in 20s).
  * Reteach: stretch & snap + minimal pairs.

* *Math—“Count backward from a random number ≤ 20”:*

  * Teach: model 12→0 on number line.
  * Practice: 8 prompts with different starts; include tap‑to‑count counters for support.
  * Reteach: reveal number line with highlighted steps; try again.

---

## B.6 Speed & mastery targets (defaults)

* **Reading**

  * CVC lists: ≥ 90% accurate; average latency ≤ 3.0s/word.
  * HFW decks: ≥ 95% accurate; ≤ 2.0s/word.
  * Fluency: Level J 60 wpm (K stretch), Level M 70 wpm (1st).

* **Math**

  * Subitizing 1–4: ≤ 2.0s; 90%+.
  * Single‑digit facts 0–10: 6s item target → 3s stretch; 90%+.
  * Speed drills trigger when accuracy ≥ 85% but latency above target.

The engine adapts intervals and inserts speed drills if latency is high despite accuracy.

---

## B.7 Content authoring conventions

* **Small Topics, 2–4 KPs**, \~15–25 items/KP (varied).
* **Time estimates** per item and lesson.
* **Edge weights** for Encompassing set by authors (0.2–0.8 typical).
* **Interference groups** assigned for confusables.
* **Observational rubrics** (✓/\~) for hands‑on tasks (scissors, manipulatives).
* **Media**: always supply TTS script; alt‑text; bilingual variants (where possible).
* **Decodables**: each introduces **one new GPC pattern**; limit HFW to taught decks.

---

## B.8 Example “game descriptor” (for an iPad mini‑game)

```json
{
  "game_id": "smoothie-shop-addition",
  "io_schema": {
    "input": [{"type":"drag_drop","role":"ingredient","count":3}],
    "output": [{"type":"result","fields":["correct","latency_ms","hints_used"]}]
  },
  "engine_hooks": {
    "map_topics": [{"topic_id":"MA-ADD-10","weight":1.0}],
    "item_generator": "add_within_10_recipe",
    "scoring": {"correct":1, "partial":0.5, "incorrect":0}
  },
  "ui": { "large_targets": true, "buttons": ["Hint","Hear Again","Skip","Answer"] }
}
```

---

## B.9 QA & field‑testing loop

* **Author preview harness** (play lesson; see planned intervals).
* **Kid testing** with think‑aloud; track mis‑taps, rage‑taps, and confusion points.
* **Engine replays** (offline) to tune memory parameters and encompassing weights.
* **A/B tests**: interleaving distance, reteach variants, hint tiers, speed thresholds.

---

### Done & ready to execute

* **Document A** gives engineering what to build (services, models, APIs, algorithms, UX, analytics, privacy).
* **Document B** gives content the primitives and patterns to begin authoring Pre‑K → Grade 1 Reading/Math, including how items are implemented and how “check charts” map to Topics.

If you want, I can turn these into:

* a **schema starter kit** (JSON Schemas + OpenAPI for the endpoints), and
* **authoring spreadsheets** (Topic/KP templates prefilled with 50 starter Topics per subject)
  so teams can begin seeding the CMS immediately.
