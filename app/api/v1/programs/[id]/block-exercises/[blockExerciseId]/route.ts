import { withApiHandler, jsonOk } from "@/lib/api/handler";
import {
  getBlockExerciseIdFromPath,
  getProgramIdFromPath,
} from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import {
  deleteBlockExercise,
  patchBlockExercise,
} from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchBlockExerciseSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler({ requireOrg: true }, async ({ request }) => {
  const org = await requireCoachWrite();
  const programId = getProgramIdFromPath(request);
  const blockExerciseId = getBlockExerciseIdFromPath(request);
  const body = await parseJsonBody(patchBlockExerciseSchema, request);
  const program = await patchBlockExercise(
    org.organizationId,
    programId,
    blockExerciseId,
    body,
  );

  return jsonOk(program);
});

export const DELETE = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const programId = getProgramIdFromPath(request);
    const blockExerciseId = getBlockExerciseIdFromPath(request);
    const program = await deleteBlockExercise(
      org.organizationId,
      programId,
      blockExerciseId,
    );

    return jsonOk(program);
  },
);
