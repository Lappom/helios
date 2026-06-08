import { Suspense } from "react";
import { requireRole } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { ClientMessagesClient } from "@/components/client/messaging/client-messages-client";
import { listConversationsForClient } from "@/lib/messaging/service";

export default async function ClientMessagesPage() {
  const org = await requireRole("client");
  const clientId = await getClientIdForUser(org.organizationId, org.clerkUserId);

  const conversations = clientId
    ? await listConversationsForClient(
        org.organizationId,
        clientId,
        org.clerkUserId,
      )
    : [];

  return (
    <Suspense fallback={null}>
      <ClientMessagesClient
        organizationId={org.organizationId}
        clerkUserId={org.clerkUserId}
        initialConversations={conversations}
      />
    </Suspense>
  );
}
