import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  assignmentSessionOverrides,
  blockExerciseAlternatives,
  blockExercises,
  exerciseBlocks,
  programAssignments,
  programSessions,
  programWeeks,
  sessionLogs,
  setLogs,
  setPrescriptions,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import { getActiveClientProgram } from "@/lib/programs/assignments";
import { loadScheduleSessionInputs } from "@/lib/programs/schedule-inputs";
import {
  buildAssignmentSchedule,
  filterScheduleByRange,
} from "@/lib/programs/schedule";
import type { ExerciseBlockItem } from "@/lib/programs/types";
import type {
  CompleteSessionInput,
  LogSetInput,
  StartSessionInput,
} from "@/lib/validators/sessions";
import type {
  ClientSchedulePayload,
  EnrichedScheduledSession,
  SessionExecutionDetail,
  SessionLogItem,
  SessionRecap,
  SetLogItem,
} from "./types";
import { normalizeScheduledDate, toScheduledDateKey } from "./utils";

function mapSessionLog(row: typeof sessionLogs.$inferSelect): SessionLogItem {
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    programSessionId: row.programSessionId,
    scheduledDate: row.scheduledDate,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function mapSetLog(row: typeof setLogs.$inferSelect): SetLogItem {
  return {
    id: row.id,
    blockExerciseId: row.blockExerciseId,
    setPrescriptionId: row.setPrescriptionId,
    setNumber: row.setNumber,
    exerciseId: row.exerciseId,
    load: row.load,
    reps: row.reps,
    rpe: row.rpe,
    durationSeconds: row.durationSeconds,
    skipped: row.skipped,
  };
}

async function fetchSessionBlocks(
  organizationId: string,
  programSessionId: string,
): Promise<ExerciseBlockItem[]> {
  const session = await db.query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, programSessionId),
    ),
    with: {
      blocks: {
        orderBy: [asc(exerciseBlocks.sortOrder)],
        with: {
          exercises: {
            orderBy: [asc(blockExercises.sortOrder)],
            with: {
              exercise: true,
              alternatives: {
                orderBy: [asc(blockExerciseAlternatives.sortOrder)],
                with: { exercise: true },
              },
              prescriptions: {
                orderBy: [asc(setPrescriptions.setNumber)],
              },
            },
          },
        },
      },
    },
  });

  if (!session) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
      detail: `Session ${programSessionId} was not found.`,
    });
  }

  return session.blocks.map((block) => ({
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
  }));
}

async function getActiveAssignmentForClient(
  organizationId: string,
  clientId: string,
) {
  return getActiveClientProgram(organizationId, clientId);
}

async function loadSessionLogsForAssignment(
  organizationId: string,
  assignmentId: string,
) {
  return db.query.sessionLogs.findMany({
    where: and(
      eq(sessionLogs.organizationId, organizationId),
      eq(sessionLogs.assignmentId, assignmentId),
    ),
  });
}

function enrichSchedule(
  schedule: ReturnType<typeof buildAssignmentSchedule>,
  logs: (typeof sessionLogs.$inferSelect)[],
): EnrichedScheduledSession[] {
  const logByKey = new Map(
    logs.map((log) => [
      `${log.programSessionId}:${toScheduledDateKey(log.scheduledDate)}`,
      log,
    ]),
  );

  return schedule.map((session) => {
    const scheduledDateKey = toScheduledDateKey(session.scheduledDate);
    const log = logByKey.get(`${session.programSessionId}:${scheduledDateKey}`);

    let status: EnrichedScheduledSession["status"] = "planned";
    let sessionLogId: string | undefined;

    if (log) {
      sessionLogId = log.id;
      if (log.status === "completed") {
        status = "completed";
      } else if (log.status === "in_progress") {
        status = "in_progress";
      }
    }

    return {
      programSessionId: session.programSessionId,
      name: session.name,
      weekLabel: session.weekLabel,
      weekSortOrder: session.weekSortOrder,
      sessionSortOrder: session.sessionSortOrder,
      scheduledDate: session.scheduledDate,
      scheduledDateKey,
      hasOverride: session.hasOverride,
      mesocycleId: session.mesocycleId,
      mesocycleName: session.mesocycleName,
      macrocycleId: session.macrocycleId,
      macrocycleName: session.macrocycleName,
      microcycleId: session.microcycleId,
      microcycleName: session.microcycleName,
      focus: session.focus,
      weekIndexInMicrocycle: session.weekIndexInMicrocycle,
      weeksInMicrocycle: session.weeksInMicrocycle,
      status,
      sessionLogId,
    };
  });
}

