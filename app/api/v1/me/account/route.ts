import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { getClientOrThrow } from "@/lib/clients/service";
import {
  assertEraseEmailConfirmation,
  eraseClientData,
} from "@/lib/privacy/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { eraseAccountSchema } from "@/lib/validators/privacy";

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const client = await requireClient();
    const body = await parseJsonBody(eraseAccountSchema, request);
    const record = await getClientOrThrow(
      client.organizationId,
      client.clientId,
    );

    assertEraseEmailConfirmation(record.email, body.confirmEmail);

    await eraseClientData(
      client.organizationId,
      client.clientId,
      { type: "client", clerkUserId: client.clerkUserId },
      { request },
    );

    return jsonOk({ ok: true });
  },
);
