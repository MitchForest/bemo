import { test, expect } from "bun:test";
import {
  getMotivationSummary,
  getMotivationLeagues,
  joinMotivationSquad,
  getMotivationQuests,
  updateQuestTaskProgress,
  claimQuestReward,
  getTimeBackLedgerEntries,
  claimTimeBackEntry,
  getMotivationDigest,
} from "../index";

const STUDENT_ID = "44444444-4444-4444-8444-444444444444";

test("motivation summary returns tracks and rewards", async () => {
  const summary = await getMotivationSummary(STUDENT_ID);
  expect(summary.studentId).toBe(STUDENT_ID);
  expect(summary.tracks.length).toBeGreaterThan(0);
  expect(summary.pendingRewards.length).toBeGreaterThan(0);
  expect(summary.dailyGoalXp).toBeGreaterThan(0);
  expect(summary.quests.length).toBeGreaterThan(0);
  expect(summary.timeBackLedger.length).toBeGreaterThanOrEqual(0);
});

test("league membership can be joined and listed", async () => {
  const leagues = await getMotivationLeagues(STUDENT_ID);
  expect(leagues.length).toBeGreaterThan(0);
  const targetLeague = leagues[0];
  const membership = await joinMotivationSquad(
    STUDENT_ID,
    targetLeague.id,
    targetLeague.squads[0]?.id,
  );

  expect(membership.league?.id).toBe(targetLeague.id);
});

test("quests update and claim add time-back", async () => {
  const quests = await getMotivationQuests(STUDENT_ID);
  expect(quests.length).toBeGreaterThan(0);
  const quest = quests[0];

  let updatedQuests = quests;
  for (const task of quest.tasks) {
    updatedQuests = await updateQuestTaskProgress(STUDENT_ID, quest.id, task.id, 1, true);
  }
  const updatedQuest = updatedQuests.find((item) => item.id === quest.id);
  updatedQuest?.tasks.forEach((task) => expect(task.completed).toBe(true));

  const claimed = await claimQuestReward(STUDENT_ID, quest.id);
  expect(claimed?.status === "completed" || claimed?.status === "claimed").toBe(true);

  const ledger = await getTimeBackLedgerEntries(STUDENT_ID);
  expect(ledger.length).toBeGreaterThan(0);
  const entry = ledger[0];
  const consumed = await claimTimeBackEntry(STUDENT_ID, entry.id);
  expect(consumed.find((item) => item.id === entry.id)?.consumedAt).toBeDefined();
});

test("digest summarises weekly progress", async () => {
  const digest = await getMotivationDigest(STUDENT_ID, "coach");
  expect(digest.studentId).toBe(STUDENT_ID);
  expect(digest.recipient).toBe("coach");
  expect(digest.highlights.length).toBeGreaterThanOrEqual(0);
});
