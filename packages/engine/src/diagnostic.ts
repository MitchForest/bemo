import { randomUUID } from "node:crypto";
import { seedDiagnosticProbes } from "@repo/curriculum";
import type {
  DiagnosticAnswerRequest,
  DiagnosticAnswerResponse,
  DiagnosticNextRequest,
  DiagnosticNextResponse,
  DiagnosticProbe,
  DiagnosticSessionSummary,
} from "@repo/schemas";

interface DiagnosticSession {
  studentId: string;
  queue: DiagnosticProbe[];
  provisionalMastery: Map<string, { strength: number; stability: number }>;
  status: DiagnosticSessionSummary["status"];
  completedAt?: string;
}

const sessions = new Map<string, DiagnosticSession>();

export async function getNextDiagnosticProbe(
  request: DiagnosticNextRequest,
): Promise<DiagnosticNextResponse> {
  const session = ensureSession(request.studentId, request.skillId);
  const probe = session.queue[0];

  return {
    probe,
    session: buildSummary(session),
  };
}

export async function submitDiagnosticAnswer(
  request: DiagnosticAnswerRequest,
): Promise<DiagnosticAnswerResponse> {
  const session = sessions.get(request.studentId);
  if (!session) {
    throw new Error("Diagnostic session not found");
  }

  const probeIndex = session.queue.findIndex((probe) => probe.id === request.probeId);
  if (probeIndex === -1) {
    throw new Error("Probe not part of active session");
  }

  const probe = session.queue.splice(probeIndex, 1)[0];
  updateMastery(session, probe.skillId, request.result);

  if (request.result === "incorrect" || request.result === "skipped") {
    const retryProbe = createRetryProbe(probe);
    session.queue.push(retryProbe);
  }

  if (session.queue.length === 0) {
    session.status = "completed";
    session.completedAt = new Date().toISOString();
  }

  const nextProbe = session.queue[0];

  return {
    nextProbe,
    session: buildSummary(session),
    completed: session.status === "completed",
  };
}

function ensureSession(studentId: string, skillId?: string): DiagnosticSession {
  const existing = sessions.get(studentId);
  if (existing && existing.status !== "completed") {
    return existing;
  }

  const probes = initializeQueue(skillId);
  const session: DiagnosticSession = {
    studentId,
    queue: probes,
    provisionalMastery: new Map(),
    status: probes.length > 0 ? "in_progress" : "completed",
    completedAt: probes.length > 0 ? undefined : new Date().toISOString(),
  };
  sessions.set(studentId, session);
  return session;
}

function initializeQueue(skillId?: string): DiagnosticProbe[] {
  const probes = skillId
    ? seedDiagnosticProbes.filter((probe) => probe.skillId === skillId)
    : seedDiagnosticProbes.slice();
  return probes.sort((a, b) => a.difficulty - b.difficulty);
}

function buildSummary(session: DiagnosticSession): DiagnosticSessionSummary {
  return {
    studentId: session.studentId,
    status: session.status,
    activeSkillIds: Array.from(new Set(session.queue.map((probe) => probe.skillId))),
    provisionalMastery: Array.from(session.provisionalMastery.entries()).map(
      ([skillId, mastery]) => ({
        skillId,
        strength: Number(mastery.strength.toFixed(2)),
        stability: Number(mastery.stability.toFixed(2)),
        recommendation:
          mastery.strength >= 0.75 ? "advance" : mastery.strength >= 0.5 ? "review" : "reteach",
      }),
    ),
    completedAt: session.completedAt,
  };
}

function updateMastery(
  session: DiagnosticSession,
  skillId: string,
  result: DiagnosticAnswerRequest["result"],
): void {
  const entry = session.provisionalMastery.get(skillId) ?? { strength: 0.5, stability: 0.5 };
  const delta =
    result === "correct"
      ? 0.18
      : result === "partial"
        ? 0.08
        : result === "skipped"
          ? -0.05
          : -0.12;
  entry.strength = clamp01(entry.strength + delta);
  entry.stability = clamp01(entry.stability + (delta >= 0 ? 0.1 : -0.08));
  session.provisionalMastery.set(skillId, entry);
}

function createRetryProbe(probe: DiagnosticProbe): DiagnosticProbe {
  return {
    ...probe,
    id: randomUUID(),
    difficulty: Math.max(0.1, probe.difficulty * 0.8),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
