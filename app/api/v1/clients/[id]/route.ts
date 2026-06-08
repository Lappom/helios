import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getClientIdFromPath } from "@/lib/api/client-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { getClientDetail, getClientOrThrow } from "@/lib/clients/service";
import {
  assertEraseEmailConfirmation,
  eraseClientData,
} from "@/lib/privacy/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { eraseAccountSchema } from "@/lib/validators/privacy";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getClientIdFromPath(request);
  const client = await getClientDetail(org.organizationId, id);

  return jsonOk(client);
});

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const clientId = getClientIdFromPath(request);
    const body = await parseJsonBody(eraseAccountSchema, request);
    const client = await getClientOrThrow(org.organizationId, clientId);

    assertEraseEmailConfirmation(client.email, body.confirmEmail);

    await eraseClientData(org.organizationId, clientId, {
      type: "coach",
      clerkUserId: org.clerkUserId,
    }, { request });

    return jsonOk({ ok: true });
  },
);
