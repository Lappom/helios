import { notFound } from "next/navigation";
import { AssessmentDetailClient } from "@/components/coach/assessments/assessment-detail-client";
import { requireRole } from "@/lib/auth/org-context";
import {
  compareClientAssessments,
  getAssessmentDetail,
} from "@/lib/assessments/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachAssessmentDetailPage({ params }: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { id } = await params;

  try {
    const assessment = await getAssessmentDetail(org.organizationId, id);
    const compare = await compareClientAssessments(
      org.organizationId,
      assessment.clientId,
      assessment.id,
    );
    return (
      <AssessmentDetailClient
        initialAssessment={assessment}
        initialCompare={compare}
      />
    );
  } catch {
    notFound();
  }
}
