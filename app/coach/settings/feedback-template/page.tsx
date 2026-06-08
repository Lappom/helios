import { notFound } from "next/navigation";
import { FeedbackTemplateEditorGate } from "@/components/coach/session-feedback/feedback-template-editor-client";
import { requireRole } from "@/lib/auth/org-context";
import {
  getDefaultFeedbackTemplateTree,
  seedDefaultFeedbackTemplateIfMissing,
} from "@/lib/session-feedback/service";

export default async function CoachFeedbackTemplateSettingsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach");

  await seedDefaultFeedbackTemplateIfMissing(
    org.organizationId,
    org.clerkUserId,
  );

  const template = await getDefaultFeedbackTemplateTree(org.organizationId);

  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <FeedbackTemplateEditorGate initialTemplate={template} />
    </div>
  );
}
