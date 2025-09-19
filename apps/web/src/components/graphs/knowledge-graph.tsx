"use client";

import { seedSkills } from "@repo/curriculum";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const ReactFlow = dynamic(() => import("@xyflow/react").then((mod) => mod.ReactFlow), {
  ssr: false,
});
const MiniMap = dynamic(() => import("@xyflow/react").then((mod) => mod.MiniMap), { ssr: false });
const Controls = dynamic(() => import("@xyflow/react").then((mod) => mod.Controls), { ssr: false });
const Background = dynamic(() => import("@xyflow/react").then((mod) => mod.Background), {
  ssr: false,
});

const DOMAIN_COLORS: Record<string, string> = {
  reading: "oklch(0.78 0.14 320)",
  math: "oklch(0.74 0.16 110)",
};

type StageTier = "foundation" | "core" | "stretch" | "unclassified";

const STAGE_META: Record<string, { label: string; tier: StageTier }> = {
  R0_FOUNDATIONS: { label: "Foundations", tier: "foundation" },
  R1_PREK_CORE: { label: "Pre-K Core", tier: "core" },
  R2_K_PHONICS: { label: "K Phonics", tier: "core" },
  R3_K_AUTOMATIC: { label: "K Automaticity", tier: "stretch" },
  R4_G1_CORE: { label: "Grade 1 Core", tier: "core" },
  R5_G2_EXTENSION: { label: "Grade 2 Extension", tier: "core" },
  M0_FOUNDATIONS: { label: "Math Foundations", tier: "foundation" },
  M1_PREK_CORE: { label: "Math Pre-K Core", tier: "core" },
  M2_PREK_STRETCH: { label: "Pre-K Stretch", tier: "stretch" },
  M3_K_CORE: { label: "Kindergarten Core", tier: "core" },
  M4_G1_CORE: { label: "Grade 1 Core", tier: "core" },
  M5_G2_EXTENSION: { label: "Grade 2 Extension", tier: "core" },
};

const STAGE_BADGE_STYLES: Record<StageTier, { background: string; color: string }> = {
  foundation: { background: "oklch(0.96 0.05 80)", color: "oklch(0.32 0.04 260)" },
  core: { background: "oklch(0.92 0.08 175)", color: "oklch(0.28 0.04 260)" },
  stretch: { background: "oklch(0.93 0.1 325)", color: "oklch(0.26 0.05 260)" },
  unclassified: { background: "oklch(0.9 0.03 80)", color: "oklch(0.32 0.04 260)" },
};

const GRADE_ORDER = ["PreK", "K", "1", "2", "3"];

type GraphNodeData = {
  label: string;
  domain: string;
  grade: string;
  stageLabel: string;
  stageTier: StageTier;
};

const NodeRenderer = ({ data }: { data: GraphNodeData }) => {
  const badgeStyle = STAGE_BADGE_STYLES[data.stageTier];

  return (
    <div
      className="min-w-[180px] max-w-[220px] rounded-2xl border border-border/60 bg-white/90 px-4 py-3 shadow-sm"
      style={{ boxShadow: `0 8px 16px -12px ${DOMAIN_COLORS[data.domain] ?? "var(--primary)"}` }}
    >
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ backgroundColor: badgeStyle.background, color: badgeStyle.color }}
      >
        {data.stageLabel}
      </span>
      <p className="mt-2 text-sm font-bold text-foreground">{data.label}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {data.domain.toUpperCase()} · {data.grade}
      </p>
    </div>
  );
};

type GraphEdgeData = {
  kind: "prerequisite" | "encompassed";
  gate?: string;
  weight?: number;
};

type GraphComputation = {
  nodes: Node<GraphNodeData>[];
  edges: Edge<GraphEdgeData>[];
  gradeBands: string[];
  domains: string[];
};

function computeBaseGraph(): GraphComputation {
  const domainBuckets = seedSkills.reduce<Record<string, typeof seedSkills>>(
    (acc, skill) => {
      acc[skill.domain] = acc[skill.domain] ?? [];
      acc[skill.domain].push(skill);
      return acc;
    },
    { reading: [], math: [] },
  );

  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge<GraphEdgeData>[] = [];
  const uniqueGrades = new Set<string>();
  const uniqueDomains = new Set<string>();

  const horizontalSpacing = 220;
  const verticalSpacing = 140;

  (Object.entries(domainBuckets) as Array<["reading" | "math", typeof seedSkills]>).forEach(
    ([domain, skills], domainIndex) => {
      uniqueDomains.add(domain);
      const groupedByGrade = skills.reduce<Record<string, typeof skills>>((gradeAcc, skill) => {
        gradeAcc[skill.gradeBand] = gradeAcc[skill.gradeBand] ?? [];
        gradeAcc[skill.gradeBand].push(skill);
        return gradeAcc;
      }, {});

      const gradeBands = Object.keys(groupedByGrade).sort();

      gradeBands.forEach((grade, gradeIndex) => {
        const gradeSkills = groupedByGrade[grade] ?? [];
        uniqueGrades.add(grade);
        gradeSkills.forEach((skill, skillIndex) => {
          const stageData = STAGE_META[skill.stageCode ?? ""] ?? {
            label: "Unclassified",
            tier: "unclassified" as StageTier,
          };
          nodes.push({
            id: skill.id,
            position: {
              x: domainIndex * 480 + skillIndex * horizontalSpacing,
              y: gradeIndex * verticalSpacing,
            },
            data: {
              label: skill.title,
              domain,
              grade,
              stageLabel: stageData.label,
              stageTier: stageData.tier,
            },
            type: "skillNode",
          });

          for (const prereq of skill.prerequisites ?? []) {
            edges.push({
              id: `${prereq.skillId}->${skill.id}`,
              source: prereq.skillId,
              target: skill.id,
              markerEnd: { type: MarkerType?.ArrowClosed ?? "arrowclosed" },
              data: { gate: prereq.gate, kind: "prerequisite" },
              label: prereq.gate,
              labelBgPadding: [4, 4] as [number, number],
              labelBgBorderRadius: 999,
            });
          }

          for (const entry of skill.encompassing ?? []) {
            edges.push({
              id: `${entry.skillId}~${skill.id}`,
              source: entry.skillId,
              target: skill.id,
              markerEnd: { type: MarkerType?.ArrowClosed ?? "arrowclosed" },
              data: { weight: entry.weight, kind: "encompassed" },
              label: `× ${entry.weight}`,
              labelBgPadding: [4, 4] as [number, number],
              labelBgBorderRadius: 999,
              animated: true,
            });
          }
        });
      });
    },
  );

  const gradeBands = Array.from(uniqueGrades).sort((a, b) => {
    const orderA = GRADE_ORDER.indexOf(a);
    const orderB = GRADE_ORDER.indexOf(b);
    if (orderA === -1 && orderB === -1) {
      return a.localeCompare(b);
    }
    if (orderA === -1) return 1;
    if (orderB === -1) return -1;
    return orderA - orderB;
  });

  return { nodes, edges, gradeBands, domains: Array.from(uniqueDomains) };
}

