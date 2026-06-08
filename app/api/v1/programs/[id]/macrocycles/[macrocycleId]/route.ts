import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMacrocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteMacrocycle, patchMacrocycle } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchMacrocycleSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const macrocycleId = getMacrocycleIdFromPath(request);
    const body = await parseJsonBody(patchMacrocycleSchema, request);
    const program = await patchMacrocycle(
      org.organizationId,
      programId,
      macrocycleId,
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
    const macrocycleId = getMacrocycleIdFromPath(request);
    const program = await deleteMacrocycle(
      org.organizationId,
      programId,
      macrocycleId,
    );
    return jsonOk(program);
  },
);
