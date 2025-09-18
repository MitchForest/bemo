import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { StudentProfileSummary, Task } from "@repo/schemas";
import { seedSkills } from "@repo/curriculum";
import { fetchStudentProfileSummary } from "@/lib/api/dashboard";
import { DEMO_STUDENTS } from "@/config/demo-students";

const SKILL_MAP = new Map(seedSkills.map((skill) => [skill.id, skill]));

const ROSTER_PREVIEW = [
  { id: DEMO_STUDENTS.maya, name: "Maya", avatar: "🦊" },
  { id: DEMO_STUDENTS.lucas, name: "Lucas", avatar: "🦁" },
  { id: DEMO_STUDENTS.zara, name: "Zara", avatar: "🐼" },
] as const;

export interface TriageTimelineEntry {
  id: string;
  label: string;
  description: string;
  duration: string;
  type: Task["type"];
  reason?: Task["reason"];
}

export interface TriageStationEntry {
  id: string;
  label: string;
  duration: string;
  notes: string;
}

export interface TriageEvidenceEntry {
  id: string;
  label: string;
  value: string;
}

export interface TeacherRosterLearner {
  id: string;
  name: string;
  avatar: string;
  status: string;
  mastery: string;
  focus: string;
  vibe: string;
  summary: StudentProfileSummary;
  attentionLevel: "urgent" | "ready" | "monitor";
  triage: {
    summary: string;
    reason: string;
    timeline: TriageTimelineEntry[];
    stations: TriageStationEntry[];
    evidence: TriageEvidenceEntry[];
  };
}

function formatMinutes(estimated: number | undefined): string {
  if (!estimated || Number.isNaN(estimated)) return "5 min";
  const rounded = Math.max(2, Math.min(estimated, 20));
  return `${rounded} min`;
}

function describeTask(task: Task): string {
  const skillTitle = SKILL_MAP.get(task.skillIds?.[0] ?? task.topicIds[0] ?? "")?.title;
  if (task.type === "lesson") {
    return skillTitle ? `Introduce ${skillTitle.toLowerCase()}.` : "Introduce new concept.";
  }
  if (task.type === "review") {
    return skillTitle
      ? `Review ${skillTitle.toLowerCase()} with manipulatives.`
      : "Review prior skill.";
  }
  if (task.type === "speed_drill") {
    return skillTitle ? `Speed reps for ${skillTitle.toLowerCase()}.` : "Speed fluency reps.";
  }
  if (task.type === "diagnostic") {
    return "Quick check to place learner confidently.";
  }
  return "Adaptive activity selected by the engine.";
}

function buildTimeline(tasks: Task[]): TriageTimelineEntry[] {
  return tasks.slice(0, 4).map((task) => ({
    id: task.id,
    label:
      task.reason === "struggling_support"
        ? "Teacher table"
        : task.type === "speed_drill"
          ? "Speed drill"
          : task.type === "review"
            ? "Adaptive review"
            : "Frontier lesson",
    description: describeTask(task),
    duration: formatMinutes(task.estimatedMinutes),
    type: task.type,
    reason: task.reason,
  }));
}

function buildStations(tasks: Task[]): TriageStationEntry[] {
  return tasks.slice(0, 3).map((task, index) => {
    const defaultLabel =
      task.reason === "struggling_support"
        ? "Teacher table"
        : task.type === "speed_drill"
          ? "Tech center"
          : index === 0
            ? "Teacher intro"
            : "Independent";
    const skillTitle = SKILL_MAP.get(task.skillIds?.[0] ?? task.topicIds[0] ?? "")?.title;
    return {
      id: `${task.id}-${index}`,
      label: defaultLabel,
      duration: formatMinutes(task.estimatedMinutes),
      notes: skillTitle ? `Focus: ${skillTitle}` : "Follow engine guidance.",
    };
  });
}

