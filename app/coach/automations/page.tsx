import { requireRole } from "@/lib/auth/org-context";
import { AutomationsPageGate } from "@/components/coach/automations/automations-page-gate";
import { listAutomations } from "@/lib/automations/service";
import { seedSystemAutomations } from "@/lib/automations/seed";

export default async function CoachAutomationsPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");
  await seedSystemAutomations(org.organizationId, org.clerkUserId);

  const { items } = await listAutomations(org.organizationId, {
    page: 1,
    limit: 100,
    offset: 0,
  });

  return <AutomationsPageGate initialAutomations={items} />;
}
