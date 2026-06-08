import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { invalidateSchedule } from "@/lib/cache/invalidate";
import { getDb } from "@/lib/db";
import {
  assignmentSessionOverrides,
  clients,
  programAssignments,
  programMesocycles,
  programSessions,
  programs,
} from "@/lib/db/schema";
import { problem } from "@/lib/api/response";
import type { AssignProgramInput } from "@/lib/validators/programs";
import { loadScheduleSessionInputs } from "./schedule-inputs";
import {
  buildAssignmentSchedule,
  filterScheduleByRange,
  type ScheduledSession,
} from "./schedule";
import type {
  ProgramAssignmentItem,
  ProgramAssignmentWithProgram,
} from "./types";

const ASSIGNABLE_STATUSES = ["ACTIVE", "TRIAL"] as const;

async function getProgramOrThrow(organizationId: string, programId: string) {
  const program = await getDb().query.programs.findFirst({
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

async function getAssignmentOrThrow(
  organizationId: string,
  assignmentId: string,
) {
  const assignment = await getDb().query.programAssignments.findFirst({
    where: and(
      eq(programAssignments.organizationId, organizationId),
      eq(programAssignments.id, assignmentId),
    ),
    with: {
      program: true,
      client: true,
    },
  });

  if (!assignment) {
    throw problem({
      type: "not-found",
      title: "Assignment not found",
      status: 404,
      detail: `Assignment ${assignmentId} was not found in this organization.`,
    });
  }

  return assignment;
}

function mapAssignmentRow(
  row: typeof programAssignments.$inferSelect & {
    program?: { id: string; name: string; status: string };
    client?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  },
): ProgramAssignmentItem {
  return {
    id: row.id,
    programId: row.programId,
    clientId: row.clientId,
    coachClerkUserId: row.coachClerkUserId,
    startMesocycleId: row.startMesocycleId,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    programName: row.program?.name,
    clientFirstName: row.client?.firstName,
    clientLastName: row.client?.lastName,
    clientEmail: row.client?.email,
  };
}

export async function listProgramAssignments(
  organizationId: string,
  programId: string,
): Promise<ProgramAssignmentItem[]> {
  await getProgramOrThrow(organizationId, programId);

  const rows = await getDb().query.programAssignments.findMany({
    where: and(
      eq(programAssignments.organizationId, organizationId),
      eq(programAssignments.programId, programId),
    ),
    orderBy: [desc(programAssignments.createdAt)],
    with: {
      program: true,
      client: true,
    },
  });

  return rows.map(mapAssignmentRow);
}

export async function assignProgram(
  organizationId: string,
  programId: string,
  coachClerkUserId: string,
  input: AssignProgramInput,
): Promise<{
  created: ProgramAssignmentItem[];
  skipped: { clientId: string; reason: string }[];
}> {
  const program = await getProgramOrThrow(organizationId, programId);

  if (program.status !== "published") {
    throw problem({
      type: "forbidden",
      title: "Program not published",
      status: 403,
      detail: "Only published programs can be assigned to clients.",
    });
  }

  const uniqueClientIds = [...new Set(input.clientIds)];
  const clientRows = await getDb().query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.id, uniqueClientIds),
    ),
  });

  const clientMap = new Map(clientRows.map((row) => [row.id, row]));
  const created: ProgramAssignmentItem[] = [];
  const skipped: { clientId: string; reason: string }[] = [];

  const activeAssignments = await getDb().query.programAssignments.findMany({
    where: and(
      eq(programAssignments.organizationId, organizationId),
      eq(programAssignments.status, "active"),
      inArray(programAssignments.clientId, uniqueClientIds),
    ),
  });
  const activeClientIds = new Set(
    activeAssignments.map((row) => row.clientId),
  );

  for (const clientId of uniqueClientIds) {
    const client = clientMap.get(clientId);

    if (!client) {
      skipped.push({ clientId, reason: "Client not found in organization." });
      continue;
    }

    if (
      !ASSIGNABLE_STATUSES.includes(
        client.status as (typeof ASSIGNABLE_STATUSES)[number],
      )
    ) {
      skipped.push({
        clientId,
        reason: "Client must be ACTIVE or TRIAL to receive a program.",
      });
      continue;
    }

    if (activeClientIds.has(clientId)) {
      skipped.push({
        clientId,
        reason: "Client already has an active program assignment.",
      });
      continue;
    }

    if (input.startMesocycleId) {
      const mesocycle = await getDb().query.programMesocycles.findFirst({
        where: and(
          eq(programMesocycles.organizationId, organizationId),
          eq(programMesocycles.programId, programId),
          eq(programMesocycles.id, input.startMesocycleId),
        ),
      });
      if (!mesocycle) {
        skipped.push({
          clientId,
          reason: "Start mesocycle not found on this program.",
        });
        continue;
      }
    }

    const [inserted] = await getDb()
      .insert(programAssignments)
      .values({
        organizationId,
        programId,
        clientId,
        coachClerkUserId,
        startDate: input.startDate,
        startMesocycleId: input.startMesocycleId ?? null,
        status: "active",
      })
      .returning();

    if (inserted) {
      created.push(
        mapAssignmentRow({
          ...inserted,
          program,
          client,
        }),
      );
      activeClientIds.add(clientId);

      const { emitHeliosEvent } = await import("@/lib/events/emit-event");
      emitHeliosEvent("program.published", {
        organizationId,
        programId,
        clientId,
        assignmentId: inserted.id,
      });
    }
  }

  return { created, skipped };
}

