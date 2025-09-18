import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "calm" | "accent" | "energy";
  className?: string;
}

const TONE_STYLE: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  calm: "bg-[oklch(0.93_0.07_90)] text-[oklch(0.32_0.04_260)]",
  accent: "bg-[oklch(0.91_0.08_170)] text-[oklch(0.32_0.04_260)]",
  energy: "bg-[oklch(0.92_0.1_320)] text-[oklch(0.3_0.05_260)]",
};

export function MetricCard({ title, value, subtitle, tone = "calm", className }: MetricCardProps) {
  return (
    <div className={cn("rounded-2xl p-4 shadow-inner", TONE_STYLE[tone], className)}>
      <p className="text-xs uppercase tracking-wide text-[oklch(0.42_0.03_260)]">{title}</p>
      <p className="mt-1 text-2xl font-black leading-tight">{value}</p>
      {subtitle ? <p className="text-xs text-[oklch(0.36_0.04_260)]">{subtitle}</p> : null}
    </div>
  );
}
