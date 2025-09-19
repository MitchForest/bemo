"use client";

import type { Task } from "@repo/schemas";
import {
  Gamepad2,
  Gauge,
  Leaf,
  PauseCircle,
  PencilRuler,
  PlayCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { JourneySection, type JourneySectionState } from "@/components/patterns/journey-section";
import { JoyBreakPicker } from "@/components/patterns/joy-break-picker";
import { MetricCard } from "@/components/patterns/metric-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudentDashboardData } from "@/hooks/use-student-dashboard-data";

type JourneySectionModel = {
  id: string;
  label: string;
  description: string;
  icon: typeof Leaf;
  duration: string;
  task?: Task;
};

function formatMinutes(minutes?: number) {
  if (!minutes) return "3 min";
  const clamped = Math.max(2, Math.min(minutes, 12));
  return `${clamped} min`;
}

function getPrimarySkillTitle(task: Task): string | undefined {
  const metadata = task.metadata as Record<string, unknown> | undefined;
  const title = metadata?.primarySkillTitle;
  return typeof title === "string" ? title : undefined;
}

function describeTask(task: Task): JourneySectionModel {
  const primarySkillTitle = getPrimarySkillTitle(task);
  const baseDuration = formatMinutes(task.estimatedMinutes);

  if (task.type === "lesson") {
    return {
      id: task.id,
      label: primarySkillTitle ? `Lesson: ${primarySkillTitle}` : "Lesson",
      description: primarySkillTitle
        ? `Introduce ${primarySkillTitle.toLowerCase()} with I-do, we-do, you-do.`
        : "Introduce new concept.",
      icon: Sparkles,
      duration: baseDuration,
      task,
    };
  }

  if (task.type === "review") {
    return {
      id: task.id,
      label: primarySkillTitle ? `Review: ${primarySkillTitle}` : "Adaptive review",
      description:
        task.reason === "struggling_support"
          ? "Coach-led reset with scaffolds queued by the engine."
          : "Quick refresh to keep this skill fresh.",
      icon: PencilRuler,
      duration: baseDuration,
      task,
    };
  }

  if (task.type === "speed_drill") {
    return {
      id: task.id,
      label: primarySkillTitle ? `Speed drill: ${primarySkillTitle}` : "Speed drill",
      description: "Short burst to build automaticity before unlocking a joy break.",
      icon: Gamepad2,
      duration: baseDuration,
      task,
    };
  }

  if (task.type === "diagnostic") {
    return {
      id: task.id,
      label: "Quick check",
      description: "Two-question pulse check to confirm placement.",
      icon: Gauge,
      duration: baseDuration,
      task,
    };
  }

  return {
    id: task.id,
    label: primarySkillTitle ? `Adaptive: ${primarySkillTitle}` : "Adaptive activity",
    description: "The engine added this to balance review and frontier skills.",
    icon: Sparkles,
    duration: baseDuration,
    task,
  };
}

const FALLBACK_SECTIONS: JourneySectionModel[] = [
  {
    id: "warmup",
    label: "Spark check-in",
    description: "Tap the emoji that matches how you feel and breathe together.",
    icon: Leaf,
    duration: "2 min",
  },
];

export function StudentDashboard() {
  const { plan, profile, isLoading, isError, error, refetch } = useStudentDashboardData();
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [selectedJoyBreak, setSelectedJoyBreak] = useState<string | undefined>(undefined);
  const [breathingCount, setBreathingCount] = useState(0);

  const journeySections: JourneySectionModel[] = useMemo(() => {
    if (!plan) return FALLBACK_SECTIONS;

    return [
      {
        id: "warmup",
        label: "Spark check-in",
        description: "Tap an emoji, breathe together, then glide into your first activity.",
        icon: Leaf,
        duration: "2 min",
      },
      ...plan.tasks.map(describeTask),
    ];
  }, [plan]);

  const momentum = useMemo(() => {
    if (!plan || !profile) {
      return { masteredCount: 0, totalSkills: 0, percent: 0, due: 0, stretch: 0 };
    }

    const masteredCount = profile.skillStates.filter((state) => state.strength >= 0.75).length;
    const totalSkills = profile.skillStates.length || 1;
    const percent = masteredCount / totalSkills;

    return {
      masteredCount,
      totalSkills,
      percent,
      due: plan.stats.dueSkills ?? 0,
      stretch: plan.stats.speedDrillOpportunities ?? 0,
    };
  }, [plan, profile]);

  const motivation = profile?.motivation;

  const joyBreakOptions = useMemo(() => {
    const options = [] as Array<{
      id: string;
      title: string;
      subtitle: string;
      emoji: string;
      tag?: string;
    }>;

    if (motivation?.availableJoyBreak) {
      const cooldownMinutes = Math.ceil((motivation.availableJoyBreak.cooldownSeconds ?? 0) / 60);
      options.push({
        id: motivation.availableJoyBreak.id,
        title: motivation.availableJoyBreak.title,
        subtitle: motivation.availableJoyBreak.available
          ? "Ready to unlock after this plan"
          : `Ready in ${cooldownMinutes} min`,
        emoji: "🌈",
        tag: motivation.availableJoyBreak.available ? "Unlocked" : "Cooling",
      });
    }

    options.push(
      {
        id: "movement",
        title: "Stretch story",
        subtitle: "Grow tall like bamboo, bend like the wind",
        emoji: "🤸",
        tag: "2 min",
      },
      {
        id: "mystery",
        title: "Mystery sticker",
        subtitle: "Reveal a new sidekick to collect",
        emoji: "🧚",
      },
    );

    return options.slice(0, 3);
  }, [motivation]);

  useEffect(() => {
    if (!selectedJoyBreak && joyBreakOptions.length > 0) {
      setSelectedJoyBreak(joyBreakOptions[0].id);
    }
  }, [joyBreakOptions, selectedJoyBreak]);

  const startJourney = () => {
    setIsJourneyActive(true);
    setCurrentSectionIndex(0);
  };

  const handleSectionSelect = (index: number) => {
    if (!isJourneyActive && index === 0) {
      startJourney();
      return;
    }
    if (!isJourneyActive) return;
    setCurrentSectionIndex(index);
  };

  const advanceSection = () => {
    setCurrentSectionIndex((prev) => Math.min(journeySections.length - 1, prev + 1));
  };

  const computeState = (index: number): JourneySectionState => {
    if (!isJourneyActive) {
      return index === 0 ? "up_next" : "locked";
    }
    if (index < currentSectionIndex) return "complete";
    if (index === currentSectionIndex) return "current";
    if (index === currentSectionIndex + 1) return "up_next";
    return "locked";
  };

  if (isLoading) {
    return <StudentDashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-3xl border border-border/60 bg-white/70 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">
          We couldn’t load Maya’s plan just yet.
        </p>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "Please try again in a moment."}
        </p>
        <Button onClick={refetch} variant="primary" size="lg">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Today’s Journey
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
            Hey {profile?.profile.name ?? "Maya"}! Ready for your next adventure?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {plan
              ? `The engine lined up ${plan.tasks.length} cards so you keep a gentle pace and stay on streak.`
              : "The engine is preparing your plan."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-[oklch(0.93_0.07_90)] px-4 py-3 text-sm font-medium text-[oklch(0.28_0.04_260)] shadow-inner">
            <span className="block text-xs uppercase text-[oklch(0.42_0.03_260)]">Daily XP</span>
            <span className="text-lg font-bold">
              {motivation?.xpEarnedToday ?? 0} /{" "}
              {motivation?.dailyGoalXp ?? plan?.motivation?.xpTarget ?? 200}
            </span>
          </div>
          <Button size="lg" className="shadow-lg" onClick={startJourney}>
            <Wand2 className="mr-2 h-5 w-5" aria-hidden="true" />
            Start adaptive check-in
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <span className="grid h-12 w-12 place-content-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </span>
                Launch your plan in 3 taps
              </CardTitle>
              <CardDescription>
                Tap start, choose how you feel, and the next screen plays automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  id: "feeling",
                  title: "Pick feeling",
                  detail: "Tap the emoji that matches your body energy.",
                },
                {
                  id: "breathe",
                  title: "Breathe bubble",
                  detail: "Trace the rainbow bubble – Coach counts 4 in · 4 out.",
                },
                {
                  id: "lesson",
                  title: "Begin lesson",
                  detail: "We start the first card automatically so you stay cozy.",
                },
              ].map((step, index) => (
                <div
                  key={step.id}
                  className="rounded-3xl border border-border/60 bg-white/70 p-4 text-sm"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-3 text-base font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <Button size="lg" variant="accent" className="shadow-lg" onClick={startJourney}>
                <PlayCircle className="mr-2 h-5 w-5" aria-hidden="true" /> Begin journey
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setIsJourneyActive(false)}
                disabled={!isJourneyActive}
              >
                <PauseCircle className="mr-1 h-4 w-4" aria-hidden="true" /> Pause for later
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Lesson timeline</CardTitle>
              <CardDescription>
                Follow the I-do, we-do, you-do flow so nothing feels tricky.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {journeySections.map((section, index) => (
                <JourneySection
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  description={section.description}
                  durationLabel={section.duration}
                  state={computeState(index)}
                  onClick={() => handleSectionSelect(index)}
                />
              ))}
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Need a reset? Rewind the story spark before continuing.</span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={advanceSection}
              >
                Jump to next card
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Momentum meter</CardTitle>
              <CardDescription>Stay gentle: streaks and speed grow together.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl bg-white/70 p-4 shadow-inner">
                <div className="flex items-center justify-between text-sm font-semibold text-foreground/70">
                  <span>Topics strong</span>
                  <span>
                    {momentum.masteredCount} / {momentum.totalSkills}
                  </span>
                </div>
                <div className="mt-3 h-4 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(1, Math.max(0, momentum.percent)) * 100}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Due today: {momentum.due}</span>
                  <span>Speed boosts: {momentum.stretch}</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  title="Reading streak"
                  value={`${motivation?.streak.current ?? 0} days`}
                  tone="calm"
                  subtitle={
                    motivation?.streak.isActive ? "Streak protected" : "Stretch to reactivate"
                  }
                />
                <MetricCard
                  title="Speed focus"
                  value={
                    profile?.speedFlags.length
                      ? `+${Math.round((profile.speedFlags[0].speedFactor - 1) * 100)}%`
                      : "On pace"
                  }
                  tone="energy"
                  subtitle={
                    profile?.speedFlags.length
                      ? "Coach will sprinkle a drill"
                      : "Latencies in target"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose your joy break</CardTitle>
              <CardDescription>Finish this lesson to unlock your selected break.</CardDescription>
            </CardHeader>
            <CardContent>
              <JoyBreakPicker
                options={joyBreakOptions}
                selectedId={selectedJoyBreak}
                onSelect={setSelectedJoyBreak}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calm coach</CardTitle>
              <CardDescription>Take three rainbow breaths before you begin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/10 p-4 text-sm text-primary">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-[0.3em]">Breathe</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs text-primary"
                    onClick={() => setBreathingCount((count) => count + 1)}
                  >
                    +1 swirl
                  </Button>
                </div>
                <p className="mt-2 text-base font-semibold">
                  Trace the bubble → in 4 · hold 1 · out 4
                </p>
                <p className="text-xs text-primary/80">
                  Swirls completed: {breathingCount} · Time-back available:{" "}
                  {motivation?.timeBackMinutes ?? 0} min
                </p>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground">
                <p className="font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                  Coach tips
                </p>
                <ul className="space-y-1">
                  <li>• Tap the leaf if you need more calm time before lessons.</li>
                  <li>• Your joy break unlocks faster when you finish the story spark.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const JOURNEY_SKELETON_KEYS = ["first", "second", "third"] as const;

function StudentDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-3">
          <div className="h-3 w-40 rounded-full bg-muted" />
          <div className="h-8 w-64 rounded-full bg-muted" />
          <div className="h-3 w-56 rounded-full bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-14 w-28 rounded-2xl bg-muted" />
          <div className="h-14 w-44 rounded-full bg-muted" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1.1fr]">
        <div className="space-y-6">
          {[1, 2].map((key) => (
            <div key={key} className="rounded-3xl border border-border/60 bg-white/70 p-6">
              <div className="h-6 w-48 rounded-full bg-muted" />
              <div className="mt-4 space-y-3">
                {JOURNEY_SKELETON_KEYS.map((key) => (
                  <div key={`placeholder-item-${key}`} className="h-14 rounded-2xl bg-muted/70" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((key) => (
            <div key={key} className="rounded-3xl border border-border/60 bg-white/70 p-6">
              <div className="h-6 w-40 rounded-full bg-muted" />
              <div className="mt-4 h-24 rounded-2xl bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
