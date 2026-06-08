"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type ScalePickerProps = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  className?: string;
  style?: CSSProperties;
};

export function ScalePicker({
  label,
  value,
  onChange,
  lowLabel = "Faible",
  highLabel = "Fort",
  className,
  style,
}: ScalePickerProps) {
  return (
    <div className={cn("space-y-3", className)} style={style}>
      <p className="text-title-sm text-on-dark font-semibold">{label}</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, index) => {
          const scaleValue = index + 1;
          const selected = value === scaleValue;

          return (
            <button
              key={scaleValue}
              type="button"
              onClick={() => onChange(scaleValue)}
              className={cn(
                "border-hairline bg-surface-elevated text-on-dark flex h-10 min-w-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                selected && "border-primary bg-primary/10 text-primary",
              )}
              aria-pressed={selected}
              aria-label={`${label} ${scaleValue} sur 10`}
            >
              {scaleValue}
            </button>
          );
        })}
      </div>
      <div className="text-muted flex justify-between text-xs">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
