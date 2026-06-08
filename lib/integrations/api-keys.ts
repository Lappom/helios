import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import type { CreateApiKeyInput } from "@/lib/validators/integrations";

const API_KEY_PREFIX = "hls_";
const API_KEY_SECRET_LENGTH = 32;

export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export type CreatedApiKey = ApiKeyListItem & {
  secret: string;
};

function getApiKeyPepper(): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("API_KEY_PEPPER is not configured.");
  }
  return pepper ?? "dev-api-key-pepper";
}

export function hashApiKey(secret: string): string {
  return createHash("sha256")
    .update(`${getApiKeyPepper()}:${secret}`)
    .digest("hex");
}

function generateApiKeySecret(): string {
  return randomBytes(API_KEY_SECRET_LENGTH).toString("base64url");
}

function toDisplayPrefix(secret: string): string {
  return `${API_KEY_PREFIX}${secret.slice(0, 8)}`;
}

function mapListItem(row: typeof apiKeys.$inferSelect): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export async function listApiKeys(
  organizationId: string,
): Promise<ApiKeyListItem[]> {
  const rows = await getDb().query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, organizationId),
    orderBy: [desc(apiKeys.createdAt)],
  });

  return rows.map(mapListItem);
}

export async function createApiKey(
  organizationId: string,
  createdByClerkUserId: string,
  input: CreateApiKeyInput,
): Promise<CreatedApiKey> {
  const secretBody = generateApiKeySecret();
  const secret = `${API_KEY_PREFIX}${secretBody}`;
  const keyHash = hashApiKey(secret);

  const [row] = await getDb()
    .insert(apiKeys)
    .values({
      organizationId,
      name: input.name,
      keyPrefix: toDisplayPrefix(secretBody),
      keyHash,
      createdByClerkUserId,
    })
    .returning();

  if (!row) {
    throw problem({
      type: "internal-error",
      title: "Failed to create API key",
      status: 500,
      detail: "Could not persist API key.",
    });
  }

  return {
    ...mapListItem(row),
    secret,
  };
}

export async function revokeApiKey(
  organizationId: string,
  apiKeyId: string,
): Promise<void> {
  const row = await getDb().query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.id, apiKeyId),
      eq(apiKeys.organizationId, organizationId),
    ),
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "API key not found",
      status: 404,
      detail: "API key was not found.",
    });
  }

  await getDb()
    .update(apiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyId));
}

export async function verifyApiKey(
  bearerToken: string,
): Promise<{
  apiKeyId: string;
  organizationId: string;
} | null> {
  if (!bearerToken.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashApiKey(bearerToken);

  const row = await getDb().query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)),
    columns: {
      id: true,
      organizationId: true,
    },
  });

  if (!row) {
    return null;
  }

  await getDb()
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return {
    apiKeyId: row.id,
    organizationId: row.organizationId,
  };
}
