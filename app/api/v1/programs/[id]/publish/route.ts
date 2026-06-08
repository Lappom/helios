import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { publishProgram } from "@/lib/programs/service";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getProgramIdFromPath(request);
  const program = await publishProgram(org.organizationId, id);

  return jsonOk(program);
});
