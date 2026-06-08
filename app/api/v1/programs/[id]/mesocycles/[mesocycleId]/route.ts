import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMesocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteMesocycle, patchMesocycle } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchMesocycleSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const mesocycleId = getMesocycleIdFromPath(request);
    const body = await parseJsonBody(patchMesocycleSchema, request);
    const program = await patchMesocycle(
      org.organizationId,
      programId,
      mesocycleId,
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
    const mesocycleId = getMesocycleIdFromPath(request);
    const program = await deleteMesocycle(
      org.organizationId,
      programId,
      mesocycleId,
    );
    return jsonOk(program);
  },
);
