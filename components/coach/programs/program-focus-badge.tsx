import { Badge } from "@/components/ui/badge";
import type { TrainingPhaseFocus } from "@/lib/validators/programs";
import { cn } from "@/lib/utils";

const FOCUS_LABELS: Record<TrainingPhaseFocus, string> = {
  strength: "Force",
  hypertrophy: "Hypertrophie",
  power: "Puissance",
  endurance: "Endurance",
  deload: "Deload",
  custom: "Custom",
};

type ProgramFocusBadgeProps = {
  focus: TrainingPhaseFocus | null | undefined;
  className?: string;
};

export function ProgramFocusBadge({ focus, className }: ProgramFocusBadgeProps) {
  if (!focus) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-primary/30 bg-primary/10 text-on-dark rounded-full text-[10px] font-medium",
        className,
      )}
    >
      {FOCUS_LABELS[focus]}
    </Badge>
  );
}

export function getFocusLabel(focus: TrainingPhaseFocus | null | undefined) {
  return focus ? FOCUS_LABELS[focus] : null;
}
