import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { QuestionnaireWizardClient } from "@/components/client/questionnaires/questionnaire-wizard-client";
import { getOrgContext } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { getQuestionnaireSubmissionDetail } from "@/lib/questionnaires/service";
import type { QuestionnaireSubmissionDetail } from "@/lib/questionnaires/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientQuestionnairePage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const org = await getOrgContext();
  if (!org || org.role !== "client") {
    redirect("/coach");
  }

  const clientId = await getClientIdForUser(org.organizationId, userId);
  if (!clientId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  let submission: QuestionnaireSubmissionDetail;
  try {
    submission = await getQuestionnaireSubmissionDetail(
      org.organizationId,
      id,
      clientId,
    );
  } catch {
    redirect("/client");
  }

  return (
    <QuestionnaireWizardClient
      submissionId={id}
      initialSubmission={submission}
    />
  );
}
