"use client";

import { HeartHandshake, Trophy, CalendarHeart, Star } from "lucide-react";

import type { WeeklyReport } from "@repo/schemas";

import { useParentDashboardData } from "@/hooks/use-parent-dashboard-data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneIconMap = {
  celebration: Star,
  growth: Trophy,
  alert: CalendarHeart,
};

export function ParentDashboard() {
  const { data, isLoading, isError, error, refetch } = useParentDashboardData();

  if (isLoading) {
    return <ParentDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 rounded-3xl border border-border/60 bg-white/70 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">
          We couldn’t load the family view just yet.
        </p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "Please try again."}</p>
        <Button onClick={refetch} variant="primary" size="lg">
          Retry
        </Button>
      </div>
    );
  }

  const {
    profile,
    weekly,
    highlights,
    readingStrength,
    mathStrength,
    readingLabel,
    mathLabel,
    adaptivePlacementLabel,
    conversationPrompts,
  } = data;

  return (
    <div className="space-y-8">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Family overview
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
            Hi {profile.profile.parentIds.length ? "family" : "coach"}, here’s how{" "}
            {profile.profile.name.split(" ")[0]} is growing 🌱
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Celebrate today’s wins and see which moments need a little extra encouragement.
          </p>
        </div>
        <Button size="lg" className="rounded-2xl">
          <HeartHandshake className="mr-2 h-5 w-5" aria-hidden="true" />
          Send cheer message
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Learning highlights</CardTitle>
            <CardDescription>Snapshot of progress across reading and math ladders.</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <div className="rounded-3xl bg-white/70 p-5 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-foreground/80">
                <span>Adaptive placement</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  {adaptivePlacementLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-[oklch(0.93_0.07_90)] p-4 shadow-inner">
                  <p className="text-xs uppercase tracking-wide text-[oklch(0.42_0.03_260)]">
                    Reading ladder
                  </p>
                  <p className="mt-1 text-2xl font-black text-[oklch(0.28_0.04_260)]">
                    {readingStrength}%
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {readingLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-[oklch(0.91_0.08_170)] p-4 shadow-inner">
                  <p className="text-xs uppercase tracking-wide text-[oklch(0.42_0.03_260)]">
                    Math ladder
                  </p>
                  <p className="mt-1 text-2xl font-black text-[oklch(0.28_0.04_260)]">
                    {mathStrength}%
                  </p>
                  <p className="text-xs text-muted-foreground">Status: {mathLabel}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map((highlight, index) => {
                const Icon = toneIconMap[highlight.tone];
                const toneColor =
                  index === 0
                    ? "bg-[oklch(0.9_0.12_90)]"
                    : index === 1
                      ? "bg-[oklch(0.91_0.08_170)]"
                      : "bg-[oklch(0.92_0.09_320)]";
                return (
                  <div
                    key={highlight.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-white/60 p-4 text-sm"
                  >
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                        toneColor,
                      )}
                    >
                      <Icon className="h-5 w-5 text-[oklch(0.26_0.04_260)]" aria-hidden="true" />
                    </span>
                    <p className="text-base font-semibold text-foreground">{highlight.title}</p>
                    <p className="text-xs text-muted-foreground">{highlight.detail}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation starters</CardTitle>
              <CardDescription>Use these prompts at dinner or bedtime.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3 text-sm">
              {(conversationPrompts.length
                ? conversationPrompts
                : ["Tell me about your favourite learning moment today!"]
              ).map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-[oklch(0.32_0.04_260)] shadow-sm"
                >
                  {prompt}
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="rounded-full text-sm">
                Print check chart
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly rhythm</CardTitle>
              <CardDescription>Plan consistent time with gentle reminders.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-[oklch(0.93_0.07_90)] p-4 text-sm text-[oklch(0.28_0.04_260)] shadow-inner">
                {deriveRecommendedRhythm(weekly.daily)}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm text-foreground/80">
                <div>
                  <p className="font-semibold text-foreground">Adaptive assessment</p>
                  <p className="text-xs text-muted-foreground">
                    Scheduled automatically when ready
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Preview flow
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function deriveRecommendedRhythm(days: WeeklyReport["daily"]): string {
  if (!days.length) return "Set gentle 20-minute sessions on Tue · Thu · Sat";
  const sorted = [...days].sort((a, b) => b.minutes - a.minutes).slice(0, 3);
  const labels = sorted.map((entry) =>
    new Date(entry.date).toLocaleDateString(undefined, { weekday: "short" }),
  );
  const minutes = Math.round(
    sorted.reduce((sum, entry) => sum + entry.minutes, 0) / Math.max(sorted.length, 1),
  );
  return `${labels.join(" · ")} → ${minutes} minute sessions`;
}

function ParentDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-muted" />
          <div className="h-8 w-64 rounded-full bg-muted" />
          <div className="h-3 w-56 rounded-full bg-muted" />
        </div>
        <div className="h-14 w-44 rounded-full bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-white/70 p-6">
          <div className="h-6 w-40 rounded-full bg-muted" />
          <div className="mt-4 h-24 rounded-2xl bg-muted/60" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-20 rounded-2xl bg-muted/50" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="rounded-3xl border border-border/60 bg-white/70 p-6">
              <div className="h-6 w-32 rounded-full bg-muted" />
              <div className="mt-4 h-24 rounded-2xl bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
