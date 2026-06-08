import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramIdFromPath } from "@/lib/api/program-route";
import { requireCoachRead, requireCoachWrite } from "@/lib/api/require-coach";
import { getProgramTree, patchProgramMetadata } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchProgramSchema } from "@/lib/validators/programs";

export const GET = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachRead();
  const id = getProgramIdFromPath(request);
  const program = await getProgramTree(org.organizationId, id);

  return jsonOk(program);
});

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const id = getProgramIdFromPath(request);
  const body = await parseJsonBody(patchProgramSchema, request);
  const program = await patchProgramMetadata(org.organizationId, id, body);

  return jsonOk(program);
});
