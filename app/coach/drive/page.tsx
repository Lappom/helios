import { DrivePageClient } from "@/components/coach/drive/drive-page-client";
import { requireRole } from "@/lib/auth/org-context";
import {
  getDriveStorageQuota,
  getFolderTree,
  listFolderContents,
} from "@/lib/drive/service";

export default async function CoachDrivePage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");

  const [tree, contents, quota] = await Promise.all([
    getFolderTree(org.organizationId),
    listFolderContents(org.organizationId, null, {
      page: 1,
      limit: 100,
      offset: 0,
    }),
    getDriveStorageQuota(org.organizationId, org.planTier),
  ]);

  return (
    <DrivePageClient
      organizationId={org.organizationId}
      planTier={org.planTier}
      initialTree={tree}
      initialContents={contents}
      initialQuota={quota}
    />
  );
}
