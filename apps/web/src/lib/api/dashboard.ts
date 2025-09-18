import { createApiClient, handleApiResponse } from "@repo/api-client";
import {
  PlanResponseSchema,
  StudentProfileSummarySchema,
  WeeklyReportSchema,
  type PlanResponse,
  type StudentProfileSummary,
  type WeeklyReport,
} from "@repo/schemas";

function buildPlanQuery(params: {
  studentId?: string;
  max?: number;
  includeSpeedDrills?: boolean;
  includeDiagnostic?: boolean;
}) {
  const query: Record<string, string> = {};

  if (params.studentId) {
    query.studentId = params.studentId;
  }
  if (typeof params.max === "number") {
    query.max = params.max.toString();
  }
  if (typeof params.includeSpeedDrills === "boolean") {
    query.includeSpeedDrills = params.includeSpeedDrills ? "true" : "false";
  }
  if (typeof params.includeDiagnostic === "boolean") {
    query.includeDiagnostic = params.includeDiagnostic ? "true" : "false";
  }

  return Object.keys(query).length > 0 ? query : undefined;
}

export async function fetchStudentPlan(params: {
  studentId?: string;
  max?: number;
  includeSpeedDrills?: boolean;
  includeDiagnostic?: boolean;
}): Promise<PlanResponse> {
  const client = createApiClient() as any;
  const response = await client.api.plan.$get({
    query: buildPlanQuery(params),
  });

  const { data } = await handleApiResponse(response, PlanResponseSchema);
  return data as PlanResponse;
}

export async function fetchStudentProfileSummary(
  studentId?: string,
): Promise<StudentProfileSummary> {
  const client = createApiClient() as any;
  const response = await client.api.profile.$get({
    query: studentId ? { studentId } : undefined,
  });

  const { data } = await handleApiResponse(response, StudentProfileSummarySchema);
  return data as StudentProfileSummary;
}

export async function fetchWeeklyReport(studentId?: string): Promise<WeeklyReport> {
  const client = createApiClient() as any;
  const response = await client.api.report.weekly.$get({
    query: studentId ? { studentId } : undefined,
  });

  const { data } = await handleApiResponse(response, WeeklyReportSchema);
  return data as WeeklyReport;
}
