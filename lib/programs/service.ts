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
import { db } from "@/lib/db";
import {
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  exercises,
  programSessions,
  programs,
  programWeeks,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
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

async function getProgramRowOrThrow(organizationId: string, programId: string) {
  const program = await db.query.programs.findFirst({
    where: and(
      eq(programs.organizationId, organizationId),
      eq(programs.id, programId),
    ),
  });

  if (!program) {
    throw problem({
      type: "not-found",
      title: "Program not found",
      status: 404,
      detail: `Program ${programId} was not found in this organization.`,
    });
  }

  return program;
}

export function assertProgramStructureEditable(program: { status: string }) {
  if (program.status !== "draft") {
    throw problem({
      type: "forbidden",
      title: "Program is locked",
      status: 403,
      detail:
        "Published or archived programs cannot be modified structurally. Unpublish to edit.",
    });
  }
}

async function getNextWeekSortOrder(programId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${programWeeks.sortOrder}), -1)` })
    .from(programWeeks)
    .where(eq(programWeeks.programId, programId));
  return (row?.max ?? -1) + 1;
}

async function getNextSessionSortOrder(weekId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${programSessions.sortOrder}), -1)` })
    .from(programSessions)
    .where(eq(programSessions.programWeekId, weekId));
  return (row?.max ?? -1) + 1;
}

async function getNextBlockSortOrder(sessionId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${exerciseBlocks.sortOrder}), -1)` })
    .from(exerciseBlocks)
    .where(eq(exerciseBlocks.programSessionId, sessionId));
  return (row?.max ?? -1) + 1;
}

async function getNextBlockExerciseSortOrder(blockId: string) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${blockExercises.sortOrder}), -1)` })
    .from(blockExercises)
    .where(eq(blockExercises.exerciseBlockId, blockId));
  return (row?.max ?? -1) + 1;
}

function mapProgramTree(raw: NonNullable<Awaited<ReturnType<typeof fetchProgramRaw>>>): ProgramTree {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    coachClerkUserId: raw.coachClerkUserId,
    publishedAt: raw.publishedAt,
    clonedFromProgramId: raw.clonedFromProgramId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    weeks: raw.weeks.map((week) => ({
      id: week.id,
      sortOrder: week.sortOrder,
      label: week.label,
      sessions: week.sessions.map((session) => ({
        id: session.id,
        sortOrder: session.sortOrder,
        name: session.name,
        dayOfWeek: session.dayOfWeek,
        scheduledDate: session.scheduledDate,
        blocks: session.blocks.map((block) => ({
          id: block.id,
          sortOrder: block.sortOrder,
          type: block.type,
          sharedRestSeconds: block.sharedRestSeconds,
          rounds: block.rounds,
          restBetweenRoundsSeconds: block.restBetweenRoundsSeconds,
          durationSeconds: block.durationSeconds,
          targetRpe: block.targetRpe,
          exercises: block.exercises.map((blockExercise) => ({
            id: blockExercise.id,
            exerciseId: blockExercise.exerciseId,
            exerciseName: blockExercise.exercise.name,
            sortOrder: blockExercise.sortOrder,
            notes: blockExercise.notes,
            alternatives: blockExercise.alternatives.map((alt) => ({
              id: alt.id,
              exerciseId: alt.exerciseId,
              exerciseName: alt.exercise.name,
              sortOrder: alt.sortOrder,
            })),
            prescriptions: blockExercise.prescriptions.map((prescription) => ({
              id: prescription.id,
              setNumber: prescription.setNumber,
              load: prescription.load,
              reps: prescription.reps,
              restSeconds: prescription.restSeconds,
              tempo: prescription.tempo,
              rpe: prescription.rpe,
              durationSeconds: prescription.durationSeconds,
            })),
          })),
        })),
      })),
    })),
  };
}

async function fetchProgramRaw(organizationId: string, programId: string) {
  return db.query.programs.findFirst({
    where: and(
      eq(programs.organizationId, organizationId),
      eq(programs.id, programId),
    ),
    with: {
      weeks: {
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
      },
    },
  });
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
    db
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
          where pw.program_id = ${programs.id}
        )`,
        sessionCount: sql<number>`(
          select count(*)::int from program_sessions ps
          inner join program_weeks pw on ps.program_week_id = pw.id
          where pw.program_id = ${programs.id}
        )`,
      })
      .from(programs)
      .where(where)
      .orderBy(desc(programs.updatedAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ total: count() }).from(programs).where(where),
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
  const programId = await db.transaction(async (tx) => {
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

    const [week] = await tx
      .insert(programWeeks)
      .values({
        organizationId,
        programId: program!.id,
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

export async function getProgramTree(
  organizationId: string,
  programId: string,
): Promise<ProgramTree> {
  const raw = await fetchProgramRaw(organizationId, programId);

  if (!raw) {
    throw problem({
      type: "not-found",
      title: "Program not found",
      status: 404,
      detail: `Program ${programId} was not found in this organization.`,
    });
  }

  return mapProgramTree(raw);
}

export async function patchProgramMetadata(
  organizationId: string,
  programId: string,
  input: PatchProgramInput,
): Promise<ProgramTree> {
  await getProgramRowOrThrow(organizationId, programId);

  await db
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

  await db
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

  await db
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

  const newProgramId = await db.transaction(async (tx) => {
    const [newProgram] = await tx
      .insert(programs)
      .values({
        organizationId,
        coachClerkUserId,
        name: `${source.name} (copie)`,
        description: source.description,
        status: "draft",
        clonedFromProgramId: source.id,
      })
      .returning({ id: programs.id });

    for (const week of source.weeks) {
      const [newWeek] = await tx
        .insert(programWeeks)
        .values({
          organizationId,
          programId: newProgram!.id,
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
  await db.transaction(async (tx) => {
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

  const sortOrder = await getNextWeekSortOrder(programId);

  await db.insert(programWeeks).values({
    organizationId,
    programId,
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

  const week = await db.query.programWeeks.findFirst({
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

  await db
    .update(programWeeks)
    .set(input)
    .where(eq(programWeeks.id, weekId));

  return getProgramTree(organizationId, programId);
}

export async function deleteWeek(
  organizationId: string,
  programId: string,
  weekId: string,
): Promise<ProgramTree> {
  const program = await getProgramRowOrThrow(organizationId, programId);
  assertProgramStructureEditable(program);

  const weeks = await db.query.programWeeks.findMany({
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

  const deleted = await db
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

  const week = await db.query.programWeeks.findFirst({
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

  await db.insert(programSessions).values({
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

  const session = await db.query.programSessions.findFirst({
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

  await db
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

  const session = await db.query.programSessions.findFirst({
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

  const siblingCount = await db
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

  await db.delete(programSessions).where(eq(programSessions.id, sessionId));

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
  const exercise = await db.query.exercises.findFirst({
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

  const session = await db.query.programSessions.findFirst({
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

  await db.transaction(async (tx) => {
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

  const block = await db.query.exerciseBlocks.findFirst({
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

  await db
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

  const block = await db.query.exerciseBlocks.findFirst({
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

  await db.delete(exerciseBlocks).where(eq(exerciseBlocks.id, blockId));

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

  const block = await db.query.exerciseBlocks.findFirst({
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

  await db.transaction(async (tx) => {
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

  const blockExercise = await db.query.blockExercises.findFirst({
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
    await db
      .delete(exerciseBlocks)
      .where(eq(exerciseBlocks.id, blockExercise.block.id));
  } else {
    await db
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

  const blockExercise = await db.query.blockExercises.findFirst({
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

  await db.transaction(async (tx) => {
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
