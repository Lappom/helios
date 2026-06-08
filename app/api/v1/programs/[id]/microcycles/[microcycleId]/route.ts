import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMicrocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteMicrocycle, patchMicrocycle } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchMicrocycleSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const microcycleId = getMicrocycleIdFromPath(request);
    const body = await parseJsonBody(patchMicrocycleSchema, request);
    const program = await patchMicrocycle(
      org.organizationId,
      programId,
      microcycleId,
      body,
    );
    return jsonOk(program);
  },
);

export const DELETE = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const microcycleId = getMicrocycleIdFromPath(request);
    const program = await deleteMicrocycle(
      org.organizationId,
      programId,
      microcycleId,
    );
    return jsonOk(program);
  },
);
