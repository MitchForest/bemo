import type { PlanResponse, StudentProfileSummary } from "@repo/schemas";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DEFAULT_STUDENT_ID } from "@/config/demo-students";
import { fetchStudentPlan, fetchStudentProfileSummary } from "@/lib/api/dashboard";

interface UseStudentDashboardOptions {
  studentId?: string;
}

interface StudentDashboardResult {
  plan?: PlanResponse;
  profile?: StudentProfileSummary;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStudentDashboardData({
  studentId,
}: UseStudentDashboardOptions = {}): StudentDashboardResult {
  const resolvedStudentId = studentId ?? DEFAULT_STUDENT_ID;

  const planQuery = useQuery({
    queryKey: ["plan", resolvedStudentId],
    queryFn: () => fetchStudentPlan({ studentId: resolvedStudentId }),
  });

  const profileQuery = useQuery({
    queryKey: ["profile-summary", resolvedStudentId],
    queryFn: () => fetchStudentProfileSummary(resolvedStudentId),
  });

  const { plan, profile } = useMemo(() => {
    return {
      plan: planQuery.data,
      profile: profileQuery.data,
    };
  }, [planQuery.data, profileQuery.data]);

  return {
    plan,
    profile,
    isLoading: planQuery.isLoading || profileQuery.isLoading,
    isError: planQuery.isError || profileQuery.isError,
    error:
      (planQuery.error as Error | undefined) ?? (profileQuery.error as Error | undefined) ?? null,
    refetch: () => {
      planQuery.refetch();
      profileQuery.refetch();
    },
  };
}
