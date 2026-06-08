import { formatPriceCents } from "@/lib/validators/coach-profile";
import type { RevenueByClientReport } from "@/lib/revenue/types";

type TopClientsPanelProps = {
  report: RevenueByClientReport;
};

export function TopClientsPanel({ report }: TopClientsPanelProps) {
  return (
    <div className="border-hairline bg-surface-card rounded-lg border p-6">
      <h2 className="text-title-md text-on-dark mb-4 font-semibold">
        Top clients
      </h2>
      {report.clients.length === 0 ? (
        <p className="text-muted text-sm">Aucun paiement enregistré.</p>
      ) : (
        <ul className="space-y-3">
          {report.clients.slice(0, 5).map((client, index) => (
            <li
              key={client.clientId ?? `anonymous-${index}`}
              className="border-hairline flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-on-dark text-sm font-medium">
                  {client.clientName}
                </p>
                <p className="text-muted text-xs">
                  {client.paymentCount} paiement
                  {client.paymentCount > 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-primary text-sm font-semibold">
                {formatPriceCents(client.totalRevenueCents)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {report.services.length > 0 ? (
        <div className="border-hairline mt-6 border-t pt-4">
          <h3 className="text-caption-uppercase text-muted mb-3">
            Par prestation
          </h3>
          <ul className="space-y-2">
            {report.services.slice(0, 3).map((service, index) => (
              <li
                key={service.serviceId ?? `service-${index}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-body-md text-on-dark truncate">
                  {service.serviceName}
                </span>
                <span className="text-muted shrink-0">
                  {formatPriceCents(service.totalRevenueCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
