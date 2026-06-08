import Ably from "ably";

let restClient: Ably.Rest | null = null;

export function getAblyRestClient(): Ably.Rest | null {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!restClient) {
    restClient = new Ably.Rest({ key: apiKey });
  }

  return restClient;
}

export async function createAblyTokenRequest(params: {
  clientId: string;
  capability: Record<string, string[]>;
}): Promise<Ably.TokenRequest | null> {
  const client = getAblyRestClient();
  if (!client) {
    return null;
  }

  return client.auth.createTokenRequest({
    clientId: params.clientId,
    capability: JSON.stringify(params.capability),
  });
}
