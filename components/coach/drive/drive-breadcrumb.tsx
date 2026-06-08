import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BreadcrumbSegment = {
  id: string | null;
  name: string;
};

type DriveBreadcrumbProps = {
  segments: BreadcrumbSegment[];
  onNavigate: (folderId: string | null) => void;
};

export function DriveBreadcrumb({
  segments,
  onNavigate,
}: DriveBreadcrumbProps) {
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;

        return (
          <div key={`${segment.id ?? "root"}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="text-muted size-3.5 shrink-0" />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLast}
              onClick={() => onNavigate(segment.id)}
              className={cn(
                "h-8 gap-1.5 px-2",
                isLast ? "text-on-dark font-semibold" : "text-muted",
              )}
            >
              {index === 0 ? <Home className="size-3.5" /> : null}
              {segment.name}
            </Button>
          </div>
        );
      })}
    </nav>
  );
}
