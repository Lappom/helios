import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { reorderMesocycles } from "@/lib/programs/periodization";
import { parseJsonBody } from "@/lib/validators/clients";
import { reorderSchema } from "@/lib/validators/programs";

export const PUT = withApiHandler(
  { requireOrg: true, requireFeature: "periodization" },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const body = await parseJsonBody(reorderSchema, request);
    const program = await reorderMesocycles(
      org.organizationId,
      programId,
      body.ids,
    );
    return jsonOk(program);
  },
);
