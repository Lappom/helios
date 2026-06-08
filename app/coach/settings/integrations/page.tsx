import { IntegrationsPageGate } from "@/components/coach/integrations/integrations-page-gate";
import { requireRole } from "@/lib/auth/org-context";
import { listApiKeys } from "@/lib/integrations/api-keys";
import { listWebhooks } from "@/lib/integrations/webhooks";

export default async function CoachIntegrationsSettingsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach");

  const [apiKeys, webhooks] = await Promise.all([
    listApiKeys(org.organizationId),
    listWebhooks(org.organizationId),
  ]);

  return (
    <IntegrationsPageGate
      initialApiKeys={apiKeys.map((key) => ({
        ...key,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      }))}
      initialWebhooks={webhooks.map((webhook) => ({
        ...webhook,
        createdAt: webhook.createdAt.toISOString(),
        updatedAt: webhook.updatedAt.toISOString(),
      }))}
    />
  );
}
