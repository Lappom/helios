import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getWeekIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { reorderSessions } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderSchema } from "@/lib/validators/programs";

export const PUT = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const weekId = getWeekIdFromPath(request);
  const body = await parseJsonBody(reorderSchema, request);
  const program = await reorderSessions(
    org.organizationId,
    programId,
    weekId,
    body.ids,
  );

  return jsonOk(program);
});
