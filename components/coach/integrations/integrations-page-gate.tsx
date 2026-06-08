"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureGate } from "@/components/billing/feature-gate";
import { IntegrationsPageClient } from "./integrations-page-client";
import type { ApiKeyListItem, WebhookListItem } from "@/lib/integrations/types";

type IntegrationsPageGateProps = {
  initialApiKeys: ApiKeyListItem[];
  initialWebhooks: WebhookListItem[];
};

function UpgradeFallback() {
  return (
    <div className="border-hairline bg-surface-card space-y-4 rounded-lg border p-8 text-center">
      <p className="text-title-md text-on-dark font-semibold">
        API &amp; intégrations — Business+
      </p>
      <p className="text-body-sm text-muted mx-auto max-w-md">
        Connectez Zapier, Make ou vos outils via clés API et webhooks sortants
        pour synchroniser clients, paiements et séances.
      </p>
      <Button asChild>
        <Link href="/tarifs">Voir les plans</Link>
      </Button>
    </div>
  );
}

export function IntegrationsPageGate(props: IntegrationsPageGateProps) {
  return (
    <FeatureGate feature="api_access" fallback={<UpgradeFallback />}>
      <IntegrationsPageClient {...props} />
    </FeatureGate>
  );
}