export async function getEnrichedSchedule(
  organizationId: string,
  clientId: string,
  range?: { start: Date; end: Date },
): Promise<ClientSchedulePayload> {
  const assignment = await getActiveAssignmentForClient(
    organizationId,
    clientId,
  );

  const [sessionInputs, overrides, logs] = await Promise.all([
    loadScheduleSessionInputs(organizationId, assignment.programId, {
      startMesocycleId: assignment.startMesocycleId,
    }),
    db.query.assignmentSessionOverrides.findMany({
      where: eq(assignmentSessionOverrides.assignmentId, assignment.id),
    }),
    loadSessionLogsForAssignment(organizationId, assignment.id),
  ]);

  let schedule = buildAssignmentSchedule(
    assignment.startDate,
    sessionInputs,
    overrides.map((row) => ({
      programSessionId: row.programSessionId,
      scheduledDate: row.scheduledDate,
    })),
  );

  if (range) {
    schedule = filterScheduleByRange(schedule, range.start, range.end);
  }

  return {
    assignment,
    sessions: enrichSchedule(schedule, logs),
  };
}

async function assertSessionBelongsToAssignment(
  organizationId: string,
  assignmentId: string,
  programId: string,
  programSessionId: string,
) {
  const session = await db.query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, programSessionId),
    ),
    with: { week: true },
  });

  if (!session || session.week.programId !== programId) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
      detail: "Session does not belong to the active program assignment.",
    });
  }

  return session;
}

async function getSessionLogOrThrow(
  organizationId: string,
  clientId: string,
  sessionLogId: string,
) {
  const log = await db.query.sessionLogs.findFirst({
    where: and(
      eq(sessionLogs.organizationId, organizationId),
      eq(sessionLogs.id, sessionLogId),
      eq(sessionLogs.clientId, clientId),
    ),
  });

  if (!log) {
    throw problem({
      type: "not-found",
      title: "Session log not found",
      status: 404,
      detail: `Session log ${sessionLogId} was not found.`,
    });
  }

  return log;
}

export async function getSessionExecutionDetail(
  organizationId: string,
  clientId: string,
  programSessionId: string,
  scheduledDateKey: string,
): Promise<SessionExecutionDetail> {
  const assignment = await getActiveAssignmentForClient(
    organizationId,
    clientId,
  );
  const scheduledDate = normalizeScheduledDate(scheduledDateKey);

  await assertSessionBelongsToAssignment(
    organizationId,
    assignment.id,
    assignment.programId,
    programSessionId,
  );

  const [blocks, sessionMeta, existingLog, setLogRows] = await Promise.all([
    fetchSessionBlocks(organizationId, programSessionId),
    db.query.programSessions.findFirst({
      where: and(
        eq(programSessions.organizationId, organizationId),
        eq(programSessions.id, programSessionId),
      ),
      with: { week: true },
    }),
    db.query.sessionLogs.findFirst({
      where: and(
        eq(sessionLogs.organizationId, organizationId),
        eq(sessionLogs.assignmentId, assignment.id),
        eq(sessionLogs.programSessionId, programSessionId),
        eq(sessionLogs.scheduledDate, scheduledDate),
      ),
    }),
    db.query.sessionLogs
      .findFirst({
        where: and(
          eq(sessionLogs.organizationId, organizationId),
          eq(sessionLogs.assignmentId, assignment.id),
          eq(sessionLogs.programSessionId, programSessionId),
          eq(sessionLogs.scheduledDate, scheduledDate),
        ),
      })
      .then(async (log) => {
        if (!log) {
          return [];
        }
        return db.query.setLogs.findMany({
          where: and(
            eq(setLogs.organizationId, organizationId),
            eq(setLogs.sessionLogId, log.id),
          ),
        });
      }),
  ]);

  return {
    assignment,
    sessionLog: existingLog ? mapSessionLog(existingLog) : null,
    setLogs: setLogRows.map(mapSetLog),
    programSessionId,
    sessionName: sessionMeta?.name ?? "Séance",
    weekLabel: sessionMeta?.week.label ?? "",
    scheduledDate,
    blocks,
  };
}

