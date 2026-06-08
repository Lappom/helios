import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getWeekIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createSession } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createSessionSchema } from "@/lib/validators/programs";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const weekId = getWeekIdFromPath(request);
  const body = await parseJsonBody(createSessionSchema, request);
  const program = await createSession(
    org.organizationId,
    programId,
    weekId,
    body,
  );

  return jsonOk(program, { status: 201 });
});
