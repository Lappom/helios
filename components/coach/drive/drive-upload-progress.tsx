import { cn } from "@/lib/utils";

type UploadItem = {
  id: string;
  name: string;
  percent: number;
  done: boolean;
  error?: string;
};

type DriveUploadProgressProps = {
  items: UploadItem[];
};

export function DriveUploadProgress({ items }: DriveUploadProgressProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-hairline bg-surface-card space-y-2 rounded-lg border p-3">
      <p className="text-caption-uppercase text-muted tracking-widest uppercase">
        Uploads
      </p>
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-sm text-body-strong truncate font-medium">
              {item.name}
            </p>
            <span className="text-caption text-muted shrink-0">
              {item.error ? "Erreur" : item.done ? "Terminé" : `${item.percent}%`}
            </span>
          </div>
          <div className="bg-surface-elevated h-1.5 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.error
                  ? "bg-accent-rose"
                  : item.done
                    ? "bg-accent-emerald"
                    : "bg-primary",
              )}
              style={{ width: `${item.error ? 100 : item.percent}%` }}
            />
          </div>
          {item.error ? (
            <p className="text-caption text-accent-rose">{item.error}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export type { UploadItem };
