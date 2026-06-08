import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getProgramIdFromPath,
  getSessionIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { createBlock } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { createBlockSchema } from "@/lib/validators/programs";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const sessionId = getSessionIdFromPath(request);
  const body = await parseJsonBody(createBlockSchema, request);
  const program = await createBlock(
    org.organizationId,
    programId,
    sessionId,
    body,
  );

  return jsonOk(program, { status: 201 });
});
