import { PrivacySettings } from "@/components/client/settings/privacy-settings";
import { requireClient } from "@/lib/api/require-client";
import { getClientOrThrow } from "@/lib/clients/service";
import { getDb, runWithDbScope } from "@/lib/db";

export default async function ClientSettingsPage() {
  const client = await requireClient();
  const record = await runWithDbScope(
    { organizationId: client.organizationId },
    () => getClientOrThrow(client.organizationId, client.clientId),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-24 md:pb-6">
      <PrivacySettings clientEmail={record.email} />
    </div>
  );
}
