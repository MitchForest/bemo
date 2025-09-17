import type { PlanRequest, Task } from "@repo/schemas";

export async function getPlan(_params: PlanRequest & { studentId: string }): Promise<Task[]> {
  // Placeholder implementation
  return [];
}

export async function submitEvidence(_studentId: string, _payload: unknown): Promise<void> {
  // Placeholder implementation
}