export async function listClientPrograms(
  organizationId: string,
  clientId: string,
): Promise<ProgramAssignmentWithProgram[]> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found in this organization.`,
    });
  }

  const rows = await getDb().query.programAssignments.findMany({
    where: and(
      eq(programAssignments.organizationId, organizationId),
      eq(programAssignments.clientId, clientId),
    ),
    orderBy: [desc(programAssignments.createdAt)],
    with: { program: true },
  });

  return rows.map((row) => ({
    ...mapAssignmentRow({ ...row, client }),
    program: {
      id: row.program.id,
      name: row.program.name,
      description: row.program.description,
      status: row.program.status,
    },
  }));
}

export async function getActiveClientProgram(
  organizationId: string,
  clientId: string,
): Promise<ProgramAssignmentWithProgram> {
  const client = await getDb().query.clients.findFirst({
    where: and(
      eq(clients.organizationId, organizationId),
      eq(clients.id, clientId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found in this organization.`,
    });
  }

  const row = await getDb().query.programAssignments.findFirst({
    where: and(
      eq(programAssignments.organizationId, organizationId),
      eq(programAssignments.clientId, clientId),
      eq(programAssignments.status, "active"),
    ),
    with: { program: true },
  });

  if (!row) {
    throw problem({
      type: "not-found",
      title: "No active program",
      status: 404,
      detail: "This client has no active program assignment.",
    });
  }

  return {
    ...mapAssignmentRow({ ...row, client }),
    program: {
      id: row.program.id,
      name: row.program.name,
      description: row.program.description,
      status: row.program.status,
    },
  };
}

export async function getAssignmentSchedule(
  organizationId: string,
  assignmentId: string,
  range?: { start: Date; end: Date },
): Promise<{
  assignment: ProgramAssignmentItem;
  sessions: ScheduledSession[];
}> {
  const assignment = await getAssignmentOrThrow(organizationId, assignmentId);

  const [sessionInputs, overrides] = await Promise.all([
    loadScheduleSessionInputs(organizationId, assignment.programId, {
      startMesocycleId: assignment.startMesocycleId,
    }),
    getDb().query.assignmentSessionOverrides.findMany({
      where: eq(assignmentSessionOverrides.assignmentId, assignmentId),
    }),
  ]);

  let sessions = buildAssignmentSchedule(
    assignment.startDate,
    sessionInputs,
    overrides.map((row) => ({
      programSessionId: row.programSessionId,
      scheduledDate: row.scheduledDate,
    })),
  );

  if (range) {
    sessions = filterScheduleByRange(sessions, range.start, range.end);
  }

  return {
    assignment: mapAssignmentRow(assignment),
    sessions,
  };
}

export async function patchSessionSchedule(
  organizationId: string,
  assignmentId: string,
  programSessionId: string,
  scheduledDate: Date,
): Promise<{ assignment: ProgramAssignmentItem; sessions: ScheduledSession[] }> {
  const assignment = await getAssignmentOrThrow(organizationId, assignmentId);

  if (assignment.status !== "active") {
    throw problem({
      type: "forbidden",
      title: "Assignment not active",
      status: 403,
      detail: "Only active assignments can be rescheduled.",
    });
  }

  const session = await getDb().query.programSessions.findFirst({
    where: and(
      eq(programSessions.organizationId, organizationId),
      eq(programSessions.id, programSessionId),
    ),
    with: { week: true },
  });

  if (!session || session.week.programId !== assignment.programId) {
    throw problem({
      type: "not-found",
      title: "Session not found",
      status: 404,
      detail: "Session does not belong to this assignment program.",
    });
  }

  const existing = await getDb().query.assignmentSessionOverrides.findFirst({
    where: and(
      eq(assignmentSessionOverrides.assignmentId, assignmentId),
      eq(assignmentSessionOverrides.programSessionId, programSessionId),
    ),
  });

  if (existing) {
    await getDb()
      .update(assignmentSessionOverrides)
      .set({ scheduledDate })
      .where(eq(assignmentSessionOverrides.id, existing.id));
  } else {
    await getDb().insert(assignmentSessionOverrides).values({
      organizationId,
      assignmentId,
      programSessionId,
      scheduledDate,
    });
  }

  await invalidateSchedule(organizationId, assignment.clientId);

  return getAssignmentSchedule(organizationId, assignmentId);
}
