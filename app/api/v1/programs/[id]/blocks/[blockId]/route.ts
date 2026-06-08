import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getBlockIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { deleteBlock, patchBlock } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchBlockSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const blockId = getBlockIdFromPath(request);
  const body = await parseJsonBody(patchBlockSchema, request);
  const program = await patchBlock(org.organizationId, programId, blockId, body);

  return jsonOk(program);
});

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const blockId = getBlockIdFromPath(request);
    const program = await deleteBlock(org.organizationId, programId, blockId);

    return jsonOk(program);
  },
);
