import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createMesocycle } from "@/lib/programs/periodization";
import { getProgramTree } from "@/lib/programs/program-queries";
import { parseJsonBody } from "@/lib/validators/clients";
import { createMesocycleSchema } from "@/lib/validators/programs";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const body = await parseJsonBody(createMesocycleSchema, request);
    const program = await createMesocycle(org.organizationId, programId, body);
    return jsonOk(program, { status: 201 });
  },
);

export const GET = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const program = await getProgramTree(org.organizationId, programId);
    return jsonOk(program.mesocycles);
  },
);