export function KnowledgeGraph() {
  const baseGraph = useMemo(() => computeBaseGraph(), []);
  const nodeTypes = useMemo(() => ({ skillNode: NodeRenderer }), []);

  const [domainFilter, setDomainFilter] = useState<"all" | "reading" | "math">("all");
  const [gradeFilters, setGradeFilters] = useState<string[]>([]);

  const toggleGrade = (grade: string) => {
    setGradeFilters((current) =>
      current.includes(grade) ? current.filter((entry) => entry !== grade) : [...current, grade],
    );
  };

  const visibleNodes = useMemo(() => {
    return baseGraph.nodes.filter((node) => {
      const matchesDomain = domainFilter === "all" || node.data.domain === domainFilter;
      const matchesGrade = gradeFilters.length === 0 || gradeFilters.includes(node.data.grade);
      return matchesDomain && matchesGrade;
    });
  }, [baseGraph.nodes, domainFilter, gradeFilters]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(() => {
    return baseGraph.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [baseGraph.edges, visibleNodeIds]);

  const styledEdges = useMemo(() => {
    return visibleEdges.map((edge) => {
      const targetDomain =
        visibleNodes.find((node) => node.id === edge.target)?.data.domain ?? "reading";
      const tone = DOMAIN_COLORS[targetDomain] ?? "var(--primary)";
      const isEncompassed = edge.data?.kind === "encompassed";

      return {
        ...edge,
        style: {
          stroke: tone,
          strokeWidth: isEncompassed ? 1.5 : 2.2,
          strokeDasharray: isEncompassed ? "6 6" : undefined,
          opacity: isEncompassed ? 0.65 : 1,
        },
        labelStyle: {
          fontSize: 10,
          fill: isEncompassed ? "oklch(0.32 0.04 260)" : "oklch(0.35 0.04 260)",
        },
        labelBgStyle: {
          fill: isEncompassed ? "oklch(0.96 0.05 80)" : "oklch(0.92 0.08 175)",
          fillOpacity: 0.9,
        },
      };
    });
  }, [visibleEdges, visibleNodes]);

  const stageLegend = [
    { tier: "foundation" as StageTier, label: "Foundations" },
    { tier: "core" as StageTier, label: "Core" },
    { tier: "stretch" as StageTier, label: "Stretch" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="uppercase tracking-[0.28em] text-muted-foreground">Filter</span>
        {(["all", "reading", "math"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDomainFilter(option)}
            className={`rounded-full border px-3 py-1 transition ${
              domainFilter === option
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-white/60 text-foreground/60"
            }`}
          >
            {option === "all" ? "All domains" : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
        <div className="ml-2 flex flex-wrap items-center gap-2">
          {baseGraph.gradeBands.map((grade) => {
            const isActive = gradeFilters.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                onClick={() => toggleGrade(grade)}
                className={`rounded-full border px-3 py-1 transition ${
                  isActive
                    ? "border-secondary/60 bg-secondary/40 text-foreground"
                    : "border-border/60 bg-white/60 text-foreground/60"
                }`}
              >
                {grade}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[460px] rounded-3xl border border-border/60 bg-white/70 p-4 shadow-inner">
        <ReactFlow
          nodes={visibleNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={1.4}
          panOnScroll
        >
          <MiniMap pannable zoomable className="!bg-white/70 !rounded-2xl" />
          <Controls className="rounded-2xl border border-border/60 bg-white/80" />
          <Background gap={24} color="var(--border)" />
        </ReactFlow>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-foreground/70">
        {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
          <span
            key={domain}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-inner"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {domain.charAt(0).toUpperCase() + domain.slice(1)}
          </span>
        ))}
        {stageLegend.map((entry) => (
          <span
            key={entry.tier}
            className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-inner"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STAGE_BADGE_STYLES[entry.tier].background }}
            />
            {entry.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-inner">
          <span className="h-0.5 w-4 rounded-full bg-foreground/80" /> Prerequisite
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 shadow-inner">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ borderBottom: "2px dashed oklch(0.32 0.04 260)" }}
          />
          Encompassed credit
        </span>
      </div>
    </div>
  );
}
