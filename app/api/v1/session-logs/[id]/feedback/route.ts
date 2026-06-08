import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getSessionLogIdFromPath } from "@/lib/api/session-feedback-route";
import { requireClient } from "@/lib/api/require-client";
import { problem } from "@/lib/api/response";
import { submitSessionFeedback } from "@/lib/session-feedback/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { submitSessionFeedbackSchema } from "@/lib/validators/session-feedback";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const client = await requireClient();
  const sessionLogId = getSessionLogIdFromPath(request);

  if (!sessionLogId) {
    throw problem({
      type: "validation-error",
      title: "Invalid session log id",
      status: 400,
      detail: "Session log id is required.",
    });
  }

  const body = await parseJsonBody(submitSessionFeedbackSchema, request);
  const feedback = await submitSessionFeedback(
    client.organizationId,
    client.clientId,
    sessionLogId,
    body,
  );

  return jsonOk(feedback, { status: 201 });
});
