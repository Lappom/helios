export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CreatedApiKeyResponse = ApiKeyListItem & {
  secret: string;
};

export type WebhookListItem = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreatedWebhookResponse = WebhookListItem & {
  secret: string;
};

export type WebhookDeliveryItem = {
  id: string;
  event: string;
  status: string;
  httpStatus: number | null;
  attemptCount: number;
  deliveredAt: string | null;
  createdAt: string;
};
