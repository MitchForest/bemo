import {
  type PlanQueryParams,
  buildPlanQuery,
  requestPlan,
  requestStudentProfile,
  requestWeeklyReport,
} from "@repo/api-client";
import type { PlanResponse, StudentProfileSummary, WeeklyReport } from "@repo/schemas";

export type { PlanQueryParams };

export async function fetchStudentPlan(
  params: {
    studentId?: string;
    max?: number;
    includeSpeedDrills?: boolean;
    includeDiagnostic?: boolean;
    query?: PlanQueryParams;
  } = {},
): Promise<PlanResponse> {
  const { query, ...rest } = params;
  const resolvedQuery = query ?? buildPlanQuery(rest);
  return requestPlan({ ...rest, query: resolvedQuery });
}

export async function fetchStudentProfileSummary(
  studentId?: string,
): Promise<StudentProfileSummary> {
  return requestStudentProfile({ studentId });
}

export async function fetchWeeklyReport(studentId?: string): Promise<WeeklyReport> {
  return requestWeeklyReport({ studentId });
}
