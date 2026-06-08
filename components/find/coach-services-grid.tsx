import { PricingTierCard } from "@/components/design/pricing-tier-card";
import { cn } from "@/lib/utils";
import type { CoachServiceDto } from "@/lib/coach-profile/service";
import { formatPriceCents } from "@/lib/validators/coach-profile";

const SERVICE_TYPE_LABELS = {
  assessment: "Bilan",
  coaching: "Coaching",
  call: "Appel",
} as const;

type CoachServicesGridProps = {
  services: CoachServiceDto[];
  coachSlug?: string;
  referralCode?: string;
  className?: string;
};

function buildCheckoutHref(serviceId: string, referralCode?: string): string {
  const base = `/checkout/${serviceId}`;
  if (!referralCode?.trim()) {
    return base;
  }
  return `${base}?ref=${encodeURIComponent(referralCode.trim())}`;
}

export function CoachServicesGrid({
  services,
  coachSlug,
  referralCode,
  className,
}: CoachServicesGridProps) {
  if (services.length === 0) {
    return (
      <section className={cn("py-section bg-surface-soft", className)}>
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-display-sm text-on-dark mb-4 font-bold tracking-tight">
            Prestations
          </h2>
          <div className="border-hairline bg-surface-card rounded-lg border p-8 text-center">
            <p className="text-body-md text-muted">
              Aucune prestation disponible pour le moment.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("py-section bg-surface-soft", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-display-sm text-on-dark mb-8 font-bold tracking-tight">
          Prestations
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <PricingTierCard
                name={service.name}
                price={formatPriceCents(service.priceCents, service.currency)}
                period=""
                description={service.description ?? SERVICE_TYPE_LABELS[service.type]}
                features={[
                  `${service.durationMinutes} minutes`,
                  service.isOnline ? "En ligne" : "En présentiel",
                  service.bookingEnabled
                    ? "Réservation en ligne"
                    : "Contact direct",
                ]}
                featured={index === 0}
                ctaLabel={service.bookingEnabled ? "Réserver" : "Commander"}
                ctaHref={buildCheckoutHref(service.id, referralCode)}
                hideCta={!coachSlug}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
