"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTeacherRoster } from "@/hooks/use-teacher-roster";
import { Building2, Layers, LineChart, ShieldHalf, Users2 } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

const organizationTree = [
  {
    name: "Bemo Microschools",
    type: "district",
    icon: "🌈",
    children: [
      {
        name: "Sunrise Campus",
        type: "school",
        icon: "🏫",
        children: [
          { name: "Kindergarten Pods", type: "cohort", icon: "🧸", count: 42 },
          { name: "Grade 1 Pods", type: "cohort", icon: "🚀", count: 38 },
        ],
      },
      {
        name: "Creekside Campus",
        type: "school",
        icon: "🌿",
        children: [
          { name: "Kindergarten Pods", type: "cohort", icon: "🎨", count: 36 },
          { name: "Grade 1 Pods", type: "cohort", icon: "🧮", count: 40 },
        ],
      },
    ],
  },
];

const KnowledgeGraph = dynamic(
  () => import("../graphs/knowledge-graph").then((mod) => mod.KnowledgeGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] w-full items-center justify-center rounded-3xl border border-dashed border-border/60 bg-white/60 text-sm text-muted-foreground">
        Loading knowledge graph…
      </div>
    ),
  },
);

export function AdminDashboard() {
  const { roster, isLoading, isError, error, refetch } = useTeacherRoster();

  const metrics = React.useMemo(() => {
    if (!roster.length) {
      return {
        totalLearners: 0,
        placementCoverage: 0,
        placementNote: "No data yet",
        alignment: 0,
        alignmentNote: "",
        engagement: 0,
        engagementNote: "",
      };
    }

    const totalLearners = roster.length;
    const overdueLearners = roster.filter(
      (student) => (student.summary.latestPlan?.stats.overdueSkills ?? 0) > 0,
    ).length;
    const engagedLearners = roster.filter(
      (student) => student.summary.motivation?.streak.isActive,
    ).length;

    const totalTasks = roster.reduce(
      (sum, student) => sum + (student.summary.latestPlan?.tasks.length ?? 0),
      0,
    );
    const strugglingTasks = roster.reduce((sum, student) => {
      const tasks = student.summary.latestPlan?.tasks ?? [];
      return sum + tasks.filter((task) => task.reason === "struggling_support").length;
    }, 0);

    const placementCoverage = Math.max(
      0,
      Math.round(((totalLearners - overdueLearners) / totalLearners) * 100),
    );
    const alignment = totalTasks
      ? Math.max(0, Math.round(((totalTasks - strugglingTasks) / totalTasks) * 100))
      : 100;
    const engagement = Math.round((engagedLearners / totalLearners) * 100);

    return {
      totalLearners,
      placementCoverage,
      placementNote: `${overdueLearners} learner${overdueLearners === 1 ? "" : "s"} need adaptive entry`,
      alignment,
      alignmentNote: `${strugglingTasks} lesson${strugglingTasks === 1 ? "" : "s"} flagged for update`,
      engagement,
      engagementNote: `${engagedLearners} ${engagedLearners === 1 ? "family" : "families"} active this week`,
    };
  }, [roster]);

  if (isLoading) {
    return <AdminDashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-3xl border border-border/60 bg-white/70 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">
          We couldn’t load the network snapshot yet.
        </p>
        <p className="text-sm text-muted-foreground">{error?.message ?? "Please try again."}</p>
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
            Network Overview
          </p>
          <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
            Morning brief for Alexis (Admin)
          </h1>
          <p className="text-sm text-muted-foreground">
            2 campuses · {metrics.totalLearners} active learners · Placement assessments synced
            nightly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" className="rounded-2xl">
            <ShieldHalf className="mr-2 h-5 w-5" aria-hidden="true" />
            Manage permissions
          </Button>
          <Button size="lg" className="rounded-2xl">
            <Building2 className="mr-2 h-5 w-5" aria-hidden="true" />
            Add new campus
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Org & Cohort Hierarchy</CardTitle>
            <CardDescription>Spot enrollment gaps or pacing issues instantly.</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            {organizationTree.map((district) => (
              <div
                key={district.name}
                className="rounded-3xl border border-border/70 bg-white/70 p-4 shadow-sm"
              >
                <NodeRow node={district} depth={0} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Key health indicators</CardTitle>
              <CardDescription>Generated every morning from the learning engine.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <HealthRow
                icon={<LineChart className="h-4 w-4" />}
                label="Placement coverage"
                value={`${metrics.placementCoverage}%`}
                note={metrics.placementNote}
              />
              <HealthRow
                icon={<Layers className="h-4 w-4" />}
                label="Curriculum alignment"
                value={`${metrics.alignment}%`}
                note={metrics.alignmentNote}
              />
              <HealthRow
                icon={<Users2 className="h-4 w-4" />}
                label="Family engagement"
                value={`${metrics.engagement}%`}
                note={metrics.engagementNote}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Cross-app controls for admins and coaches.</CardDescription>
            </CardHeader>
            <CardContent className="gap-3 text-sm">
              {[
                "Launch placement drive for Creekside",
                "Review retention policy & export",
                "Share new lesson kit with teachers",
              ].map((action) => (
                <div
                  key={action}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/70 px-4 py-3"
                >
                  <span className="text-foreground/80">{action}</span>
                  <Button variant="ghost" size="sm" className="rounded-full text-xs font-semibold">
                    Go
                  </Button>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Coming soon: automate roster sync + SIS guardrails.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph Preview</CardTitle>
          <CardDescription>
            Visualize prerequisite relationships across seeded reading and math skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeGraph />
        </CardContent>
      </Card>
    </div>
  );
}

interface Node {
  icon: string;
  name: string;
  type: string;
  count?: number;
  children?: Node[];
}

function NodeRow({ node, depth }: { node: Node; depth: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{node.icon}</span>
          <div>
            <p className="font-semibold text-foreground">{node.name}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{node.type}</p>
          </div>
        </div>
        {node.count ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {node.count} learners
          </span>
        ) : null}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="space-y-3 pl-6">
          {node.children.map((child) => (
            <NodeRow key={child.name} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function HealthRow({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/70 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-foreground/80">
        <span className="grid h-9 w-9 place-content-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </div>
      </div>
      <span className="text-base font-black text-foreground">{value}</span>
    </div>
  );
}

const SKELETON_PLACEHOLDERS = ["first", "second", "third"] as const;

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="floating-toolbar flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-muted" />
          <div className="h-8 w-64 rounded-full bg-muted" />
          <div className="h-3 w-48 rounded-full bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-12 w-36 rounded-full bg-muted" />
          <div className="h-12 w-40 rounded-full bg-muted" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border/60 bg-white/70 p-6">
          <div className="h-6 w-48 rounded-full bg-muted" />
          <div className="mt-4 space-y-3">
            {SKELETON_PLACEHOLDERS.map((key) => (
              <div key={`skeleton-item-${key}`} className="h-16 rounded-2xl bg-muted/60" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {SKELETON_PLACEHOLDERS.map((key) => (
            <div
              key={`skeleton-card-${key}`}
              className="rounded-3xl border border-border/60 bg-white/70 p-6"
            >
              <div className="h-6 w-40 rounded-full bg-muted" />
              <div className="mt-4 h-16 rounded-2xl bg-muted/60" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-[460px] rounded-3xl border border-border/60 bg-white/70" />
    </div>
  );
}
