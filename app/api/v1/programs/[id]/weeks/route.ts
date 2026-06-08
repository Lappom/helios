import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createWeek } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createWeekSchema } from "@/lib/validators/programs";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const body = await parseJsonBody(createWeekSchema, request);
  const program = await createWeek(org.organizationId, programId, body);

  return jsonOk(program, { status: 201 });
});
