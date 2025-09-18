"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronRight,
  Flame,
  GraduationCap,
  Sparkles,
  Target,
  UserSquare,
  Clock3,
} from "lucide-react";

import { JourneySection } from "@/components/patterns/journey-section";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTeacherRoster } from "@/hooks/use-teacher-roster";

export function TeacherDashboard() {
  const { roster, isLoading, isError, error, refetch } = useTeacherRoster();
  const [triageStudentId, setTriageStudentId] = useState<string | null>(null);

  const triageStudent = roster.find((student) => student.id === triageStudentId) ?? null;

  const focusGroups = useMemo(() => {
    if (!roster.length) {
      return [
        { label: "Teacher table", count: 0, note: "Reteach focus" },
        { label: "Tech center", count: 0, note: "Smoothie quest" },
        { label: "Peer coach", count: 0, note: "Sight word chant" },
      ];
    }

    const urgent = roster.filter((entry) => entry.attentionLevel === "urgent").length;
    const ready = roster.filter((entry) => entry.attentionLevel === "ready").length;
    const monitor = roster.length - urgent - ready;

    return [
      { label: "Teacher table", count: urgent, note: "Reteach blend + build" },
      { label: "Tech center", count: ready, note: "Speed drills + quests" },
      { label: "Peer coach", count: monitor, note: "Celebrate & stretch" },
    ];
  }, [roster]);

  if (isLoading) {
    return <TeacherDashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-3xl border border-border/60 bg-white/70 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">
          We couldn’t load your cohort pulse yet.
        </p>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? "Please try again shortly."}
        </p>
        <Button onClick={() => refetch()} variant="primary" size="lg">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            Morning Standup
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
            Welcome back, Ms. Vega 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {roster.length} learners synced ·{" "}
            {roster.filter((entry) => entry.attentionLevel !== "monitor").length} need focus ·
            Adaptive placement ready for newcomers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="lg" className="rounded-2xl">
            <CalendarRange className="mr-2 h-5 w-5" aria-hidden="true" />
            Launch mini-lesson mode
          </Button>
          <Button size="lg" className="rounded-2xl">
            <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
            Start entry assessment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Live cohort pulse</CardTitle>
            <CardDescription>
              Glance view of today’s focus groups and their readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {roster.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between rounded-3xl border border-border/70 bg-white/70 px-4 py-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-content-center rounded-2xl bg-[oklch(0.93_0.07_90)] text-xl">
                    {student.avatar}
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.status}</p>
                  </div>
                </div>
                <div className="grid gap-1 text-right text-xs font-semibold text-foreground/70">
                  <span className="inline-flex items-center justify-end gap-1">
                    <Target className="h-4 w-4" aria-hidden="true" /> {student.mastery}
                  </span>
                  <span className="inline-flex items-center justify-end gap-1">
                    <Flame className="h-4 w-4" aria-hidden="true" /> Focus: {student.focus}
                  </span>
                  <span className="inline-flex items-center justify-end gap-1 text-[oklch(0.42_0.04_260)]">
                    {student.vibe}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setTriageStudentId(student.id)}
                >
                  View triage
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson blocks</CardTitle>
              <CardDescription>
                Automagically sequenced to align with your pacing guide.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3">
              {["Warm intro", "Workshop", "Reflection"].map((title, index) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/60 bg-white/60 px-4 py-3 text-sm text-foreground/80"
                >
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>{title}</span>
                    <span>{index === 1 ? "20 min" : "5 min"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {index === 0 && "Phonics chant with short a cards"}
                    {index === 1 && "Station rotation · small group reteach · tech center"}
                    {index === 2 && "Student talk + quick exit ticket"}
                  </p>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="rounded-full text-sm">
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Send slides + centers to board
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action inbox</CardTitle>
              <CardDescription>
                Prioritised by the learning engine so you can focus.
              </CardDescription>
            </CardHeader>
            <CardContent className="gap-3 text-sm">
              <div className="rounded-2xl bg-[oklch(0.93_0.07_90)] px-4 py-3 font-medium text-[oklch(0.28_0.04_260)] shadow-inner">
                {roster.filter((entry) => entry.attentionLevel === "urgent").length} learner(s) need
                reteach huddle
              </div>
              <div className="rounded-2xl bg-[oklch(0.91_0.08_170)] px-4 py-3 font-medium text-[oklch(0.28_0.04_260)] shadow-inner">
                {roster.filter((entry) => entry.attentionLevel === "ready").length} speed boosts
                queued for today
              </div>
              <div className="rounded-2xl bg-[oklch(0.92_0.09_320)] px-4 py-3 font-medium text-[oklch(0.28_0.04_260)] shadow-inner">
                Send celebration notes for streak heroes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus groups today</CardTitle>
              <CardDescription>Engine-suggested rotations with counts and goals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {focusGroups.map((group) => (
                <div
                  key={group.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/60 px-4 py-3"
                >
                  <span className="font-semibold text-foreground">{group.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.count} learners · {group.note}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={Boolean(triageStudent)}
        onOpenChange={(open) => (!open ? setTriageStudentId(null) : null)}
      >
        <DialogContent>
          {triageStudent ? (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <span className="grid h-12 w-12 place-content-center rounded-2xl bg-[oklch(0.93_0.07_90)] text-2xl">
                    {triageStudent.avatar}
                  </span>
                  <span>
                    {triageStudent.name}
                    <span className="ml-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {triageStudent.triage.reason}
                    </span>
                  </span>
                </DialogTitle>
                <DialogDescription>{triageStudent.triage.summary}</DialogDescription>
              </DialogHeader>

              <section className="space-y-3">
                <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  <Clock3 className="h-4 w-4" aria-hidden="true" /> Timeline
                </header>
                <div className="space-y-2">
                  {triageStudent.triage.timeline.map((entry, index) => (
                    <JourneySection
                      key={entry.id}
                      icon={index === 0 ? UserSquare : index === 1 ? GraduationCap : Sparkles}
                      label={entry.label}
                      description={entry.description}
                      durationLabel={entry.duration}
                      state={index === 0 ? "current" : index === 1 ? "up_next" : "locked"}
                      showPrompt={false}
                      disabled
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" /> Station notes
                </header>
                <div className="space-y-2">
                  {triageStudent.triage.stations.map((station) => (
                    <div
                      key={station.id}
                      className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-sm text-foreground/80"
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span>{station.label}</span>
                        <span className="text-xs text-muted-foreground">{station.duration}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{station.notes}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2 text-xs text-muted-foreground">
                <header className="flex items-center gap-2 font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Evidence snapshot
                </header>
                <div className="grid gap-2 sm:grid-cols-3">
                  {triageStudent.triage.evidence.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border/60 bg-white/70 px-4 py-3 text-center font-semibold text-foreground"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg text-foreground/90">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <DialogFooter className="justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setTriageStudentId(null)}
                >
                  Close
                </Button>
                <Button size="lg">
                  Send plan to board
                  <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-muted" />
          <div className="h-8 w-60 rounded-full bg-muted" />
          <div className="h-3 w-48 rounded-full bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-14 w-40 rounded-full bg-muted" />
          <div className="h-14 w-44 rounded-full bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-20 rounded-3xl border border-border/60 bg-white/70" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-32 rounded-3xl border border-border/60 bg-white/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
