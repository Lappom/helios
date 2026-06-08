import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type {
  CreateMacrocycleInput,
  CreateMesocycleInput,
  CreateMicrocycleInput,
  PatchMacrocycleInput,
  PatchMesocycleInput,
  PatchMicrocycleInput,
} from "@/lib/validators/programs";
import {
  assertProgramStructureEditable,
  getProgramRowOrThrow,
  getProgramTree,
} from "./program-queries";

const weekSessionsQuery = {
  orderBy: asc(programWeeks.sortOrder),
  with: {
    sessions: {
      orderBy: asc(programSessions.sortOrder),
      with: {
        blocks: {
          orderBy: asc(exerciseBlocks.sortOrder),
          with: {
            exercises: {
              orderBy: asc(blockExercises.sortOrder),
              with: {
                exercise: true,
                alternatives: {
                  orderBy: asc(blockExerciseAlternatives.sortOrder),
                  with: { exercise: true },
                },
                prescriptions: {
                  orderBy: asc(setPrescriptions.setNumber),
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

async function getNextSortOrder(
  table:
    | typeof programMesocycles
    | typeof programMacrocycles
    | typeof programMicrocycles,
  parentColumn:
    | typeof programMesocycles.programId
    | typeof programMacrocycles.mesocycleId
    | typeof programMicrocycles.macrocycleId,
  parentId: string,
) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${table.sortOrder}), -1)` })
    .from(table)
    .where(eq(parentColumn, parentId));
  return (row?.max ?? -1) + 1;
}

async function reorderCycleByIds(
  table:
    | typeof programMesocycles
    | typeof programMacrocycles
    | typeof programMicrocycles,
  organizationId: string,
  parentFilter: ReturnType<typeof eq>,
  ids: string[],
) {
  await getDb().transaction(async (tx) => {
    for (let index = 0; index < ids.length; index++) {
      await tx
        .update(table)
        .set({ sortOrder: index })
        .where(
          and(
            eq(table.organizationId, organizationId),
            parentFilter,
            eq(table.id, ids[index]!),
          ),
        );
    }
  });
}

async function getNextMicrocycleWeekSortOrder(microcycleId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${programWeeks.sortOrder}), -1)` })
    .from(programWeeks)
    .where(eq(programWeeks.microcycleId, microcycleId));
  return (row?.max ?? -1) + 1;
}

export async function createMesocycle(
  organizationId: string,
  programId: string,
  input: CreateMesocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const sortOrder = await getNextSortOrder(
    programMesocycles,
    programMesocycles.programId,
    programId,
  );

  const [mesocycle] = await getDb()
    .insert(programMesocycles)
    .values({
      organizationId,
      programId,
      sortOrder,
      name: input.name ?? `Mésocycle ${sortOrder + 1}`,
      description: input.description ?? null,
      focus: input.focus ?? null,
      targetDurationWeeks: input.targetDurationWeeks ?? null,
    })
    .returning({ id: programMesocycles.id });

  const [macrocycle] = await getDb()
    .insert(programMacrocycles)
    .values({
      organizationId,
      mesocycleId: mesocycle!.id,
      sortOrder: 0,
      name: "Macrocycle 1",
    })
    .returning({ id: programMacrocycles.id });

  await getDb().insert(programMicrocycles).values({
    organizationId,
    macrocycleId: macrocycle!.id,
    sortOrder: 0,
    name: "Microcycle 1",
  });

  return getProgramTree(organizationId, programId);
}

export async function patchMesocycle(
  organizationId: string,
  programId: string,
  mesocycleId: string,
  input: PatchMesocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const updated = await getDb()
    .update(programMesocycles)
    .set(input)
    .where(
      and(
        eq(programMesocycles.organizationId, organizationId),
        eq(programMesocycles.programId, programId),
        eq(programMesocycles.id, mesocycleId),
      ),
    )
    .returning({ id: programMesocycles.id });

  if (updated.length === 0) {
    throw problem({ type: "not-found", title: "Mesocycle not found", status: 404 });
  }

  return getProgramTree(organizationId, programId);
}

export async function deleteMesocycle(
  organizationId: string,
  programId: string,
  mesocycleId: string,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const mesocycles = await getDb().query.programMesocycles.findMany({
    where: and(
      eq(programMesocycles.organizationId, organizationId),
      eq(programMesocycles.programId, programId),
    ),
  });

  if (mesocycles.length <= 1) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete mesocycle",
      status: 400,
      detail: "A program must have at least one mesocycle when using periodization.",
    });
  }

  const deleted = await getDb()
    .delete(programMesocycles)
    .where(
      and(
        eq(programMesocycles.organizationId, organizationId),
        eq(programMesocycles.programId, programId),
        eq(programMesocycles.id, mesocycleId),
      ),
    )
    .returning({ id: programMesocycles.id });

  if (deleted.length === 0) {
    throw problem({ type: "not-found", title: "Mesocycle not found", status: 404 });
  }

  return getProgramTree(organizationId, programId);
}

export async function reorderMesocycles(
  organizationId: string,
  programId: string,
  ids: string[],
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderCycleByIds(
    programMesocycles,
    organizationId,
    eq(programMesocycles.programId, programId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function createMacrocycle(
  organizationId: string,
  programId: string,
  mesocycleId: string,
  input: CreateMacrocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const mesocycle = await getDb().query.programMesocycles.findFirst({
    where: and(
      eq(programMesocycles.organizationId, organizationId),
      eq(programMesocycles.programId, programId),
      eq(programMesocycles.id, mesocycleId),
    ),
  });

  if (!mesocycle) {
    throw problem({ type: "not-found", title: "Mesocycle not found", status: 404 });
  }

  const sortOrder = await getNextSortOrder(
    programMacrocycles,
    programMacrocycles.mesocycleId,
    mesocycleId,
  );

  const [macrocycle] = await getDb()
    .insert(programMacrocycles)
    .values({
      organizationId,
      mesocycleId,
      sortOrder,
      name: input.name ?? `Macrocycle ${sortOrder + 1}`,
      description: input.description ?? null,
      focus: input.focus ?? null,
      targetDurationWeeks: input.targetDurationWeeks ?? null,
    })
    .returning({ id: programMacrocycles.id });

  await getDb().insert(programMicrocycles).values({
    organizationId,
    macrocycleId: macrocycle!.id,
    sortOrder: 0,
    name: "Microcycle 1",
  });

  return getProgramTree(organizationId, programId);
}

export async function patchMacrocycle(
  organizationId: string,
  programId: string,
  macrocycleId: string,
  input: PatchMacrocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const macrocycle = await getDb().query.programMacrocycles.findFirst({
    where: and(
      eq(programMacrocycles.organizationId, organizationId),
      eq(programMacrocycles.id, macrocycleId),
    ),
    with: { mesocycle: true },
  });

  if (!macrocycle || macrocycle.mesocycle.programId !== programId) {
    throw problem({ type: "not-found", title: "Macrocycle not found", status: 404 });
  }

  await getDb()
    .update(programMacrocycles)
    .set(input)
    .where(eq(programMacrocycles.id, macrocycleId));

  return getProgramTree(organizationId, programId);
}

export async function deleteMacrocycle(
  organizationId: string,
  programId: string,
  macrocycleId: string,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const macrocycle = await getDb().query.programMacrocycles.findFirst({
    where: and(
      eq(programMacrocycles.organizationId, organizationId),
      eq(programMacrocycles.id, macrocycleId),
    ),
    with: { mesocycle: true },
  });

  if (!macrocycle || macrocycle.mesocycle.programId !== programId) {
    throw problem({ type: "not-found", title: "Macrocycle not found", status: 404 });
  }

  const siblings = await getDb().query.programMacrocycles.findMany({
    where: eq(programMacrocycles.mesocycleId, macrocycle.mesocycleId),
  });

  if (siblings.length <= 1) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete macrocycle",
      status: 400,
      detail: "A mesocycle must have at least one macrocycle.",
    });
  }

  await getDb().delete(programMacrocycles).where(eq(programMacrocycles.id, macrocycleId));
  return getProgramTree(organizationId, programId);
}

export async function reorderMacrocycles(
  organizationId: string,
  programId: string,
  mesocycleId: string,
  ids: string[],
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderCycleByIds(
    programMacrocycles,
    organizationId,
    eq(programMacrocycles.mesocycleId, mesocycleId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function createMicrocycle(
  organizationId: string,
  programId: string,
  macrocycleId: string,
  input: CreateMicrocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const macrocycle = await getDb().query.programMacrocycles.findFirst({
    where: and(
      eq(programMacrocycles.organizationId, organizationId),
      eq(programMacrocycles.id, macrocycleId),
    ),
    with: { mesocycle: true },
  });

  if (!macrocycle || macrocycle.mesocycle.programId !== programId) {
    throw problem({ type: "not-found", title: "Macrocycle not found", status: 404 });
  }

  const sortOrder = await getNextSortOrder(
    programMicrocycles,
    programMicrocycles.macrocycleId,
    macrocycleId,
  );

  await getDb().insert(programMicrocycles).values({
    organizationId,
    macrocycleId,
    sortOrder,
    name: input.name ?? `Microcycle ${sortOrder + 1}`,
    description: input.description ?? null,
    focus: input.focus ?? null,
    targetDurationWeeks: input.targetDurationWeeks ?? null,
  });

  return getProgramTree(organizationId, programId);
}

export async function patchMicrocycle(
  organizationId: string,
  programId: string,
  microcycleId: string,
  input: PatchMicrocycleInput,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const microcycle = await getDb().query.programMicrocycles.findFirst({
    where: and(
      eq(programMicrocycles.organizationId, organizationId),
      eq(programMicrocycles.id, microcycleId),
    ),
    with: { macrocycle: { with: { mesocycle: true } } },
  });

  if (!microcycle || microcycle.macrocycle.mesocycle.programId !== programId) {
    throw problem({ type: "not-found", title: "Microcycle not found", status: 404 });
  }

  await getDb()
    .update(programMicrocycles)
    .set(input)
    .where(eq(programMicrocycles.id, microcycleId));

  return getProgramTree(organizationId, programId);
}

export async function deleteMicrocycle(
  organizationId: string,
  programId: string,
  microcycleId: string,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const microcycle = await getDb().query.programMicrocycles.findFirst({
    where: and(
      eq(programMicrocycles.organizationId, organizationId),
      eq(programMicrocycles.id, microcycleId),
    ),
    with: { macrocycle: { with: { mesocycle: true } } },
  });

  if (!microcycle || microcycle.macrocycle.mesocycle.programId !== programId) {
    throw problem({ type: "not-found", title: "Microcycle not found", status: 404 });
  }

  const siblings = await getDb().query.programMicrocycles.findMany({
    where: eq(programMicrocycles.macrocycleId, microcycle.macrocycleId),
  });

  if (siblings.length <= 1) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete microcycle",
      status: 400,
      detail: "A macrocycle must have at least one microcycle.",
    });
  }

  await getDb().delete(programMicrocycles).where(eq(programMicrocycles.id, microcycleId));
  return getProgramTree(organizationId, programId);
}

export async function reorderMicrocycles(
  organizationId: string,
  programId: string,
  macrocycleId: string,
  ids: string[],
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderCycleByIds(
    programMicrocycles,
    organizationId,
    eq(programMicrocycles.macrocycleId, macrocycleId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function moveWeekToMicrocycle(
  organizationId: string,
  programId: string,
  weekId: string,
  microcycleId: string | null,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const week = await getDb().query.programWeeks.findFirst({
    where: and(
      eq(programWeeks.organizationId, organizationId),
      eq(programWeeks.programId, programId),
      eq(programWeeks.id, weekId),
    ),
  });

  if (!week) {
    throw problem({ type: "not-found", title: "Week not found", status: 404 });
  }

  if (microcycleId) {
    const microcycle = await getDb().query.programMicrocycles.findFirst({
      where: and(
        eq(programMicrocycles.organizationId, organizationId),
        eq(programMicrocycles.id, microcycleId),
      ),
      with: { macrocycle: { with: { mesocycle: true } } },
    });

    if (!microcycle || microcycle.macrocycle.mesocycle.programId !== programId) {
      throw problem({ type: "not-found", title: "Microcycle not found", status: 404 });
    }

    const sortOrder = await getNextMicrocycleWeekSortOrder(microcycleId);
    await getDb()
      .update(programWeeks)
      .set({ microcycleId, sortOrder })
      .where(eq(programWeeks.id, weekId));
  } else {
    const [row] = await getDb()
      .select({ max: sql<number>`coalesce(max(${programWeeks.sortOrder}), -1)` })
      .from(programWeeks)
      .where(
        and(
          eq(programWeeks.programId, programId),
          isNull(programWeeks.microcycleId),
        ),
      );
    const sortOrder = (row?.max ?? -1) + 1;
    await getDb()
      .update(programWeeks)
      .set({ microcycleId: null, sortOrder })
      .where(eq(programWeeks.id, weekId));
  }

  return getProgramTree(organizationId, programId);
}

export async function duplicateMesocycle(
  organizationId: string,
  programId: string,
  mesocycleId: string,
) {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const source = await getDb().query.programMesocycles.findFirst({
    where: and(
      eq(programMesocycles.organizationId, organizationId),
      eq(programMesocycles.programId, programId),
      eq(programMesocycles.id, mesocycleId),
    ),
    with: {
      macrocycles: {
        orderBy: asc(programMacrocycles.sortOrder),
        with: {
          microcycles: {
            orderBy: asc(programMicrocycles.sortOrder),
            with: {
              weeks: weekSessionsQuery,
            },
          },
        },
      },
    },
  });

  if (!source) {
    throw problem({ type: "not-found", title: "Mesocycle not found", status: 404 });
  }

  const sortOrder = await getNextSortOrder(
    programMesocycles,
    programMesocycles.programId,
    programId,
  );

  await getDb().transaction(async (tx) => {
    const [newMesocycle] = await tx
      .insert(programMesocycles)
      .values({
        organizationId,
        programId,
        sortOrder,
        name: `${source.name} (copie)`,
        description: source.description,
        focus: source.focus,
        targetDurationWeeks: source.targetDurationWeeks,
      })
      .returning({ id: programMesocycles.id });

    for (const macrocycle of source.macrocycles) {
      const [newMacrocycle] = await tx
        .insert(programMacrocycles)
        .values({
          organizationId,
          mesocycleId: newMesocycle!.id,
          sortOrder: macrocycle.sortOrder,
          name: macrocycle.name,
          description: macrocycle.description,
          focus: macrocycle.focus,
          targetDurationWeeks: macrocycle.targetDurationWeeks,
        })
        .returning({ id: programMacrocycles.id });

      for (const microcycle of macrocycle.microcycles) {
        const [newMicrocycle] = await tx
          .insert(programMicrocycles)
          .values({
            organizationId,
            macrocycleId: newMacrocycle!.id,
            sortOrder: microcycle.sortOrder,
            name: microcycle.name,
            description: microcycle.description,
            focus: microcycle.focus,
            targetDurationWeeks: microcycle.targetDurationWeeks,
          })
          .returning({ id: programMicrocycles.id });

        for (const week of microcycle.weeks) {
          const [newWeek] = await tx
            .insert(programWeeks)
            .values({
              organizationId,
              programId,
              microcycleId: newMicrocycle!.id,
              sortOrder: week.sortOrder,
              label: week.label,
            })
            .returning({ id: programWeeks.id });

          for (const session of week.sessions) {
            const [newSession] = await tx
              .insert(programSessions)
              .values({
                organizationId,
                programWeekId: newWeek!.id,
                sortOrder: session.sortOrder,
                name: session.name,
                dayOfWeek: session.dayOfWeek,
                scheduledDate: session.scheduledDate,
              })
              .returning({ id: programSessions.id });

            for (const block of session.blocks) {
              const [newBlock] = await tx
                .insert(exerciseBlocks)
                .values({
                  organizationId,
                  programSessionId: newSession!.id,
                  sortOrder: block.sortOrder,
                  type: block.type,
                  sharedRestSeconds: block.sharedRestSeconds,
                  rounds: block.rounds,
                  restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
                  durationSeconds: block.durationSeconds,
                  targetRpe: block.targetRpe,
                })
                .returning({ id: exerciseBlocks.id });

              for (const blockExercise of block.exercises) {
                const [newBlockExercise] = await tx
                  .insert(blockExercises)
                  .values({
                    organizationId,
                    exerciseBlockId: newBlock!.id,
                    exerciseId: blockExercise.exerciseId,
                    sortOrder: blockExercise.sortOrder,
                    notes: blockExercise.notes,
                  })
                  .returning({ id: blockExercises.id });

                if (blockExercise.alternatives.length > 0) {
                  await tx.insert(blockExerciseAlternatives).values(
                    blockExercise.alternatives.map((alt) => ({
                      organizationId,
                      blockExerciseId: newBlockExercise!.id,
                      exerciseId: alt.exerciseId,
                      sortOrder: alt.sortOrder,
                    })),
                  );
                }

                if (blockExercise.prescriptions.length > 0) {
                  await tx.insert(setPrescriptions).values(
                    blockExercise.prescriptions.map((prescription) => ({
                      organizationId,
                      blockExerciseId: newBlockExercise!.id,
                      setNumber: prescription.setNumber,
                      load: prescription.load,
                      reps: prescription.reps,
                      restSeconds: prescription.restSeconds,
                      tempo: prescription.tempo,
                      rpe: prescription.rpe,
                      durationSeconds: prescription.durationSeconds,
                    })),
                  );
                }
              }
            }
          }
        }
      }
    }
  });

  return getProgramTree(organizationId, programId);
}
