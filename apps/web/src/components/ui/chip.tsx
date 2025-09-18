import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  tone?: "sunrise" | "seafoam" | "lavender" | "citrus" | "slate";
  active?: boolean;
}

const tones: Record<Required<ChipProps>["tone"], string> = {
  sunrise: "bg-[oklch(0.9_0.12_90)] text-[oklch(0.26_0.03_250)]",
  seafoam: "bg-[oklch(0.91_0.08_170)] text-[oklch(0.26_0.03_250)]",
  lavender: "bg-[oklch(0.92_0.09_320)] text-[oklch(0.27_0.03_250)]",
  citrus: "bg-[oklch(0.95_0.12_80)] text-[oklch(0.3_0.04_250)]",
  slate: "bg-[oklch(0.9_0.03_250)] text-[oklch(0.3_0.03_250)]",
};

export const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ icon, tone = "sunrise", active, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "persona-chip cursor-pointer select-none",
        tones[tone],
        active && "ring-4 ring-primary/30",
        className,
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
    </div>
  ),
);
Chip.displayName = "Chip";
