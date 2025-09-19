"use client";

import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useMemo, useState } from "react";

const personas = [
  {
    id: "student",
    label: "Student",
    tagline: "Kid-first journey",
    tone: "sunrise" as const,
    emoji: "🧠",
  },
  {
    id: "teacher",
    label: "Teacher",
    tagline: "Cohort orchestration",
    tone: "seafoam" as const,
    emoji: "🧑‍🏫",
  },
  {
    id: "parent",
    label: "Parent",
    tagline: "Celebrate & support",
    tone: "lavender" as const,
    emoji: "💞",
  },
  {
    id: "admin",
    label: "Admin",
    tagline: "Network health",
    tone: "citrus" as const,
    emoji: "🛠️",
  },
];

type PersonaId = (typeof personas)[number]["id"];

export default function Home() {
  const [persona, setPersona] = useState<PersonaId>("student");

  const View = useMemo(() => {
    switch (persona) {
      case "student":
        return <StudentDashboard />;
      case "teacher":
        return <TeacherDashboard />;
      case "parent":
        return <ParentDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return null;
    }
  }, [persona]);

  return (
    <main className="min-h-screen px-6 py-10 sm:px-12">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-muted-foreground">
              Multi-persona Preview
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              Bemo Learning Experience
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Built for joyful Pre-K → Grade 1 learning with adaptive planning, pace-safe lessons,
              and easy coach tools. Switch personas to explore the tailored surfaces and flows.
            </p>
          </div>
          <Button variant="ghost" className="rounded-full text-sm">
            View product foundations
          </Button>
        </header>

        <div className="floating-toolbar inline-flex flex-wrap items-center gap-3 px-4 py-3">
          {personas.map((entry) => (
            <Chip
              key={entry.id}
              tone={entry.tone}
              active={persona === entry.id}
              onClick={() => setPersona(entry.id)}
              icon={entry.emoji}
            >
              <span className="text-sm font-semibold text-foreground/80">{entry.label}</span>
              <span className="ml-2 hidden text-xs text-foreground/50 sm:inline">
                {entry.tagline}
              </span>
            </Chip>
          ))}
        </div>

        <section className="max-w-6xl">{View}</section>
      </section>
    </main>
  );
}