export async function startSession(
  organizationId: string,
  clientId: string,
  programSessionId: string,
  input: StartSessionInput,
): Promise<SessionExecutionDetail> {
  const assignment = await getActiveAssignmentForClient(
    organizationId,
    clientId,
  );
  const scheduledDate = normalizeScheduledDate(input.scheduledDate);

  await assertSessionBelongsToAssignment(
    organizationId,
    assignment.id,
    assignment.programId,
    programSessionId,
  );

  const existingForOccurrence = await db.query.sessionLogs.findFirst({
    where: and(
      eq(sessionLogs.organizationId, organizationId),
      eq(sessionLogs.assignmentId, assignment.id),
      eq(sessionLogs.programSessionId, programSessionId),
      eq(sessionLogs.scheduledDate, scheduledDate),
    ),
  });

  if (existingForOccurrence?.status === "completed") {
    throw problem({
      type: "validation-error",
      title: "Session already completed",
      status: 409,
      detail: "This scheduled session has already been completed.",
    });
  }

  if (existingForOccurrence?.status === "in_progress") {
    return getSessionExecutionDetail(
      organizationId,
      clientId,
      programSessionId,
      input.scheduledDate,
    );
  }

  const otherInProgress = await db.query.sessionLogs.findFirst({
    where: and(
      eq(sessionLogs.organizationId, organizationId),
      eq(sessionLogs.clientId, clientId),
      eq(sessionLogs.status, "in_progress"),
    ),
  });

  if (otherInProgress) {
    throw problem({
      type: "validation-error",
      title: "Another session in progress",
      status: 409,
      detail:
        "Finish or abandon the current session before starting a new one.",
    });
  }

  await db.insert(sessionLogs).values({
    organizationId,
    clientId,
    assignmentId: assignment.id,
    programSessionId,
    scheduledDate,
    status: "in_progress",
  });

  return getSessionExecutionDetail(
    organizationId,
    clientId,
    programSessionId,
    input.scheduledDate,
  );
}

export async function logSet(
  organizationId: string,
  clientId: string,
  programSessionId: string,
  input: LogSetInput,
): Promise<SessionExecutionDetail> {
  const log = await getSessionLogOrThrow(
    organizationId,
    clientId,
    input.sessionLogId,
  );

  if (log.programSessionId !== programSessionId) {
    throw problem({
      type: "validation-error",
      title: "Session mismatch",
      status: 400,
      detail: "Session log does not match the requested program session.",
    });
  }

  if (log.status !== "in_progress") {
    throw problem({
      type: "forbidden",
      title: "Session not active",
      status: 403,
      detail: "Sets can only be logged while the session is in progress.",
    });
  }

  const blockExercise = await db.query.blockExercises.findFirst({
    where: and(
      eq(blockExercises.organizationId, organizationId),
      eq(blockExercises.id, input.blockExerciseId),
    ),
    with: { block: true },
  });

  if (
    !blockExercise ||
    blockExercise.block.programSessionId !== programSessionId
  ) {
    throw problem({
      type: "not-found",
      title: "Exercise not found",
      status: 404,
      detail: "Block exercise does not belong to this session.",
    });
  }

  const allowedExerciseIds = new Set([
    blockExercise.exerciseId,
    ...(await db.query.blockExerciseAlternatives.findMany({
      where: eq(
        blockExerciseAlternatives.blockExerciseId,
        blockExercise.id,
      ),
      columns: { exerciseId: true },
    })).map((row) => row.exerciseId),
  ]);

  if (!allowedExerciseIds.has(input.exerciseId)) {
    throw problem({
      type: "validation-error",
      title: "Invalid exercise",
      status: 400,
      detail: "Selected exercise is not part of this block exercise.",
    });
  }

  const existingSet = await db.query.setLogs.findFirst({
    where: and(
      eq(setLogs.organizationId, organizationId),
      eq(setLogs.sessionLogId, log.id),
      eq(setLogs.blockExerciseId, input.blockExerciseId),
      eq(setLogs.setNumber, input.setNumber),
    ),
  });

  if (existingSet) {
    await db
      .update(setLogs)
      .set({
        setPrescriptionId: input.setPrescriptionId ?? null,
        exerciseId: input.exerciseId,
        load: input.load ?? null,
        reps: input.reps ?? null,
        rpe: input.rpe ?? null,
        durationSeconds: input.durationSeconds ?? null,
        skipped: input.skipped ?? false,
      })
      .where(eq(setLogs.id, existingSet.id));
  } else {
    await db.insert(setLogs).values({
      organizationId,
      sessionLogId: log.id,
      blockExerciseId: input.blockExerciseId,
      setPrescriptionId: input.setPrescriptionId ?? null,
      setNumber: input.setNumber,
      exerciseId: input.exerciseId,
      load: input.load ?? null,
      reps: input.reps ?? null,
      rpe: input.rpe ?? null,
      durationSeconds: input.durationSeconds ?? null,
      skipped: input.skipped ?? false,
    });
  }

  return getSessionExecutionDetail(
    organizationId,
    clientId,
    programSessionId,
    toScheduledDateKey(log.scheduledDate),
  );
}

