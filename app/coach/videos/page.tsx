import { VideosPageClient } from "@/components/coach/videos/videos-page-client";
import { requireRole } from "@/lib/auth/org-context";
import { listCategories, listVideos } from "@/lib/videos/service";

export default async function CoachVideosPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");

  const [categories, videosResult] = await Promise.all([
    listCategories(org.organizationId),
    listVideos(org.organizationId, {
      page: 1,
      limit: 100,
      offset: 0,
    }),
  ]);

  return (
    <VideosPageClient
      planTier={org.planTier}
      initialCategories={categories}
      initialVideos={videosResult.items}
      initialTotal={videosResult.total}
    />
  );
}
