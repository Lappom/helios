import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMacrocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createMicrocycle } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { createMicrocycleSchema } from "@/lib/validators/programs";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const macrocycleId = getMacrocycleIdFromPath(request);
    const body = await parseJsonBody(createMicrocycleSchema, request);
    const program = await createMicrocycle(
      org.organizationId,
      programId,
      macrocycleId,
      body,
    );
    return jsonOk(program, { status: 201 });
  },
);
