import { cn } from "@/lib/utils";

type DemoGridCardProps = {
  title: string;
  metric: string;
  metricLabel: string;
  className?: string;
};

export function DemoGridCard({
  title,
  metric,
  metricLabel,
  className,
}: DemoGridCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-hairline bg-surface-card p-6",
        className,
      )}
    >
      <div className="border-hairline mb-4 flex items-center gap-2 border-b pb-3">
        <span className="bg-accent-emerald size-2 rounded-full" />
        <span className="text-caption-uppercase text-muted">{title}</span>
      </div>
      <div className="bg-surface-elevated mb-4 h-24 rounded-md" />
      <div className="flex items-end justify-between">
        <div>
          <div className="text-stat-display">{metric}</div>
          <div className="text-body-sm text-muted">{metricLabel}</div>
        </div>
        <div className="flex gap-1">
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div
              key={i}
              className="bg-primary/30 w-2 rounded-sm"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
