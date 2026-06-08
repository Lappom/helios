import { Suspense } from "react";
import { CoachMessagesClient } from "@/components/coach/messaging/coach-messages-client";
import { requireRole } from "@/lib/auth/org-context";
import { listAllClientsForKanban } from "@/lib/clients/service";
import { listConversationsForCoach } from "@/lib/messaging/service";

export default async function CoachMessagesPage() {
  const org = await requireRole("org_owner", "org_admin", "coach", "assistant");

  const [conversationsResult, clients] = await Promise.all([
    listConversationsForCoach(org.organizationId, org.clerkUserId, {
      page: 1,
      limit: 200,
      offset: 0,
    }),
    listAllClientsForKanban(org.organizationId),
  ]);

  return (
    <Suspense fallback={null}>
      <CoachMessagesClient
        organizationId={org.organizationId}
        clerkUserId={org.clerkUserId}
        initialConversations={conversationsResult.items}
        clients={clients.map((client) => ({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
        }))}
      />
    </Suspense>
  );
}
