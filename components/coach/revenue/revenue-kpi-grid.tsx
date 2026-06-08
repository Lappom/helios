import { formatPriceCents } from "@/lib/validators/coach-profile";
import type { RevenueDashboard } from "@/lib/revenue/types";

type RevenueKpiGridProps = {
  dashboard: RevenueDashboard;
};

export function RevenueKpiGrid({ dashboard }: RevenueKpiGridProps) {
  const { currentMonth } = dashboard;

  const cards = [
    {
      label: "Revenus du mois",
      value: formatPriceCents(currentMonth.totalRevenueCents),
      highlight: true,
    },
    {
      label: "MRR",
      value: formatPriceCents(currentMonth.mrrCents),
      highlight: true,
    },
    {
      label: "One-shot",
      value: formatPriceCents(currentMonth.oneTimeRevenueCents),
      highlight: false,
    },
    {
      label: "Paiements",
      value: String(currentMonth.paymentCount),
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border-hairline bg-surface-card rounded-lg border p-6"
        >
          <p className="text-caption-uppercase text-muted">{card.label}</p>
          <p
            className={
              card.highlight
                ? "text-primary text-stat-display mt-2 font-bold tracking-tight"
                : "text-on-dark text-title-lg mt-2 font-bold"
            }
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
