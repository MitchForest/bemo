import { randomUUID } from "node:crypto";
import {
  seedJoyBreaks,
  seedMotivationLeagues,
  seedMotivationRewards,
  seedMotivationTracks,
} from "@repo/curriculum";
import type {
  ClaimRewardRequest,
  ClaimRewardResponse,
  MotivationDigest,
  MotivationLeague,
  MotivationQuest,
  MotivationReward,
  MotivationRewardProgress,
  MotivationSquad,
  MotivationSummary,
  MotivationTrack,
  StudentStats,
  TimeBackLedgerEntry,
} from "@repo/schemas";
import {
  addTimeBackLedgerEntry,
  ensureDailyTimeBackReward,
  loadStudentLeagueMembership,
  loadStudentProfile,
  loadStudentQuests,
  loadStudentStats,
  loadTimeBackLedger,
  markTimeBackEntryConsumed,
  persistStudentQuests,
  setStudentLeagueMembership,
} from "./data";

export async function getMotivationSummary(studentId: string): Promise<MotivationSummary> {
  const profile = await loadStudentProfile(studentId);
  const stats = await loadStudentStats(studentId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayXp = stats.weeklyXp.find((entry) => entry.date === todayKey)?.xp ?? 0;
  const dailyGoal = profile.settings.dailyXpGoal ?? 80;
  const weekXp = stats.weeklyXp.reduce((sum, entry) => sum + entry.xp, 0);
  const weeklyGoal = profile.settings.weeklyXpGoal ?? dailyGoal * 5;

  const xpByTrack: Record<string, number> = {};
  for (const track of seedMotivationTracks) {
    const progress = track.cadence === "daily" ? todayXp : weekXp;
    xpByTrack[track.id] = progress;
  }
  const defaultProgress = todayXp;

  const tracks = seedMotivationTracks.map((track) =>
    enrichTrackProgress(track, xpByTrack[track.id] ?? defaultProgress),
  );
  const pendingRewards = buildRewardProgress(seedMotivationRewards, xpByTrack, defaultProgress);
  const joyBreak = buildJoyBreak(todayXp, dailyGoal);

  if (dailyGoal > 0 && todayXp >= dailyGoal) {
    await ensureDailyTimeBackReward(studentId, Math.max(5, Math.round(dailyGoal / 4)), todayKey);
  }

  const ledger = await loadTimeBackLedger(studentId);
  const availableTimeBack = ledger
    .filter((entry) => !entry.consumedAt)
    .reduce((sum, entry) => sum + entry.minutesGranted, 0);

  const membership = await loadStudentLeagueMembership(studentId);
  const activeLeague = membership.leagueId
    ? decorateLeague(seedMotivationLeagues.find((league) => league.id === membership.leagueId))
    : undefined;
  const activeSquad =
    membership.squadId && activeLeague
      ? decorateSquad(activeLeague, membership.squadId, studentId, stats)
      : undefined;

  if (
    activeLeague &&
    activeSquad &&
    !activeLeague.squads.some((squad) => squad.id === activeSquad.id)
  ) {
    activeLeague.squads.push(activeSquad);
  }

  const quests = await loadStudentQuests(studentId);

  return {
    studentId,
    dailyGoalXp: dailyGoal,
    weeklyGoalXp: weeklyGoal,
    xpEarnedToday: todayXp,
    xpRemainingToday: Math.max(0, dailyGoal - todayXp),
    xpEarnedThisWeek: weekXp,
    xpRemainingThisWeek: Math.max(0, weeklyGoal - weekXp),
    projectedCompletionMinutes: dailyGoal > 0 ? Math.round((dailyGoal - todayXp) / 8) : undefined,
    streak: {
      current: stats.currentStreak,
      longest: stats.longestStreak,
      isActive: stats.currentStreak > 0,
      lastActiveDate: stats.lastActiveAt ?? undefined,
    },
    tracks,
    pendingRewards,
    availableJoyBreak: joyBreak,
    timeBackMinutes: availableTimeBack,
    activeLeague,
    activeSquad,
    quests,
    timeBackLedger: ledger,
  };
}

export async function claimReward(request: ClaimRewardRequest): Promise<ClaimRewardResponse> {
  const reward = seedMotivationRewards.find((item) => item.id === request.rewardId);
  if (!reward) {
    return { success: false, timeBackMinutesGranted: 0 };
  }

  const stats = await loadStudentStats(request.studentId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayXp = stats.weeklyXp.find((entry) => entry.date === todayKey)?.xp ?? 0;

  if (todayXp < reward.threshold) {
    return { success: false, reward: undefined, timeBackMinutesGranted: 0 };
  }

  const joyBreak =
    reward.metadata?.joyBreakId && seedJoyBreaks.find((jb) => jb.id === reward.metadata.joyBreakId)
      ? seedJoyBreaks.find((jb) => jb.id === reward.metadata.joyBreakId)
      : undefined;

  return {
    success: true,
    reward,
    newJoyBreak: joyBreak,
    timeBackMinutesGranted: reward.type === "time_back" ? Math.round(reward.threshold / 10) : 0,
  };
}

function enrichTrackProgress(track: MotivationTrack, xp: number) {
  const rewards = seedMotivationRewards.filter((reward) => reward.trackId === track.id);
  const nextReward = rewards.find((reward) => xp < reward.threshold);
  const unlockedRewards = rewards.filter((reward) => xp >= reward.threshold);
  const percentComplete = track.targetXp > 0 ? Math.min(1, xp / track.targetXp) : 0;

  return {
    ...track,
    progressXp: xp,
    percentComplete,
    nextReward,
    unlockedRewards,
  };
}

function buildRewardProgress(
  rewards: MotivationReward[],
  xpByTrack: Record<string, number>,
  defaultXp: number,
): MotivationRewardProgress[] {
  return rewards.map((reward) => {
    const xp = xpByTrack[reward.trackId ?? ""] ?? defaultXp;
    return {
      ...reward,
      unlocked: xp >= reward.threshold,
      progress: reward.threshold > 0 ? Math.min(1, xp / reward.threshold) : 1,
    };
  });
}

function buildJoyBreak(todayXp: number, dailyGoal: number) {
  if (todayXp < dailyGoal) {
    return undefined;
  }

  const joyBreak = seedJoyBreaks[0];
  if (!joyBreak) return undefined;

  return {
    id: joyBreak.id,
    title: joyBreak.title,
    durationSeconds: joyBreak.durationSeconds,
    available: true,
    cooldownSeconds: 0,
  };
}

export async function getMotivationLeagues(_studentId: string): Promise<MotivationLeague[]> {
  return seedMotivationLeagues
    .map((league) => decorateLeague(league))
    .filter((league): league is MotivationLeague => Boolean(league));
}

export async function joinMotivationSquad(
  studentId: string,
  leagueId: string,
  squadId?: string,
): Promise<{ league: MotivationLeague | undefined; squad: MotivationSquad | undefined }> {
  await setStudentLeagueMembership(studentId, leagueId, squadId);
  const league = decorateLeague(seedMotivationLeagues.find((item) => item.id === leagueId));
  const stats = await loadStudentStats(studentId);
  const squad = league && squadId ? decorateSquad(league, squadId, studentId, stats) : undefined;
  if (league && squad && !league.squads.some((existing) => existing.id === squad.id)) {
    league.squads.push(squad);
  }
  return { league, squad };
}

export async function getMotivationQuests(studentId: string): Promise<MotivationQuest[]> {
  return loadStudentQuests(studentId);
}

export async function updateQuestTaskProgress(
  studentId: string,
  questId: string,
  taskId: string,
  progress: number,
  completed: boolean,
): Promise<MotivationQuest[]> {
  const quests = await loadStudentQuests(studentId);
  const updated = quests.map((quest) => {
    if (quest.id !== questId) return quest;
    const tasks = quest.tasks.map((task) =>
      task.id === taskId ? { ...task, progress, completed } : task,
    );
    const progressPercent =
      tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(tasks.length, 1);
    const status = tasks.every((task) => task.completed) ? "completed" : quest.status;
    return { ...quest, tasks, progressPercent: Number(progressPercent.toFixed(2)), status };
  });
  await persistStudentQuests(studentId, updated);
  return updated;
}

export async function claimQuestReward(
  studentId: string,
  questId: string,
): Promise<MotivationQuest | undefined> {
  const quests = await loadStudentQuests(studentId);
  const quest = quests.find((item) => item.id === questId);
  if (!quest) return undefined;
  if (quest.status === "claimed" || quest.status === "locked") {
    return quest;
  }
  if (!quest.tasks.every((task) => task.completed)) {
    return quest;
  }

  const updatedQuest: MotivationQuest = {
    ...quest,
    status: "claimed",
  };
  const updated = quests.map((item) => (item.id === questId ? updatedQuest : item));
  await persistStudentQuests(studentId, updated);

  const minutes = Math.max(5, Math.round(quest.xpReward / 5));
  await addTimeBackLedgerEntry({
    id: randomUUID(),
    studentId,
    source: "quest",
    minutesGranted: minutes,
    grantedAt: new Date().toISOString(),
    expiresAt: undefined,
    consumedAt: undefined,
    note: `Quest reward: ${quest.title}`,
  });

  return updatedQuest;
}

export async function getTimeBackLedgerEntries(studentId: string): Promise<TimeBackLedgerEntry[]> {
  return loadTimeBackLedger(studentId);
}

export async function claimTimeBackEntry(
  studentId: string,
  entryId: string,
): Promise<TimeBackLedgerEntry[]> {
  await markTimeBackEntryConsumed(studentId, entryId);
  return loadTimeBackLedger(studentId);
}

export async function getMotivationDigest(
  studentId: string,
  recipient: "coach" | "parent",
): Promise<MotivationDigest> {
  const summary = await getMotivationSummary(studentId);
  const stats = await loadStudentStats(studentId);
  const highlights: string[] = [];

  if (summary.streak.current > 0) {
    highlights.push(`Streak active at ${summary.streak.current} day(s)`);
  }
  if (summary.pendingRewards.some((reward) => reward.unlocked && reward.type === "badge")) {
    highlights.push("New badge ready to celebrate");
  }
  if (summary.timeBackMinutes > 0) {
    highlights.push(`${summary.timeBackMinutes} minutes of choice time earned`);
  }

  const suggestedActions: string[] = [];
  if (summary.xpRemainingToday > 0) {
    suggestedActions.push(`Only ${summary.xpRemainingToday} XP left to reach today's goal.`);
  }
  if (summary.quests.some((quest) => quest.status === "completed")) {
    suggestedActions.push("Help celebrate quest completions with a shout-out.");
  }

  return {
    studentId,
    recipient,
    weekOf: summary.streak.lastActiveDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    xpEarned: stats.weeklyXp.reduce((sum, entry) => sum + entry.xp, 0),
    minutesOnTask: stats.totalMinutes,
    streak: summary.streak,
    highlights,
    suggestedActions,
    upcomingMilestones: summary.quests
      .filter((quest) => quest.status === "active")
      .map(
        (quest) => `Quest "${quest.title}" ${(quest.progressPercent * 100).toFixed(0)}% complete.`,
      ),
    timeBackAvailableMinutes: summary.timeBackMinutes,
  };
}

function decorateLeague(league: MotivationLeague | undefined): MotivationLeague | undefined {
  if (!league) return undefined;
  return {
    ...league,
    squads: league.squads.map((squad) => ({
      ...squad,
      members: squad.members.map((member) => ({ ...member })),
    })),
  };
}

function decorateSquad(
  league: MotivationLeague,
  squadId: string,
  studentId: string,
  stats: StudentStats,
): MotivationSquad {
  const existing = league.squads.find((squad) => squad.id === squadId);
  if (existing) {
    const members = existing.members.some((member) => member.studentId === studentId)
      ? existing.members.map((member) => ({ ...member }))
      : [
          ...existing.members.map((member) => ({ ...member })),
          {
            studentId,
            displayName: "Pathfinder",
            avatarUrl: undefined,
            xpThisWeek: stats.weeklyXp.reduce((sum, entry) => sum + entry.xp, 0),
            isLeader: existing.members.length === 0,
          },
        ];
    return {
      ...existing,
      members,
      weeklyXp: members.reduce((sum, member) => sum + member.xpThisWeek, 0),
    };
  }

  return {
    id: squadId,
    leagueId: league.id,
    name: "Trailblazers",
    description: "Auto-created squad",
    invitationCode: undefined,
    members: [
      {
        studentId,
        displayName: "Pathfinder",
        avatarUrl: undefined,
        xpThisWeek: stats.weeklyXp.reduce((sum, entry) => sum + entry.xp, 0),
        isLeader: true,
      },
    ],
    weeklyXp: stats.weeklyXp.reduce((sum, entry) => sum + entry.xp, 0),
    rank: league.squads.length + 1,
  };
}
