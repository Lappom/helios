import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getMesocycleIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { duplicateMesocycle } from "@/lib/programs/periodization";

export const POST = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const mesocycleId = getMesocycleIdFromPath(request);
    const program = await duplicateMesocycle(
      org.organizationId,
      programId,
      mesocycleId,
    );
    return jsonOk(program, { status: 201 });
  },
);
