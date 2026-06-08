import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  exercises,
  programMacrocycles,
  programMesocycles,
  programMicrocycles,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import {
  assertProgramStructureEditable,
  fetchProgramRaw,
  getProgramRowOrThrow,
  getProgramTree,
} from "./program-queries";
import type {
  CreateBlockInput,
  CreateProgramInput,
  CreateSessionInput,
  CreateWeekInput,
  PatchBlockExerciseInput,
  PatchBlockInput,
  PatchProgramInput,
  PatchSessionInput,
  PatchWeekInput,
} from "@/lib/validators/programs";
import type { ProgramListItem, ProgramTree } from "./types";

const BLOCK_EXERCISE_LIMITS: Record<string, number | null> = {
  single: 1,
  superset: 2,
  triset: 3,
  circuit: null,
  amrap: null,
};

export type ListProgramsOptions = {
  status?: "draft" | "published" | "archived";
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

export { assertProgramStructureEditable, getProgramTree } from "./program-queries";

async function getNextWeekSortOrder(
  programId: string,
  microcycleId?: string | null,
) {
  if (microcycleId) {
    const [row] = await getDb()
      .select({ max: sql<number>`coalesce(max(${programWeeks.sortOrder}), -1)` })
      .from(programWeeks)
      .where(eq(programWeeks.microcycleId, microcycleId));
    return (row?.max ?? -1) + 1;
  }

  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${programWeeks.sortOrder}), -1)` })
    .from(programWeeks)
    .where(and(eq(programWeeks.programId, programId), isNull(programWeeks.microcycleId)));
  return (row?.max ?? -1) + 1;
}

async function getNextSessionSortOrder(weekId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${programSessions.sortOrder}), -1)` })
    .from(programSessions)
    .where(eq(programSessions.programWeekId, weekId));
  return (row?.max ?? -1) + 1;
}

