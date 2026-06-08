import type { MessageItem } from "@/lib/messaging/types";
import { getAblyRestClient } from "@/lib/realtime/ably-server";
import { conversationChannel } from "@/lib/realtime/channels";

async function publishEvent(
  organizationId: string,
  conversationId: string,
  name: string,
  data: unknown,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[ably:stub] ${name}`, { organizationId, conversationId, data });
    }
    return;
  }

  const channel = client.channels.get(
    conversationChannel(organizationId, conversationId),
  );

  await channel.publish(name, data);
}

export async function publishMessageNew(
  organizationId: string,
  conversationId: string,
  message: MessageItem,
): Promise<void> {
  await publishEvent(organizationId, conversationId, "message.new", { message });
}

export async function publishMessageRead(
  organizationId: string,
  conversationId: string,
  payload: { clerkUserId: string; lastReadAt: string },
): Promise<void> {
  await publishEvent(organizationId, conversationId, "message.read", payload);
}

export async function publishTyping(
  organizationId: string,
  conversationId: string,
  payload: { clerkUserId: string; isTyping: boolean },
): Promise<void> {
  await publishEvent(organizationId, conversationId, "typing", payload);
}
