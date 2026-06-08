import type { QuotaCheckResult } from "@/lib/billing/access";
import { AI_CREDIT_COSTS } from "@/lib/billing/ai-credit-costs";

type AiCreditsQuotaBarProps = {
  quota: QuotaCheckResult;
  compact?: boolean;
};

export function AiCreditsQuotaBar({
  quota,
  compact = false,
}: AiCreditsQuotaBarProps) {
  const limitLabel =
    quota.limit === Number.POSITIVE_INFINITY ? "∞" : String(quota.limit);
  const percent =
    quota.limit === Number.POSITIVE_INFINITY
      ? 0
      : Math.min(100, Math.round((quota.used / quota.limit) * 100));

  if (compact) {
    return (
      <p className="text-caption text-muted">
        <span className="text-primary font-semibold">{quota.used}</span>
        <span className="text-muted"> / {limitLabel} crédits IA</span>
      </p>
    );
  }

  return (
    <div className="border-hairline bg-surface-elevated rounded-lg border p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Crédits IA
          </p>
          <p className="text-display-sm text-primary mt-1 font-bold tracking-tight">
            {quota.used}
            <span className="text-body-md text-muted ml-1 font-normal">
              / {limitLabel}
            </span>
          </p>
        </div>
        <p className="text-body-sm text-muted">
          {quota.remaining === Number.POSITIVE_INFINITY
            ? "Illimité sur votre plan"
            : `${quota.remaining} crédit${quota.remaining === 1 ? "" : "s"} restant${quota.remaining === 1 ? "" : "s"}`}
        </p>
      </div>
      <p className="text-caption text-muted-soft mt-2">
        Chat : {AI_CREDIT_COSTS.chat} · Génération programme :{" "}
        {AI_CREDIT_COSTS.generateProgram}
      </p>
      {quota.limit !== Number.POSITIVE_INFINITY ? (
        <div className="bg-surface-card mt-4 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