async function getNextBlockSortOrder(sessionId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${exerciseBlocks.sortOrder}), -1)` })
    .from(exerciseBlocks)
    .where(eq(exerciseBlocks.programSessionId, sessionId));
  return (row?.max ?? -1) + 1;
}

async function getNextBlockExerciseSortOrder(blockId: string) {
  const [row] = await getDb()
    .select({ max: sql<number>`coalesce(max(${blockExercises.sortOrder}), -1)` })
    .from(blockExercises)
    .where(eq(blockExercises.exerciseBlockId, blockId));
  return (row?.max ?? -1) + 1;
}

export async function listPrograms(
  organizationId: string,
  options: ListProgramsOptions,
): Promise<{ items: ProgramListItem[]; total: number }> {
  const conditions = [eq(programs.organizationId, organizationId)];

  if (options.status) {
    conditions.push(eq(programs.status, options.status));
  }

  if (options.search) {
    conditions.push(ilike(programs.name, `%${options.search}%`));
  }

  const where = and(...conditions);

  const [rows, [totalRow]] = await Promise.all([
    getDb()
      .select({
        id: programs.id,
        name: programs.name,
        description: programs.description,
        status: programs.status,
        coachClerkUserId: programs.coachClerkUserId,
        publishedAt: programs.publishedAt,
        clonedFromProgramId: programs.clonedFromProgramId,
        createdAt: programs.createdAt,
        updatedAt: programs.updatedAt,
        weekCount: sql<number>`(
          select count(*)::int from program_weeks pw
          where pw.program_id = "programs"."id"
        )`,
        sessionCount: sql<number>`(
          select count(*)::int from program_sessions ps
          inner join program_weeks pw on ps.program_week_id = pw.id
          where pw.program_id = "programs"."id"
        )`,
      })
      .from(programs)
      .where(where)
      .orderBy(desc(programs.updatedAt))
      .limit(options.limit)
      .offset(options.offset),
    getDb().select({ total: count() }).from(programs).where(where),
  ]);

  return {
    items: rows,
    total: totalRow?.total ?? 0,
  };
}

export async function createProgram(
  organizationId: string,
  coachClerkUserId: string,
  input: CreateProgramInput,
): Promise<ProgramTree> {
  const programId = await getDb().transaction(async (tx) => {
    const [program] = await tx
      .insert(programs)
      .values({
        organizationId,
        coachClerkUserId,
        name: input.name,
        description: input.description ?? null,
        status: "draft",
      })
      .returning({ id: programs.id });

    const [mesocycle] = await tx
      .insert(programMesocycles)
      .values({
        organizationId,
        programId: program!.id,
        sortOrder: 0,
        name: "Plan principal",
      })
      .returning({ id: programMesocycles.id });

    const [macrocycle] = await tx
      .insert(programMacrocycles)
      .values({
        organizationId,
        mesocycleId: mesocycle!.id,
        sortOrder: 0,
        name: "Bloc principal",
      })
      .returning({ id: programMacrocycles.id });

    const [microcycle] = await tx
      .insert(programMicrocycles)
      .values({
        organizationId,
        macrocycleId: macrocycle!.id,
        sortOrder: 0,
        name: "Phase principale",
      })
      .returning({ id: programMicrocycles.id });

    const [week] = await tx
      .insert(programWeeks)
      .values({
        organizationId,
        programId: program!.id,
        microcycleId: microcycle!.id,
        sortOrder: 0,
        label: "Semaine 1",
      })
      .returning({ id: programWeeks.id });

    await tx.insert(programSessions).values({
      organizationId,
      programWeekId: week!.id,
      sortOrder: 0,
      name: "Séance 1",
    });

    return program!.id;
  });

  return getProgramTree(organizationId, programId);
}

export async function patchProgramMetadata(
  organizationId: string,
  programId: string,
  input: PatchProgramInput,
): Promise<ProgramTree> {
  await getProgramRowOrThrow(organizationId, programId);

  await getDb()
    .update(programs)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(
      and(
        eq(programs.organizationId, organizationId),
        eq(programs.id, programId),
      ),
    );

  return getProgramTree(organizationId, programId);
}

export async function publishProgram(
  organizationId: string,
  programId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);

  if (program.status !== "draft") {
    throw problem({
      type: "validation-error",
      title: "Invalid status transition",
      status: 400,
      detail: "Only draft programs can be published.",
    });
  }

  await getDb()
    .update(programs)
    .set({ status: "published", publishedAt: new Date() })
    .where(
      and(
        eq(programs.organizationId, organizationId),
        eq(programs.id, programId),
      ),
    );

  return getProgramTree(organizationId, programId);
}

export async function unpublishProgram(
  organizationId: string,
  programId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);

  if (program.status !== "published") {
    throw problem({
      type: "validation-error",
      title: "Invalid status transition",
      status: 400,
      detail: "Only published programs can be unpublished.",
    });
  }

  await getDb()
    .update(programs)
    .set({ status: "draft", publishedAt: null })
    .where(
      and(
        eq(programs.organizationId, organizationId),
        eq(programs.id, programId),
      ),
    );

  return getProgramTree(organizationId, programId);
}

export async function duplicateProgram(
  organizationId: string,
  coachClerkUserId: string,
  programId: string,
): Promise<ProgramTree> {
  const source = await fetchProgramRaw(organizationId, programId);

  if (!source) {
    throw problem({
      type: "not-found",
      title: "Program not found",
      status: 404,
      detail: `Program ${programId} was not found in this organization.`,
    });
  }

  const programSource = source;

  const newProgramId = await getDb().transaction(async (tx) => {
    const [newProgram] = await tx
      .insert(programs)
      .values({
        organizationId,
        coachClerkUserId,
        name: `${programSource.name} (copie)`,
        description: programSource.description,
        status: "draft",
        clonedFromProgramId: programSource.id,
      })
      .returning({ id: programs.id });

    async function cloneWeekTree(
      week: (typeof programSource.weeks)[number],
      programId: string,
      microcycleId: string | null,
    ) {
      const [newWeek] = await tx
        .insert(programWeeks)
        .values({
          organizationId,
          programId,
          microcycleId,
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

    for (const mesocycle of programSource.mesocycles ?? []) {
      const [newMesocycle] = await tx
        .insert(programMesocycles)
        .values({
          organizationId,
          programId: newProgram!.id,
          sortOrder: mesocycle.sortOrder,
          name: mesocycle.name,
          description: mesocycle.description,
          focus: mesocycle.focus,
          targetDurationWeeks: mesocycle.targetDurationWeeks,
        })
        .returning({ id: programMesocycles.id });

      for (const macrocycle of mesocycle.macrocycles) {
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
            await cloneWeekTree(week, newProgram!.id, newMicrocycle!.id);
          }
        }
      }
    }

    for (const week of programSource.weeks) {
      await cloneWeekTree(week, newProgram!.id, null);
    }

    return newProgram!.id;
  });

  return getProgramTree(organizationId, newProgramId);
}

async function reorderByIds(
  table:
    | typeof programWeeks
    | typeof programSessions
    | typeof exerciseBlocks
    | typeof blockExercises,
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

export async function createWeek(
  organizationId: string,
  programId: string,
  input: CreateWeekInput,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const sortOrder = await getNextWeekSortOrder(programId, input.microcycleId);

  if (input.microcycleId) {
    const microcycle = await getDb().query.programMicrocycles.findFirst({
      where: and(
        eq(programMicrocycles.organizationId, organizationId),
        eq(programMicrocycles.id, input.microcycleId),
      ),
      with: { macrocycle: { with: { mesocycle: true } } },
    });

    if (!microcycle || microcycle.macrocycle.mesocycle.programId !== programId) {
      throw problem({
        type: "not-found",
        title: "Microcycle not found",
        status: 404,
      });
    }
  }

  await getDb().insert(programWeeks).values({
    organizationId,
    programId,
    microcycleId: input.microcycleId ?? null,
    sortOrder,
    label: input.label ?? `Semaine ${sortOrder + 1}`,
  });

  return getProgramTree(organizationId, programId);
}

export async function patchWeek(
  organizationId: string,
  programId: string,
  weekId: string,
  input: PatchWeekInput,
): Promise<ProgramTree> {
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
    throw problem({
      type: "not-found",
      title: "Week not found",
      status: 404,
    });
  }

  if (input.microcycleId !== undefined) {
    const { moveWeekToMicrocycle } = await import("./periodization");
    return moveWeekToMicrocycle(
      organizationId,
      programId,
      weekId,
      input.microcycleId,
    );
  }

  const { label, ...rest } = input;
  const patch: { label?: string } = {};
  if (label !== undefined) patch.label = label;

  if (Object.keys(patch).length > 0) {
    await getDb().update(programWeeks).set(patch).where(eq(programWeeks.id, weekId));
  }

  return getProgramTree(organizationId, programId);
}

export async function deleteWeek(
  organizationId: string,
  programId: string,
  weekId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const weeks = await getDb().query.programWeeks.findMany({
    where: and(
      eq(programWeeks.organizationId, organizationId),
      eq(programWeeks.programId, programId),
    ),
  });

  if (weeks.length <= 1) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete week",
      status: 400,
      detail: "A program must have at least one week.",
    });
  }

  const deleted = await getDb()
    .delete(programWeeks)
    .where(
      and(
        eq(programWeeks.organizationId, organizationId),
        eq(programWeeks.programId, programId),
        eq(programWeeks.id, weekId),
      ),
    )
    .returning({ id: programWeeks.id });

  if (deleted.length === 0) {
    throw problem({
      type: "not-found",
      title: "Week not found",
      status: 404,
    });
  }

  return getProgramTree(organizationId, programId);
}

export async function reorderWeeks(
  organizationId: string,
  programId: string,
  ids: string[],
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderByIds(
    programWeeks,
    organizationId,
    eq(programWeeks.programId, programId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function createSession(
  organizationId: string,
  programId: string,
  weekId: string,
  input: CreateSessionInput,
): Promise<ProgramTree> {
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
    throw problem({
      type: "not-found",
      title: "Week not found",
      status: 404,
    });
  }

  const sortOrder = await getNextSessionSortOrder(weekId);

  await getDb().insert(programSessions).values({
    organizationId,
    programWeekId: weekId,
    sortOrder,
    name: input.name ?? `Séance ${sortOrder + 1}`,
    dayOfWeek: input.dayOfWeek ?? null,
  });

  return getProgramTree(organizationId, programId);
}

export async function patchSession(
  organizationId: string,
  programId: string,
  sessionId: string,
  input: PatchSessionInput,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const session = await getDb().query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, sessionId),
    ),
    with: { week: true },
  });

  if (!session || session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
    });
  }

  await getDb()
    .update(programSessions)
    .set(input)
    .where(eq(programSessions.id, sessionId));

  return getProgramTree(organizationId, programId);
}

export async function deleteSession(
  organizationId: string,
  programId: string,
  sessionId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const session = await getDb().query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, sessionId),
    ),
    with: { week: true },
  });

  if (!session || session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
    });
  }

  const siblingCount = await getDb()
    .select({ total: count() })
    .from(programSessions)
    .where(eq(programSessions.programWeekId, session.programWeekId));

  if ((siblingCount[0]?.total ?? 0) <= 1) {
    throw problem({
      type: "validation-error",
      title: "Cannot delete session",
      status: 400,
      detail: "A week must have at least one session.",
    });
  }

  await getDb().delete(programSessions).where(eq(programSessions.id, sessionId));

  return getProgramTree(organizationId, programId);
}

export async function reorderSessions(
  organizationId: string,
  programId: string,
  weekId: string,
  ids: string[],
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderByIds(
    programSessions,
    organizationId,
    eq(programSessions.programWeekId, weekId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

async function assertExerciseAccessible(
  organizationId: string,
  exerciseId: string,
) {
  const exercise = await getDb().query.exercises.findFirst({
    where: and(
      eq(exercises.id, exerciseId),
      or(
        and(eq(exercises.source, "system"), isNull(exercises.organizationId)),
        and(
          eq(exercises.source, "custom"),
          eq(exercises.organizationId, organizationId),
        ),
      ),
    ),
  });

  if (!exercise) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
    });
  }
}

export async function createBlock(
  organizationId: string,
  programId: string,
  sessionId: string,
  input: CreateBlockInput,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const session = await getDb().query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, sessionId),
    ),
    with: { week: true },
  });

  if (!session || session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
    });
  }

  if (input.exerciseId) {
    await assertExerciseAccessible(organizationId, input.exerciseId);
  }

  const sortOrder = await getNextBlockSortOrder(sessionId);

  await getDb().transaction(async (tx) => {
    const [block] = await tx
      .insert(exerciseBlocks)
      .values({
        organizationId,
        programSessionId: sessionId,
        sortOrder,
        type: input.type,
        sharedRestSeconds: input.sharedRestSeconds ?? null,
        rounds: input.rounds ?? (input.type === "circuit" ? 3 : null),
        restBetweenRoundsSeconds: input.restBetweenRoundsSeconds ?? null,
        durationSeconds:
          input.durationSeconds ?? (input.type === "amrap" ? 600 : null),
        targetRpe: input.targetRpe ?? null,
      })
      .returning({ id: exerciseBlocks.id });

    if (input.exerciseId) {
      const [blockExercise] = await tx
        .insert(blockExercises)
        .values({
          organizationId,
          exerciseBlockId: block!.id,
          exerciseId: input.exerciseId,
          sortOrder: 0,
        })
        .returning({ id: blockExercises.id });

      await tx.insert(setPrescriptions).values({
        organizationId,
        blockExerciseId: blockExercise!.id,
        setNumber: 1,
        reps: "10",
        restSeconds: input.type === "single" ? 90 : null,
      });
    }
  });

  return getProgramTree(organizationId, programId);
}

export async function patchBlock(
  organizationId: string,
  programId: string,
  blockId: string,
  input: PatchBlockInput,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const block = await getDb().query.exerciseBlocks.findFirst({
    where: and(
      eq(exerciseBlocks.organizationId, organizationId),
      eq(exerciseBlocks.id, blockId),
    ),
    with: {
      session: { with: { week: true } },
      exercises: true,
    },
  });

  if (!block || block.session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Block not found",
      status: 404,
    });
  }

  if (input.type) {
    const limit = BLOCK_EXERCISE_LIMITS[input.type];
    if (limit !== null && block.exercises.length > limit) {
      throw problem({
        type: "validation-error",
        title: "Invalid block type",
        status: 400,
        detail: `${input.type} blocks support at most ${limit} exercises.`,
      });
    }
  }

  await getDb()
    .update(exerciseBlocks)
    .set(input)
    .where(eq(exerciseBlocks.id, blockId));

  return getProgramTree(organizationId, programId);
}

export async function deleteBlock(
  organizationId: string,
  programId: string,
  blockId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const block = await getDb().query.exerciseBlocks.findFirst({
    where: and(
      eq(exerciseBlocks.organizationId, organizationId),
      eq(exerciseBlocks.id, blockId),
    ),
    with: { session: { with: { week: true } } },
  });

  if (!block || block.session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Block not found",
      status: 404,
    });
  }

  await getDb().delete(exerciseBlocks).where(eq(exerciseBlocks.id, blockId));

  return getProgramTree(organizationId, programId);
}

export async function reorderBlocks(
  organizationId: string,
  programId: string,
  sessionId: string,
  ids: string[],
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderByIds(
    exerciseBlocks,
    organizationId,
    eq(exerciseBlocks.programSessionId, sessionId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function addBlockExercise(
  organizationId: string,
  programId: string,
  blockId: string,
  exerciseId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);
  await assertExerciseAccessible(organizationId, exerciseId);

  const block = await getDb().query.exerciseBlocks.findFirst({
    where: and(
      eq(exerciseBlocks.organizationId, organizationId),
      eq(exerciseBlocks.id, blockId),
    ),
    with: {
      session: { with: { week: true } },
      exercises: true,
    },
  });

  if (!block || block.session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Block not found",
      status: 404,
    });
  }

  const limit = BLOCK_EXERCISE_LIMITS[block.type];
  if (limit !== null && block.exercises.length >= limit) {
    throw problem({
      type: "validation-error",
      title: "Block exercise limit reached",
      status: 400,
      detail: `${block.type} blocks support at most ${limit} exercises.`,
    });
  }

  const sortOrder = await getNextBlockExerciseSortOrder(blockId);

  await getDb().transaction(async (tx) => {
    const [blockExercise] = await tx
      .insert(blockExercises)
      .values({
        organizationId,
        exerciseBlockId: blockId,
        exerciseId,
        sortOrder,
      })
      .returning({ id: blockExercises.id });

    await tx.insert(setPrescriptions).values({
      organizationId,
      blockExerciseId: blockExercise!.id,
      setNumber: 1,
      reps: "10",
    });
  });

  return getProgramTree(organizationId, programId);
}

export async function deleteBlockExercise(
  organizationId: string,
  programId: string,
  blockExerciseId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const blockExercise = await getDb().query.blockExercises.findFirst({
    where: and(
      eq(blockExercises.organizationId, organizationId),
      eq(blockExercises.id, blockExerciseId),
    ),
    with: {
      block: {
        with: {
          session: { with: { week: true } },
          exercises: true,
        },
      },
    },
  });

  if (
    !blockExercise ||
    blockExercise.block.session.week.programId !== programId
  ) {
    throw problem({
      type: "not-found",
      title: "Block exercise not found",
      status: 404,
    });
  }

  if (blockExercise.block.exercises.length <= 1) {
    await getDb()
      .delete(exerciseBlocks)
      .where(eq(exerciseBlocks.id, blockExercise.block.id));
  } else {
    await getDb()
      .delete(blockExercises)
      .where(eq(blockExercises.id, blockExerciseId));
  }

  return getProgramTree(organizationId, programId);
}

export async function patchBlockExercise(
  organizationId: string,
  programId: string,
  blockExerciseId: string,
  input: PatchBlockExerciseInput,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const blockExercise = await getDb().query.blockExercises.findFirst({
    where: and(
      eq(blockExercises.organizationId, organizationId),
      eq(blockExercises.id, blockExerciseId),
    ),
    with: { block: { with: { session: { with: { week: true } } } } },
  });

  if (
    !blockExercise ||
    blockExercise.block.session.week.programId !== programId
  ) {
    throw problem({
      type: "not-found",
      title: "Block exercise not found",
      status: 404,
    });
  }

  await getDb().transaction(async (tx) => {
    if (input.notes !== undefined) {
      await tx
        .update(blockExercises)
        .set({ notes: input.notes })
        .where(eq(blockExercises.id, blockExerciseId));
    }

    if (input.alternativeExerciseIds) {
      for (const exerciseId of input.alternativeExerciseIds) {
        await assertExerciseAccessible(organizationId, exerciseId);
      }

      await tx
        .delete(blockExerciseAlternatives)
        .where(eq(blockExerciseAlternatives.blockExerciseId, blockExerciseId));

      if (input.alternativeExerciseIds.length > 0) {
        await tx.insert(blockExerciseAlternatives).values(
          input.alternativeExerciseIds.map((exerciseId, index) => ({
            organizationId,
            blockExerciseId,
            exerciseId,
            sortOrder: index,
          })),
        );
      }
    }

    if (input.prescriptions) {
      await tx
        .delete(setPrescriptions)
        .where(eq(setPrescriptions.blockExerciseId, blockExerciseId));

      if (input.prescriptions.length > 0) {
        await tx.insert(setPrescriptions).values(
          input.prescriptions.map((prescription) => ({
            organizationId,
            blockExerciseId,
            setNumber: prescription.setNumber,
            load: prescription.load ?? null,
            reps: prescription.reps ?? null,
            restSeconds: prescription.restSeconds ?? null,
            tempo: prescription.tempo ?? null,
            rpe: prescription.rpe ?? null,
            durationSeconds: prescription.durationSeconds ?? null,
          })),
        );
      }
    }
  });

  return getProgramTree(organizationId, programId);
}

export async function reorderBlockExercises(
  organizationId: string,
  programId: string,
  blockId: string,
  ids: string[],
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  await reorderByIds(
    blockExercises,
    organizationId,
    eq(blockExercises.exerciseBlockId, blockId),
    ids,
  );

  return getProgramTree(organizationId, programId);
}

export async function listAllProgramsForCoach(organizationId: string) {
  return listPrograms(organizationId, {
    page: 1,
    limit: 100,
    offset: 0,
  });
}
