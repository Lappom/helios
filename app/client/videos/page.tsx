import { ClientVideosPageClient } from "@/components/client/videos/client-videos-page-client";
import { requireClient } from "@/lib/api/require-client";
import { listClientVideoFeed } from "@/lib/videos/service";

export default async function ClientVideosPage() {
  const client = await requireClient();
  const categories = await listClientVideoFeed(
    client.organizationId,
    client.clientId,
  );

  return <ClientVideosPageClient initialCategories={categories} />;
}
