import type { StudentSkillState, WeeklyReport } from "@repo/schemas";
import { getAllSkills, loadStudentSkillStates, loadStudentStats } from "./data";

export async function getWeeklyReport(studentId: string): Promise<WeeklyReport> {
  const stats = await loadStudentStats(studentId);
  const skills = await getAllSkills();
  const skillStates = await loadStudentSkillStates(studentId, skills);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const lastSeven = generateDateKeys(weekStart, 7);
  const xpByDate = new Map(stats.weeklyXp.map((entry) => [entry.date, entry.xp]));

  const daily = lastSeven.map((date) => {
    const xp = xpByDate.get(date) ?? 0;
    const minutes = Math.round(xp / 8);
    const tasksCompleted = Math.max(0, Math.round(xp / 18));
    return { date, xp, minutes, tasksCompleted };
  });

  const xpTotal = daily.reduce((sum, day) => sum + day.xp, 0);
  const minutesTotal = daily.reduce((sum, day) => sum + day.minutes, 0);

  const highlights = buildHighlights(skillStates, xpTotal);
  const coachActions = buildCoachActions(skillStates);

  return {
    studentId,
    weekOf: formatDateKey(weekStart),
    xpTotal,
    minutesTotal,
    streak: {
      current: stats.currentStreak,
      longest: stats.longestStreak,
      isActive: stats.currentStreak > 0,
      lastActiveDate: stats.lastActiveAt ?? undefined,
    },
    planStats: undefined,
    daily,
    highlights,
    coachActions,
  };
}

function buildHighlights(skillStates: StudentSkillState[], xpTotal: number) {
  const list: WeeklyReport["highlights"] = [];
  if (xpTotal >= 200) {
    list.push({
      type: "celebration",
      title: "XP Superstar",
      description: "Earned 200+ XP this week!",
    });
  }
  const newMastery = skillStates.filter(
    (state) => state.strength >= 0.82 && (state.overdueDays ?? 0) === 0,
  );
  if (newMastery.length) {
    list.push({
      type: "growth",
      title: "New Masteries",
      description: `${newMastery.length} skills reached mastery levels.`,
    });
  }
  const struggling = skillStates.filter((state) => state.strugglingFlag || state.strength < 0.45);
  if (struggling.length) {
    list.push({
      type: "alert",
      title: "Reteach Opportunities",
      description: `${struggling.length} skills need extra support.`,
    });
  }
  return list;
}

function buildCoachActions(skillStates: StudentSkillState[]) {
  const struggling = skillStates
    .filter((state) => state.strugglingFlag || state.strength < 0.45)
    .slice(0, 3)
    .map((state) => ({
      actionId: `reteach-${state.skillId}`,
      title: "Plan a reteach",
      description: "Review this skill together with manipulatives.",
      skillId: state.skillId,
    }));

  return struggling;
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  result.setUTCDate(result.getUTCDate() + diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function generateDateKeys(start: Date, days: number): string[] {
  const list: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    list.push(formatDateKey(date));
  }
  return list;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
