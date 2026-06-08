import { ClientDrivePageClient } from "@/components/client/drive/client-drive-page-client";
import { requireClient } from "@/lib/api/require-client";
import { listClientOwnDrive } from "@/lib/drive/service";

export default async function ClientDrivePage() {
  const client = await requireClient();
  const items = await listClientOwnDrive(
    client.organizationId,
    client.clientId,
  );

  return <ClientDrivePageClient initialFiles={items} />;
}