function countExerciseCompletion(
  blocks: ExerciseBlockItem[],
  setLogRows: SetLogItem[],
): { completed: number; total: number } {
  let completed = 0;
  let total = 0;

  for (const block of blocks) {
    for (const exercise of block.exercises) {
      total += 1;
      const prescriptionCount = exercise.prescriptions.length;
      const loggedForExercise = setLogRows.filter(
        (row) => row.blockExerciseId === exercise.id,
      );

      if (prescriptionCount === 0) {
        if (loggedForExercise.some((row) => row.skipped || row.reps || row.load)) {
          completed += 1;
        }
        continue;
      }

      const doneSets = loggedForExercise.filter(
        (row) =>
          row.skipped ||
          row.reps ||
          row.load ||
          row.durationSeconds ||
          row.rpe,
      ).length;

      if (doneSets >= prescriptionCount) {
        completed += 1;
      }
    }
  }

  return { completed, total };
}

export async function completeSession(
  organizationId: string,
  clientId: string,
  programSessionId: string,
  input: CompleteSessionInput,
): Promise<{ recap: SessionRecap; detail: SessionExecutionDetail }> {
  const log = await getSessionLogOrThrow(
    organizationId,
    clientId,
    input.sessionLogId,
  );

  if (log.programSessionId !== programSessionId) {
    throw problem({
      type: "validation-error",
      title: "Session mismatch",
      status: 400,
      detail: "Session log does not match the requested program session.",
    });
  }

  if (log.status !== "in_progress") {
    throw problem({
      type: "forbidden",
      title: "Session not active",
      status: 403,
      detail: "Only in-progress sessions can be completed.",
    });
  }

  const completedAt = new Date();

  await db
    .update(sessionLogs)
    .set({
      status: "completed",
      completedAt,
    })
    .where(eq(sessionLogs.id, log.id));

  const [blocks, setLogRows] = await Promise.all([
    fetchSessionBlocks(organizationId, programSessionId),
    db.query.setLogs.findMany({
      where: and(
        eq(setLogs.organizationId, organizationId),
        eq(setLogs.sessionLogId, log.id),
      ),
    }),
  ]);

  const mappedSets = setLogRows.map(mapSetLog);
  const { completed, total } = countExerciseCompletion(blocks, mappedSets);

  const recap: SessionRecap = {
    sessionLogId: log.id,
    durationSeconds: Math.max(
      0,
      Math.round((completedAt.getTime() - log.startedAt.getTime()) / 1000),
    ),
    setsCompleted: mappedSets.filter((row) => !row.skipped).length,
    setsSkipped: mappedSets.filter((row) => row.skipped).length,
    exercisesCompleted: completed,
    exercisesTotal: total,
  };

  const detail = await getSessionExecutionDetail(
    organizationId,
    clientId,
    programSessionId,
    toScheduledDateKey(log.scheduledDate),
  );

  return { recap, detail };
}

export async function getClientProgressAnalytics(
  organizationId: string,
  clientId: string,
) {
  const assignment = await getActiveAssignmentForClient(
    organizationId,
    clientId,
  );

  const { getProgramAnalytics } = await import("@/lib/sessions/analytics");
  return getProgramAnalytics(
    organizationId,
    assignment.programId,
    clientId,
  );
}
