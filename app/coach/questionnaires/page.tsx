import { QuestionnairesPageGate } from "@/components/coach/questionnaires/questionnaires-page-client";
import { requireRole } from "@/lib/auth/org-context";
import {
  getQuestionnaireSubmissionStats,
  listQuestionnaires,
  seedDefaultQuestionnairesIfMissing,
} from "@/lib/questionnaires/service";

export default async function CoachQuestionnairesPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");

  await seedDefaultQuestionnairesIfMissing(org.organizationId, org.clerkUserId);

  const [{ items }, stats] = await Promise.all([
    listQuestionnaires(org.organizationId, {
      page: 1,
      limit: 100,
      offset: 0,
    }),
    getQuestionnaireSubmissionStats(org.organizationId),
  ]);

  return (
    <QuestionnairesPageGate
      initialQuestionnaires={items}
      initialStats={stats}
    />
  );
}
