import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getSessionIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { reorderBlocks } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderSchema } from "@/lib/validators/programs";

export const PUT = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const sessionId = getSessionIdFromPath(request);
  const body = await parseJsonBody(reorderSchema, request);
  const program = await reorderBlocks(
    org.organizationId,
    programId,
    sessionId,
    body.ids,
  );

  return jsonOk(program);
});
