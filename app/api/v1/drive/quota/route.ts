import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getDriveStorageQuota } from "@/lib/drive/service";

export const GET = withApiHandler({ requireOrg: true }, async () => {
  const org = await requireCoachRead();
  const quota = await getDriveStorageQuota(
    org.organizationId,
    org.planTier,
  );

  return jsonOk(quota);
});
