"use client";

import { Badge } from "@/components/ui/badge";
import { PROGRAM_STATUS_LABELS } from "@/lib/programs/constants";
import type { ProgramStatus } from "@/lib/validators/programs";
import { cn } from "@/lib/utils";

export function ProgramStatusBadge({
  status,
  className,
}: {
  status: ProgramStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md uppercase tracking-wide",
        status === "published" &&
          "border-accent-emerald/40 text-accent-emerald",
        status === "draft" && "border-hairline text-muted",
        status === "archived" && "border-hairline text-muted-soft",
        className,
      )}
    >
      {PROGRAM_STATUS_LABELS[status]}
    </Badge>
  );
}
