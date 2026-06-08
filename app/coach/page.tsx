import { DemoGridCard } from "@/components/design/demo-grid-card";
import { TrialBanner } from "@/components/billing/trial-banner";
import { FeedbackAlertsPanel } from "@/components/coach/session-feedback/feedback-alerts-panel";

const kpiCards = [
  { title: "Clients actifs", metric: "—", metricLabel: "Ce mois" },
  { title: "Séances", metric: "—", metricLabel: "Cette semaine" },
  { title: "Messages", metric: "—", metricLabel: "Non lus" },
  { title: "Revenus", metric: "—", metricLabel: "Ce mois" },
];

export default function CoachDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <TrialBanner />
      <div>
        <h1 className="text-display-sm text-on-dark font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-body-md text-muted mt-2">
          Vue d&apos;ensemble de votre activité coaching.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <DemoGridCard
            key={card.title}
            title={card.title}
            metric={card.metric}
            metricLabel={card.metricLabel}
          />
        ))}
      </div>
      <FeedbackAlertsPanel />
    </div>
  );
}
