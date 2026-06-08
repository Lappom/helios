import type { DriveStorageQuota } from "@/lib/drive/types";
import { formatBytes } from "@/lib/drive/format";
import { cn } from "@/lib/utils";

type DriveStorageMeterProps = {
  quota: DriveStorageQuota;
};

export function DriveStorageMeter({ quota }: DriveStorageMeterProps) {
  const isUnlimited = quota.limitBytes === Number.POSITIVE_INFINITY;
  const ratio = isUnlimited ? 0 : quota.usedPercent / 100;
  const isNearLimit = !isUnlimited && ratio >= 0.85;
  const isExceeded = !isUnlimited && quota.usedBytes >= quota.limitBytes;

  return (
    <div
      className={cn(
        "border-hairline bg-surface-card rounded-lg border px-4 py-3",
        isExceeded && "border-accent-rose/50",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Stockage Drive
          </p>
          <p className="text-on-dark text-title-sm mt-0.5 font-semibold">
            {isUnlimited
              ? `${formatBytes(quota.usedBytes)} utilisés`
              : `${formatBytes(quota.usedBytes)} / ${formatBytes(quota.limitBytes)}`}
          </p>
        </div>
        {!isUnlimited ? (
          <p
            className={cn(
              "text-body-sm font-medium",
              isExceeded
                ? "text-accent-rose"
                : isNearLimit
                  ? "text-primary"
                  : "text-muted",
            )}
          >
            {quota.usedPercent}%
          </p>
        ) : null}
      </div>
      {!isUnlimited ? (
        <div className="bg-surface-elevated mt-3 h-1.5 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isExceeded
                ? "bg-accent-rose"
                : isNearLimit
                  ? "bg-primary"
                  : "bg-accent-emerald",
            )}
            style={{ width: `${Math.min(100, quota.usedPercent)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
