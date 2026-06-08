import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getSessionIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteSession, patchSession } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchSessionSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const sessionId = getSessionIdFromPath(request);
  const body = await parseJsonBody(patchSessionSchema, request);
  const program = await patchSession(
    org.organizationId,
    programId,
    sessionId,
    body,
  );

  return jsonOk(program);
});

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const sessionId = getSessionIdFromPath(request);
    const program = await deleteSession(
      org.organizationId,
      programId,
      sessionId,
    );

    return jsonOk(program);
  },
);
