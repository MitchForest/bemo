import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfileSummary, WeeklyReport } from "@repo/schemas";

import { DEFAULT_STUDENT_ID } from "@/config/demo-students";
import { fetchStudentProfileSummary, fetchWeeklyReport } from "@/lib/api/dashboard";

export interface ParentHighlightCard {
  id: string;
  title: string;
  detail: string;
  tone: "celebration" | "growth" | "alert";
}

export interface ParentDashboardData {
  profile: StudentProfileSummary;
  weekly: WeeklyReport;
  highlights: ParentHighlightCard[];
  readingStrength: number;
  mathStrength: number;
  readingLabel: string;
  mathLabel: string;
  adaptivePlacementLabel: string;
  conversationPrompts: string[];
}

function percentLabel(value: number | undefined): number {
  if (!value && value !== 0) return 0;
  return Math.round(value * 100);
}

function deriveLevel(strength: number): string {
  if (strength >= 0.85) return "Stretch";
  if (strength >= 0.7) return "On track";
  if (strength >= 0.55) return "In progress";
  return "Focus";
}

function mapHighlights(report: WeeklyReport): ParentHighlightCard[] {
  if (!report.highlights?.length) {
    return [
      {
        id: "default-celebration",
        title: "Joyful progress",
        detail: "The learning engine spotted strong effort this week!",
        tone: "celebration",
      },
    ];
  }

  return report.highlights.slice(0, 3).map((entry, index) => ({
    id: entry.type + index,
    title: entry.title,
    detail: entry.description,
    tone: entry.type,
  }));
}

function derivePrompts(report: WeeklyReport, summary: StudentProfileSummary): string[] {
  const prompts: string[] = [];

  if (report.highlights.length) {
    prompts.push(`Ask about: ${report.highlights[0].title.toLowerCase()}.`);
  }

  const speedFlag = summary.speedFlags[0];
  if (speedFlag) {
    prompts.push(`Try a quick practice on ${speedFlag.title.toLowerCase()}.`);
  }

  if (report.coachActions.length) {
    prompts.push(report.coachActions[0].description);
  }

  return prompts.slice(0, 3);
}

export function useParentDashboardData(studentId: string = DEFAULT_STUDENT_ID) {
  const profileQuery = useQuery({
    queryKey: ["parent-profile", studentId],
    queryFn: () => fetchStudentProfileSummary(studentId),
  });

  const weeklyQuery = useQuery({
    queryKey: ["parent-weekly", studentId],
    queryFn: () => fetchWeeklyReport(studentId),
  });

  const data = useMemo<ParentDashboardData | undefined>(() => {
    const profile = profileQuery.data;
    const weekly = weeklyQuery.data;
    if (!profile || !weekly) return undefined;

    const reading = profile.mastery.find((entry) => entry.domain === "reading");
    const math = profile.mastery.find((entry) => entry.domain === "math");

    return {
      profile,
      weekly,
      highlights: mapHighlights(weekly),
      readingStrength: percentLabel(reading?.averageStrength),
      mathStrength: percentLabel(math?.averageStrength),
      readingLabel: deriveLevel(reading?.averageStrength ?? 0),
      mathLabel: deriveLevel(math?.averageStrength ?? 0),
      adaptivePlacementLabel: profile.profile.grade ?? "",
      conversationPrompts: derivePrompts(weekly, profile),
    };
  }, [profileQuery.data, weeklyQuery.data]);

  return {
    data,
    isLoading: profileQuery.isLoading || weeklyQuery.isLoading,
    isError: profileQuery.isError || weeklyQuery.isError,
    error:
      (profileQuery.error as Error | undefined) ?? (weeklyQuery.error as Error | undefined) ?? null,
    refetch: () => {
      profileQuery.refetch();
      weeklyQuery.refetch();
    },
  };
}
