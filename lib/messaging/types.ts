import type { MESSAGE_TYPES } from "@/lib/validators/messaging";

export type MessageType = (typeof MESSAGE_TYPES)[number];

export type ConversationType = "direct" | "group";

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  name?: string;
  participantCount?: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  clientLastReadAt: string | null;
  coachLastReadAt: string | null;
};

export type GroupParticipantItem = {
  clientId: string;
  clerkUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
};

export type MessageItem = {
  id: string;
  conversationId: string;
  senderClerkUserId: string;
  senderDisplayName?: string;
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
