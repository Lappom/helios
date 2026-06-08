import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireCoachRead } from "@/lib/api/require-coach";
import { getQuestionnaireSubmissionStats } from "@/lib/questionnaires/service";

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "recurring_questionnaires" },
  async () => {
    const org = await requireCoachRead();
    const stats = await getQuestionnaireSubmissionStats(org.organizationId);
    return jsonOk(stats);
  },
);
