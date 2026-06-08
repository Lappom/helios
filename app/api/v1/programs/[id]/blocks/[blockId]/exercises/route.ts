import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getBlockIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { addBlockExercise } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { addBlockExerciseSchema } from "@/lib/validators/programs";

export const POST = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const blockId = getBlockIdFromPath(request);
  const body = await parseJsonBody(addBlockExerciseSchema, request);
  const program = await addBlockExercise(
    org.organizationId,
    programId,
    blockId,
    body.exerciseId,
  );

  return jsonOk(program, { status: 201 });
});
