import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JoyBreakOption {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  tag?: string;
}

export interface JoyBreakPickerProps {
  options: JoyBreakOption[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function JoyBreakPicker({ options, selectedId, onSelect, className }: JoyBreakPickerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {options.map((option) => {
        const isActive = option.id === selectedId;
        return (
          <div
            key={option.id}
            className={cn(
              "flex items-center justify-between rounded-2xl border border-border/60 bg-white/65 px-4 py-3 text-sm transition",
              isActive ? "border-primary/50 shadow-lg" : "shadow-sm",
            )}
          >
            <button
              type="button"
              className="flex flex-1 items-center gap-4 text-left"
              onClick={() => onSelect?.(option.id)}
              aria-pressed={isActive}
            >
              <span className="text-2xl" aria-hidden="true">
                {option.emoji}
              </span>
              <span>
                <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {option.title}
                  {option.tag ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {option.tag}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.subtitle}
                </span>
              </span>
            </button>
            <Button
              variant={isActive ? "primary" : "ghost"}
              size="sm"
              className="rounded-full text-xs"
              onClick={() => onSelect?.(option.id)}
            >
              {isActive ? "Selected" : "Preview"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
