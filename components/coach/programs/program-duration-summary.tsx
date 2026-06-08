import { countWeeksInMicrocycle } from "@/lib/programs/cycle-utils";
import type { ProgramMicrocycleItem } from "@/lib/programs/types";
import { cn } from "@/lib/utils";

type ProgramDurationSummaryProps = {
  actualWeeks: number;
  targetDurationWeeks?: number | null;
  className?: string;
};

export function ProgramDurationSummary({
  actualWeeks,
  targetDurationWeeks,
  className,
}: ProgramDurationSummaryProps) {
  if (!targetDurationWeeks) return null;

  const onTrack = actualWeeks <= targetDurationWeeks;

  return (
    <p
      className={cn(
        "text-body-sm text-muted",
        !onTrack && "text-primary",
        className,
      )}
    >
      {actualWeeks}/{targetDurationWeeks} sem.
    </p>
  );
}

export function MicrocycleDurationSummary({
  microcycle,
  className,
}: {
  microcycle: ProgramMicrocycleItem;
  className?: string;
}) {
  return (
    <ProgramDurationSummary
      actualWeeks={countWeeksInMicrocycle(microcycle)}
      targetDurationWeeks={microcycle.targetDurationWeeks}
      className={className}
    />
  );
}
