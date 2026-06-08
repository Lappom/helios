import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programs,
  programWeeks,
} from "@/lib/db/schema";
import { createId } from "@/lib/db/id";

export type BackfillPeriodizationResult = {
  programsProcessed: number;
  programsSkipped: number;
  weeksLinked: number;
};

export async function backfillProgramPeriodization(): Promise<BackfillPeriodizationResult> {
  const allPrograms = await db.query.programs.findMany({
    columns: { id: true, organizationId: true },
    with: {
      mesocycles: { columns: { id: true }, limit: 1 },
      weeks: {
        columns: { id: true, microcycleId: true },
        orderBy: (weeks, { asc }) => [asc(weeks.sortOrder)],
      },
    },
  });

  let programsProcessed = 0;
  let programsSkipped = 0;
  let weeksLinked = 0;

  for (const program of allPrograms) {
    if (program.mesocycles.length > 0) {
      programsSkipped += 1;
      continue;
    }

    await db.transaction(async (tx) => {
      const mesocycleId = createId();
      const macrocycleId = createId();
      const microcycleId = createId();

      await tx.insert(programMesocycles).values({
        id: mesocycleId,
        organizationId: program.organizationId,
        programId: program.id,
        sortOrder: 0,
        name: "Plan principal",
        description: "Mésocycle par défaut (migration)",
      });

      await tx.insert(programMacrocycles).values({
        id: macrocycleId,
        organizationId: program.organizationId,
        mesocycleId,
        sortOrder: 0,
        name: "Bloc principal",
        description: "Macrocycle par défaut (migration)",
      });

      await tx.insert(programMicrocycles).values({
        id: microcycleId,
        organizationId: program.organizationId,
        macrocycleId,
        sortOrder: 0,
        name: "Phase principale",
        description: "Microcycle par défaut (migration)",
      });

      if (program.weeks.length > 0) {
        for (const week of program.weeks) {
          await tx
            .update(programWeeks)
            .set({ microcycleId })
            .where(eq(programWeeks.id, week.id));
        }
        weeksLinked += program.weeks.length;
      }
    });

    programsProcessed += 1;
  }

  return { programsProcessed, programsSkipped, weeksLinked };
}

export async function countProgramsWithoutMesocycles(): Promise<number> {
  const rows = await db
    .select({ id: programs.id })
    .from(programs)
    .leftJoin(programMesocycles, eq(programMesocycles.programId, programs.id))
    .where(isNull(programMesocycles.id));
  return rows.length;
}
