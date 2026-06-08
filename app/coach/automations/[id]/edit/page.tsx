import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/org-context";
import { AutomationEditorClient } from "@/components/coach/automations/automation-editor-client";
import { AutomationsPageGate } from "@/components/coach/automations/automations-page-gate";
import { getAutomationTree } from "@/lib/automations/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CoachAutomationEditPage({ params }: PageProps) {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  const { id } = await params;

  let automation;
  try {
    automation = await getAutomationTree(org.organizationId, id);
  } catch {
    notFound();
  }

  return (
    <AutomationsPageGate>
      <AutomationEditorClient initialAutomation={automation} />
    </AutomationsPageGate>
  );
}
