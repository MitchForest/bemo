import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type JourneySectionState = "locked" | "up_next" | "current" | "complete";

export interface JourneySectionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  description: string;
  durationLabel: string;
  state?: JourneySectionState;
  progress?: number;
  showPrompt?: boolean;
}

const STATE_STYLES: Record<JourneySectionState, string> = {
  locked:
    "border-border/60 bg-white/55 text-foreground/50 hover:-translate-y-0 focus-visible:ring-2 focus-visible:ring-border/60", // stays subtle
  up_next:
    "bg-gradient-to-r from-[oklch(0.95_0.1_280)] to-[oklch(0.98_0.05_300)] text-foreground/80 hover:shadow-lg",
  current:
    "bg-gradient-to-r from-[oklch(0.92_0.11_320)] via-[oklch(0.95_0.08_330)] to-[oklch(0.98_0.05_40)] text-foreground shadow-lg",
  complete:
    "bg-gradient-to-r from-[oklch(0.9_0.07_100)] to-[oklch(0.95_0.05_120)] text-foreground/80 border border-border/50",
};

const STATE_LABEL: Record<JourneySectionState, string> = {
  locked: "Locked",
  up_next: "Up next",
  current: "In progress",
  complete: "Done",
};

export function JourneySection({
  icon: Icon,
  label,
  description,
  durationLabel,
  state = "up_next",
  className,
  progress,
  showPrompt = true,
  ...buttonProps
}: JourneySectionProps) {
  const showProgressBar = typeof progress === "number" && progress >= 0 && progress <= 1;
  const clampedProgress = showProgressBar ? Math.min(1, Math.max(0, progress ?? 0)) : 0;

  return (
    <button
      type="button"
      {...buttonProps}
      className={cn(
        "group relative flex w-full items-center gap-4 rounded-3xl px-5 py-4 text-left transition will-change-transform focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
        STATE_STYLES[state],
        className,
      )}
      aria-pressed={state === "current"}
    >
      <div className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-white/80 text-primary shadow-inner">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            {STATE_LABEL[state]}
          </span>
          <span className="rounded-full bg-white/30 px-2 py-0.5 text-[11px] font-semibold text-foreground/70">
            {durationLabel}
          </span>
        </div>
        <p className="text-lg font-semibold text-foreground">{label}</p>
        <p className="text-sm text-foreground/70 group-hover:text-foreground/85">{description}</p>
        {showProgressBar ? (
          <div className="mt-3 h-1.5 w-full rounded-full bg-white/45">
            <div
              className="h-full rounded-full bg-foreground/80 transition-all"
              style={{ width: `${clampedProgress * 100}%` }}
            />
          </div>
        ) : null}
      </div>
      {state === "current" && showPrompt ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
          Tap to continue
        </span>
      ) : null}
    </button>
  );
}
