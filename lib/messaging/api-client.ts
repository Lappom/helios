import type {
  ConversationListItem,
  MessageItem,
} from "@/lib/messaging/types";
import type {
  CreateDirectConversationInput,
  MarkReadInput,
  SendMessageInput,
} from "@/lib/validators/messaging";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchConversations(params?: {
  page?: number;
  limit?: number;
  mine?: boolean;
}): Promise<{ items: ConversationListItem[]; page: number; limit: number }> {
  const search = new URLSearchParams();
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }
  if (params?.mine) {
    search.set("mine", "true");
  }

  const query = search.toString();
  const response = await fetch(
    `/api/v1/conversations${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export async function createDirectConversation(
  input: CreateDirectConversationInput,
): Promise<ConversationListItem> {
  const response = await fetch("/api/v1/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchMessages(
  conversationId: string,
  params?: { page?: number; limit?: number },
): Promise<{ items: MessageItem[]; page: number; limit: number }> {
  const search = new URLSearchParams();
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();
  const response = await fetch(
    `/api/v1/conversations/${conversationId}/messages${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export async function sendMessageRequest(
  conversationId: string,
  input: SendMessageInput,
): Promise<MessageItem> {
  const response = await fetch(
    `/api/v1/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function markConversationReadRequest(
  conversationId: string,
  input?: MarkReadInput,
): Promise<{ lastReadAt: string }> {
  const response = await fetch(`/api/v1/conversations/${conversationId}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return parseResponse(response);
}

export async function uploadMessageMedia(
  conversationId: string,
  file: File,
): Promise<{
  pathname: string;
  mimeType: string;
  fileName: string;
  mediaType: "image" | "video" | "audio" | "file";
}> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(
    `/api/v1/conversations/${conversationId}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  return parseResponse(response);
}

export function messageMediaUrl(
  conversationId: string,
  messageId: string,
): string {
  return `/api/v1/conversations/${conversationId}/messages/${messageId}/media`;
}

export async function fetchAblyToken(): Promise<{
  tokenRequest: import("ably").TokenRequest;
}> {
  const response = await fetch("/api/v1/realtime/ably-token");
  return parseResponse(response);
}
