import { requireRole } from "@/lib/auth/org-context";
import { AssessmentTemplatesPageClient } from "@/components/coach/assessments/assessment-templates-page-client";
import {
  listAssessmentTemplates,
  seedDefaultTemplateIfMissing,
} from "@/lib/assessments/service";

export default async function CoachAssessmentsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  await seedDefaultTemplateIfMissing(org.organizationId, org.clerkUserId);

  const { items } = await listAssessmentTemplates(org.organizationId, {
    page: 1,
    limit: 100,
    offset: 0,
  });

  return <AssessmentTemplatesPageClient initialTemplates={items} />;
}
