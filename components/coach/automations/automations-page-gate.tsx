"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/billing/feature-gate";
import { AutomationsListClient } from "./automations-list-client";
import type { AutomationListItem } from "@/lib/automations/types";

type AutomationsPageGateProps = {
  initialAutomations?: AutomationListItem[];
  children?: React.ReactNode;
};

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        Automatisations — Business+
      </p>
      <p className="text-body-sm text-muted mx-auto max-w-md">
        Créez des workflows trigger → actions pour onboarder vos clients,
        assigner des programmes et envoyer des messages automatiquement.
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function AutomationsPageGate({
  initialAutomations = [],
  children,
}: AutomationsPageGateProps) {
  return (
    <FeatureGate feature="automations" fallback={<UpgradeFallback />}>
      {children ?? (
        <AutomationsListClient initialAutomations={initialAutomations} />
      )}
    </FeatureGate>
  );
}
