export function conversationChannel(
  organizationId: string,
  conversationId: string,
): string {
  return `org:${organizationId}:conversation:${conversationId}`;
}

export function organizationConversationCapability(
  organizationId: string,
): Record<string, string[]> {
  return {
    [`org:${organizationId}:conversation:*`]: [
      "subscribe",
      "publish",
      "presence",
    ],
  };
}
