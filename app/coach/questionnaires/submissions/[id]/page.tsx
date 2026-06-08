import { notFound } from "next/navigation";
import { QuestionnaireSubmissionDetailClient } from "@/components/coach/questionnaires/questionnaire-submission-detail-client";
import { requireRole } from "@/lib/auth/org-context";
import { getQuestionnaireSubmissionDetail } from "@/lib/questionnaires/service";
import type { QuestionnaireSubmissionDetail } from "@/lib/questionnaires/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachQuestionnaireSubmissionPage({
  params,
}: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { id } = await params;

  let submission: QuestionnaireSubmissionDetail;
  try {
    submission = await getQuestionnaireSubmissionDetail(
      org.organizationId,
      id,
    );
  } catch {
    notFound();
  }

  return <QuestionnaireSubmissionDetailClient submission={submission} />;
}
