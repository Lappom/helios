import type {
  ApiKeyListItem,
  CreatedApiKeyResponse,
  CreatedWebhookResponse,
  WebhookDeliveryItem,
  WebhookListItem,
} from "./types";
import type {
  CreateApiKeyInput,
  CreateWebhookInput,
  UpdateWebhookInput,
} from "@/lib/validators/integrations";

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

export async function fetchApiKeys(): Promise<{ items: ApiKeyListItem[] }> {
  const response = await fetch("/api/v1/integrations/api-keys");
  return parseResponse(response);
}

export async function createApiKeyRequest(
  input: CreateApiKeyInput,
): Promise<CreatedApiKeyResponse> {
  const response = await fetch("/api/v1/integrations/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function revokeApiKeyRequest(apiKeyId: string): Promise<void> {
  const response = await fetch(`/api/v1/integrations/api-keys/${apiKeyId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function fetchWebhooks(): Promise<{ items: WebhookListItem[] }> {
  const response = await fetch("/api/v1/integrations/webhooks");
  return parseResponse(response);
}

export async function createWebhookRequest(
  input: CreateWebhookInput,
): Promise<CreatedWebhookResponse> {
  const response = await fetch("/api/v1/integrations/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function updateWebhookRequest(
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookListItem> {
  const response = await fetch(`/api/v1/integrations/webhooks/${webhookId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteWebhookRequest(webhookId: string): Promise<void> {
  const response = await fetch(`/api/v1/integrations/webhooks/${webhookId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function testWebhookRequest(
  webhookId: string,
): Promise<{ deliveryId: string }> {
  const response = await fetch(
    `/api/v1/integrations/webhooks/${webhookId}/test`,
    { method: "POST" },
  );
  return parseResponse(response);
}

export async function fetchWebhookDeliveries(
  webhookId: string,
): Promise<{ items: WebhookDeliveryItem[] }> {
  const response = await fetch(
    `/api/v1/integrations/webhooks/${webhookId}/deliveries?limit=10`,
  );
  return parseResponse(response);
}