function buildEvidence(summary: StudentProfileSummary): TriageEvidenceEntry[] {
  const readingMastery = summary.mastery.find((item) => item.domain === "reading");
  const mathMastery = summary.mastery.find((item) => item.domain === "math");
  const streak = summary.motivation?.streak.current;

  return [
    {
      id: "strength",
      label: "Reading strength",
      value: readingMastery ? `${Math.round(readingMastery.averageStrength * 100)}%` : "--",
    },
    {
      id: "math",
      label: "Math strength",
      value: mathMastery ? `${Math.round(mathMastery.averageStrength * 100)}%` : "--",
    },
    {
      id: "streak",
      label: "Streak",
      value: streak !== undefined ? `${streak} days` : "--",
    },
  ];
}

function deriveAttentionLevel(summary: StudentProfileSummary): {
  attention: "urgent" | "ready" | "monitor";
  reason: string;
  summary: string;
} {
  const overdue = summary.latestPlan?.stats.overdueSkills ?? 0;
  const struggling = summary.latestPlan?.stats.strugglingSkills ?? 0;
  const speedFlags = summary.speedFlags.length;

  if (struggling > 0) {
    return {
      attention: "urgent",
      reason: "Needs reteach",
      summary: `${struggling} skill${struggling === 1 ? "" : "s"} flagged for reteach. Start with teacher table first.`,
    };
  }

  if (overdue > 0) {
    return {
      attention: "ready",
      reason: "Overdue review",
      summary: `${overdue} overdue review item${overdue === 1 ? "" : "s"}. Pair with quick adaptive check-in.`,
    };
  }

  if (speedFlags > 0) {
    return {
      attention: "ready",
      reason: "Speed focus",
      summary: `${speedFlags} speed boost opportunity. Queue a drill after warm-up.`,
    };
  }

  return {
    attention: "monitor",
    reason: "On track",
    summary: "Learner is pacing well. Keep routine stations steady.",
  };
}

function buildRosterEntry(
  config: (typeof ROSTER_PREVIEW)[number],
  summary: StudentProfileSummary,
): TeacherRosterLearner {
  const attention = deriveAttentionLevel(summary);
  const dueSkill = summary.dueSkills[0];
  const focus =
    dueSkill?.title ??
    SKILL_MAP.get(
      summary.latestPlan?.tasks[0]?.skillIds?.[0] ??
        summary.latestPlan?.tasks[0]?.topicIds?.[0] ??
        "",
    )?.title ??
    "Review core";
  const vibe =
    summary.motivation?.streak.current && summary.motivation.streak.current >= 5
      ? "Confident"
      : "Rebuilding";

  return {
    id: config.id,
    name: config.name,
    avatar: config.avatar,
    status:
      attention.reason === "On track"
        ? "Ready for adaptive check-in"
        : attention.reason === "Needs reteach"
          ? "Needs reteach"
          : "Focus boost",
    mastery:
      SKILL_MAP.get(
        summary.latestPlan?.tasks[0]?.skillIds?.[0] ??
          summary.latestPlan?.tasks[0]?.topicIds?.[0] ??
          "",
      )?.title ?? "Core skill",
    focus: focus,
    vibe,
    summary,
    attentionLevel: attention.attention,
    triage: {
      summary: attention.summary,
      reason: attention.reason,
      timeline: buildTimeline(summary.latestPlan?.tasks ?? []),
      stations: buildStations(summary.latestPlan?.tasks ?? []),
      evidence: buildEvidence(summary),
    },
  };
}

async function fetchRoster(): Promise<TeacherRosterLearner[]> {
  const summaries = await Promise.all(
    ROSTER_PREVIEW.map(async (config) => {
      const summary = await fetchStudentProfileSummary(config.id);
      return buildRosterEntry(config, summary);
    }),
  );

  return summaries;
}

export function useTeacherRoster() {
  const query = useQuery({
    queryKey: ["teacher-roster"],
    queryFn: fetchRoster,
    staleTime: 60 * 1000,
  });

  const roster = useMemo(() => query.data ?? [], [query.data]);

  return {
    roster,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | undefined) ?? null,
    refetch: query.refetch,
  };
}
