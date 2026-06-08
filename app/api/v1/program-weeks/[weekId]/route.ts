import { withApiHandler, jsonOk } from "@/lib/api/handler";
import { getProgramWeekIdFromPath } from "@/lib/api/program-route";
import { requireCoachWrite } from "@/lib/api/require-coach";
import { db } from "@/lib/db";
import { programWeeks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { moveWeekToMicrocycle } from "@/lib/programs/periodization";
import { patchWeek } from "@/lib/programs/service";
import { parseJsonBody } from "@/lib/validators/clients";
import { patchWeekSchema } from "@/lib/validators/programs";

export const PATCH = withApiHandler(
  { requireOrg: true },
  async ({ request }) => {
    const org = await requireCoachWrite();
    const weekId = getProgramWeekIdFromPath(request);
    const body = await parseJsonBody(patchWeekSchema, request);

    const week = await db.query.programWeeks.findFirst({
      where: and(
        eq(programWeeks.organizationId, org.organizationId),
        eq(programWeeks.id, weekId),
      ),
    });

    if (!week) {
      throw problem({ type: "not-found", title: "Week not found", status: 404 });
    }

    if (body.microcycleId !== undefined) {
      const program = await moveWeekToMicrocycle(
        org.organizationId,
        week.programId,
        weekId,
        body.microcycleId,
      );
      if (body.label !== undefined) {
        return jsonOk(
          await patchWeek(org.organizationId, week.programId, weekId, {
            label: body.label,
          }),
        );
      }
      return jsonOk(program);
    }

    const program = await patchWeek(
      org.organizationId,
      week.programId,
      weekId,
      body,
    );
    return jsonOk(program);
  },
);
