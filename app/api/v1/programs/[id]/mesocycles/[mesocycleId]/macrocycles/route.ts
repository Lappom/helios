import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMesocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createMacrocycle } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { createMacrocycleSchema } from "@/lib/validators/programs";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const mesocycleId = getMesocycleIdFromPath(request);
    const body = await parseJsonBody(createMacrocycleSchema, request);
    const program = await createMacrocycle(
      org.organizationId,
      programId,
      mesocycleId,
      body,
    );
    return jsonOk(program, { status: 201 });
  },
);
