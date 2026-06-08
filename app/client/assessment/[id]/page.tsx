import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AssessmentWizardClient } from "@/components/client/assessment/assessment-wizard-client";
import { getOrgContext } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { getAssessmentDetail } from "@/lib/assessments/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientAssessmentPage({ params }: PageProps) {
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
  const assessment = await getAssessmentDetail(org.organizationId, id);

  if (assessment.clientId !== clientId) {
    redirect("/client");
  }

  return (
    <AssessmentWizardClient assessmentId={id} initialAssessment={assessment} />
  );
}
