import { notFound } from "next/navigation";
import { QuestionnaireEditorGate } from "@/components/coach/questionnaires/questionnaire-editor-client";
import { requireRole } from "@/lib/auth/org-context";
import { getQuestionnaireTree } from "@/lib/questionnaires/service";
import type { QuestionnaireTree } from "@/lib/questionnaires/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachQuestionnaireEditPage({ params }: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach");
  const { id } = await params;

  let questionnaire: QuestionnaireTree;
  try {
    questionnaire = await getQuestionnaireTree(org.organizationId, id);
  } catch {
    notFound();
  }

  return <QuestionnaireEditorGate initialQuestionnaire={questionnaire} />;
}
