import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { requireClient } from "@/lib/api/require-client";
import { getProgramSessionIdFromPath } from "@/lib/api/session-route";
import { problem } from "@/lib/api/response";
import { completeSession } from "@/lib/sessions/service";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import { parseJsonBody } from "@/lib/validators/clients";
import { completeSessionSchema } from "@/lib/validators/sessions";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const programSessionId = getProgramSessionIdFromPath(request);

  if (!programSessionId) {
    throw problem({
      type: "validation-error",
      title: "Invalid session id",
      status: 400,
      detail: "Program session id is required.",
    });
  }

  const body = await parseJsonBody(completeSessionSchema, request);
  const result = await completeSession(
    client.organizationId,
    client.clientId,
    programSessionId,
    body,
  );

  emitHeliosEvent("session.completed", {
    organizationId: client.organizationId,
    clientId: client.clientId,
    sessionLogId: result.recap.sessionLogId,
    programSessionId,
  });

  return jsonOk(result);
});
