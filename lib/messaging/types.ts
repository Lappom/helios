import type { MESSAGE_TYPES } from "@/lib/validators/messaging";

export type MessageType = (typeof MESSAGE_TYPES)[number];

export type ConversationListItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  clientLastReadAt: string | null;
  coachLastReadAt: string | null;
};

export type MessageItem = {
  id: string;
  conversationId: string;
  senderClerkUserId: string;
  type: MessageType;
  content: string | null;
  mediaPathname: string | null;
  fileName: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  isOwn: boolean;
};

export type ConversationDetail = ConversationListItem & {
  messages: MessageItem[];
};

export type MessagingActor =
  | { role: "coach"; organizationId: string; clerkUserId: string }
  | {
      role: "client";
      organizationId: string;
      clerkUserId: string;
      clientId: string;
    };
