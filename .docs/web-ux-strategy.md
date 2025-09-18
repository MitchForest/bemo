# Bemo Web UX Strategy & Execution Plan

_Last updated: 2025-09-17_

## 1. Experience North Stars

- **Effortless kid flow**: 3-tap start, zero-reading modes, and clear motion cues keep Pre-K learners confident.
- **Guided adult orchestration**: Teachers and guardians always see “what matters now” with auto-prioritized actions.
- **Shared truth across personas**: Progress, goals, and evidence align across student, teacher, parent, and admin surfaces.
- **Motivation without pressure**: Soft gamification (XP, joy breaks, badges) reinforces intrinsic growth.
- **Adaptivity made legible**: Every plan, diagnostic, and knowledge graph view should explain _why_ the engine chose it.

## 2. Persona Jobs-To-Be-Done

| Persona | Primary Jobs | Signals of Success |
| --- | --- | --- |
| Student (Pre-K → G1) | Launch today’s plan, stay regulated, celebrate wins | <60s to start lesson, streak maintained, self-selected joy break |
| Teacher | Group learners, launch lessons, intervene quickly | Clear focus groups before morning bell, reteach kits delivered, 0 stuck students |
| Parent/Coach | Understand growth, cheer, plan routines | Weekly digest consumed, cheer sent, schedule consistency |
| Admin/Operator | Monitor networks, align curriculum, manage data | Health panel daily, cohort coverage, compliance exports |

## 3. Information Architecture Snapshot

```
root
├─ Student Hub
│  ├─ Today’s Journey (I-do / we-do / you-do)
│  ├─ Joy Breaks & Rewards
│  └─ Check Chart ladder (peek)
├─ Teacher Command Center
│  ├─ Live Cohort Pulse
│  ├─ Action Inbox
│  ├─ Lesson Blocks & Resources
│  └─ Learner Drill-in (impersonate)
├─ Parent Growth View
│  ├─ Highlights & ladders
│  ├─ Cheer scripts & routines
│  └─ Assessment calendar
└─ Admin Console
   ├─ Org hierarchy + SIS sync
   ├─ Health indicators
   └─ Knowledge graph tools
```

## 4. Flow Priorities

### Now (Sprint 1–2)
1. **Student morning launch**
   - Splash / avatar tap → daily plan → first activity
   - Accessible controls (audio replay, calm mode, skip)
   - Regulation micro-flow (breathing bubble, choose joy break)
2. **Teacher rapid triage**
   - “3 need attention” expands into plan + resources
   - Grouping view (drag learners into stations, send to teacher-led or independent)
   - One-click “Start adaptive check-in” with preview modal
3. **Knowledge graph clarity pass**
   - Badge nodes (core, stretch, review) + gate icons
   - Edge legends (prereq vs encompassed) and tooltips that show KP counts
   - Focus mode: filter by school/cohort/learner

### Next (Sprint 3–5)
4. Parent weekly digest inside app (mirrors email)
5. Admin placement orchestration (bulk entry assessment flow)
6. Student achievement stories (animated recap after session)

### Later (Stretch)
7. Cross-platform design tokens (web + iPad)
8. Joy economy settings (custom rewards per school)
9. Real-time collaboration (teacher + co-teacher notes)

## 5. Interaction & Visual Direction

- **Tone**: Warm glassmorphism, high contrast text, oversized CTAs (>48px), friendly emoji accents.
- **Input affordances**: Animated focus rings, breathing space, tactile shadows for drag/tap.
- **Motion**: Micro-entrances (fade/slide 160ms) and haptic analogs (scale 1.02) for kid surfaces; admin gets calmer transitions.
- **Adaptive transparency**: Inline chips (“Chosen because Maya’s latency +12% · due today”) across surfaces.
- **Accessibility**: WCAG 2.2 AA, text alternatives for audio, dark mode parity, keyboard nav on adult surfaces.

## 6. Component System

| Layer | Actions |
| --- | --- |
| Primitives | Extend `Chip`, `Button`, `Card` with size tokens, focus states, icon slots *(in progress — new dialog + button variants live)* |
| Patterns | Build reusable modules: `JourneySection`, `ActionCard`, `HealthMetric`, `JoyBreakPicker`, `PlanTimeline` *(JourneySection + JoyBreakPicker + MetricCard implemented in web app)* |
| Layout | Introduce `PageShell` per persona (header, tabs, CTA zone) |
| Feedback | Create `CelebrationModal`, `LoadingShimmer`, `EmptyState` variants |

Deliverables this cycle: add pattern components + storybook-like MDX showcase under `apps/web/src/components/patterns` (server-friendly).

## 7. Data Visualization Improvements

- **Knowledge Graph**
  - Node badges (Core, Stretch, Review) with color tokens from domain palette.
  - Edge labels explaining prerequisite gates (AND/OR) + weight chips for encompassing edges.
  - Left rail summary: topic counts per grade band, toggle to isolate struggling topics.
  - Export button (PNG/SVG) to share with stakeholders.

- **Momentum Meter**
  - Replace static progress with segmented bar showing due, upcoming, stretch.
  - Add inline tooltip: “Review compressed via Topic RD-HFW-L2”.

- **Health Indicators**
  - Standardize iconography, include trend arrow per metric (24h delta).

## 8. Measurement & Analytics Hooks

- Track view switches (`persona_select`), action button clicks, start times, and knowledge graph filters.
- Attach design tokens for adaptive reasoning (`data-affordance="engine-explanation"`).
- Implement qualitative capture: teacher feedback button → quick survey modal.

## 9. Execution Backlog (Design + Frontend Pairing)

| Ticket | Type | Description | Owners |
| --- | --- | --- | --- |
| UX-01 | UX Spec | Student launch flow storyboard + wireframes | Design lead → FE pair |
| UX-02 | Component | `JourneySection` pattern with progress states | FE with design review |
| UX-03 | UX Spec | Teacher triage drill-in modal (focus groups) | Design lead |
| UX-04 | Frontend | Knowledge graph badges + filter panel | FE pair |
| UX-05 | UX Spec | Parent digest layout (responsive) | Design lead |
| UX-06 | Research | Kid usability test script + scoring sheet | Design + Research |

## 10. Next Design Artifacts

- Low-fi wireframes (FigJam) for student home + teacher triage (due 2024-07-01).
- Prototype (Figma interactive) covering student launch → joy break selection.
- UX copy deck for adult personas (tone: calm coach, not punitive).
- Accessibility review log referencing WCAG checklist.

---

### Immediate Action Items

1. Draft student launch flow wireframe (deliver to FE tomorrow).
2. Outline teacher triage modal requirements incl. data contract.
3. Start knowledge graph UI upgrade (component stub + styles).
4. Schedule kid testing session template for upcoming sprint.
