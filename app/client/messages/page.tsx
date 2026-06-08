import { requireRole } from "@/lib/auth/org-context";
import { getClientIdForUser } from "@/lib/api/require-client";
import { ClientMessagesClient } from "@/components/client/messaging/client-messages-client";
import { getClientConversation } from "@/lib/messaging/service";

export default async function ClientMessagesPage() {
  const org = await requireRole("client");
  const clientId = await getClientIdForUser(org.organizationId, org.clerkUserId);

  const conversation = clientId
    ? await getClientConversation(
        org.organizationId,
        clientId,
        org.clerkUserId,
      )
    : null;

  return (
    <ClientMessagesClient
      organizationId={org.organizationId}
      clerkUserId={org.clerkUserId}
      initialConversation={conversation}
    />
  );
}
