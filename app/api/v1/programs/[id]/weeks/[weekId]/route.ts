import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getWeekIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteWeek, patchWeek } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchWeekSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const weekId = getWeekIdFromPath(request);
  const body = await parseJsonBody(patchWeekSchema, request);
  const program = await patchWeek(org.organizationId, programId, weekId, body);

  return jsonOk(program);
});

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const weekId = getWeekIdFromPath(request);
    const program = await deleteWeek(org.organizationId, programId, weekId);

    return jsonOk(program);
  },
);
