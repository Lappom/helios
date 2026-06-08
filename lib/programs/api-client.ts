import type {
  ProgramAssignmentItem,
  ProgramAssignmentWithProgram,
  ProgramTree,
  ScheduledSession,
} from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchProgram(programId: string): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}`);
  return parseResponse<ProgramTree>(response);
}

export async function createProgramRequest(input: {
  name: string;
  description?: string;
}): Promise<ProgramTree> {
  const response = await fetch("/api/v1/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<ProgramTree>(response);
}

export async function patchProgramRequest(
  programId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<ProgramTree>(response);
}

export async function publishProgramRequest(
  programId: string,
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/publish`, {
    method: "POST",
  });
  return parseResponse<ProgramTree>(response);
}

export async function unpublishProgramRequest(
  programId: string,
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/unpublish`, {
    method: "POST",
  });
  return parseResponse<ProgramTree>(response);
}

export async function duplicateProgramRequest(
  programId: string,
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/duplicate`, {
    method: "POST",
  });
  return parseResponse<ProgramTree>(response);
}

export async function createMesocycleRequest(
  programId: string,
  input?: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/mesocycles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return parseResponse<ProgramTree>(response);
}

export async function patchMesocycleRequest(
  programId: string,
  mesocycleId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/mesocycles/${mesocycleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function deleteMesocycleRequest(
  programId: string,
  mesocycleId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/mesocycles/${mesocycleId}`,
    { method: "DELETE" },
  );
  return parseResponse<ProgramTree>(response);
}

export async function reorderMesocyclesRequest(
  programId: string,
  ids: string[],
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/mesocycles/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function duplicateMesocycleRequest(
  programId: string,
  mesocycleId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/mesocycles/${mesocycleId}/duplicate`,
    { method: "POST" },
  );
  return parseResponse<ProgramTree>(response);
}

export async function createMacrocycleRequest(
  programId: string,
  mesocycleId: string,
  input?: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/mesocycles/${mesocycleId}/macrocycles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function patchMacrocycleRequest(
  programId: string,
  macrocycleId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/macrocycles/${macrocycleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function createMicrocycleRequest(
  programId: string,
  macrocycleId: string,
  input?: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/macrocycles/${macrocycleId}/microcycles`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function patchMicrocycleRequest(
  programId: string,
  microcycleId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/microcycles/${microcycleId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function moveWeekRequest(
  weekId: string,
  input: { microcycleId: string | null; label?: string },
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/program-weeks/${weekId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<ProgramTree>(response);
}

export async function createWeekRequest(
  programId: string,
  input?: { label?: string; microcycleId?: string },
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/weeks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return parseResponse<ProgramTree>(response);
}

export async function deleteWeekRequest(
  programId: string,
  weekId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/weeks/${weekId}`,
    { method: "DELETE" },
  );
  return parseResponse<ProgramTree>(response);
}

export async function reorderWeeksRequest(
  programId: string,
  ids: string[],
): Promise<ProgramTree> {
  const response = await fetch(`/api/v1/programs/${programId}/weeks/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return parseResponse<ProgramTree>(response);
}

export async function createSessionRequest(
  programId: string,
  weekId: string,
  input?: { name?: string },
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/weeks/${weekId}/sessions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function deleteSessionRequest(
  programId: string,
  sessionId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/sessions/${sessionId}`,
    { method: "DELETE" },
  );
  return parseResponse<ProgramTree>(response);
}

export async function createBlockRequest(
  programId: string,
  sessionId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/sessions/${sessionId}/blocks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function patchBlockRequest(
  programId: string,
  blockId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/blocks/${blockId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function deleteBlockRequest(
  programId: string,
  blockId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/blocks/${blockId}`,
    { method: "DELETE" },
  );
  return parseResponse<ProgramTree>(response);
}

export async function reorderBlocksRequest(
  programId: string,
  sessionId: string,
  ids: string[],
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/sessions/${sessionId}/blocks/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function patchBlockExerciseRequest(
  programId: string,
  blockExerciseId: string,
  input: Record<string, unknown>,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/block-exercises/${blockExerciseId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function addBlockExerciseRequest(
  programId: string,
  blockId: string,
  exerciseId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/blocks/${blockId}/exercises`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId }),
    },
  );
  return parseResponse<ProgramTree>(response);
}

export async function deleteBlockExerciseRequest(
  programId: string,
  blockExerciseId: string,
): Promise<ProgramTree> {
  const response = await fetch(
    `/api/v1/programs/${programId}/block-exercises/${blockExerciseId}`,
    { method: "DELETE" },
  );
  return parseResponse<ProgramTree>(response);
}

export type AssignProgramResult = {
  created: ProgramAssignmentItem[];
  skipped: { clientId: string; reason: string }[];
};

export async function assignProgramRequest(
  programId: string,
  input: { clientIds: string[]; startDate: string },
): Promise<AssignProgramResult> {
  const response = await fetch(`/api/v1/programs/${programId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<AssignProgramResult>(response);
}

export async function fetchClientPrograms(
  clientId: string,
): Promise<ProgramAssignmentWithProgram[]> {
  const response = await fetch(`/api/v1/clients/${clientId}/programs`);
  return parseResponse<ProgramAssignmentWithProgram[]>(response);
}

export async function fetchActiveClientProgram(
  clientId: string,
): Promise<ProgramAssignmentWithProgram> {
  const response = await fetch(`/api/v1/clients/${clientId}/programs/active`);
  return parseResponse<ProgramAssignmentWithProgram>(response);
}

export type AssignmentScheduleResponse = {
  assignment: ProgramAssignmentItem;
  sessions: ScheduledSession[];
};

export async function fetchAssignmentSchedule(
  assignmentId: string,
  range?: { start: string; end: string },
): Promise<AssignmentScheduleResponse> {
  const params = new URLSearchParams();
  if (range) {
    params.set("start", range.start);
    params.set("end", range.end);
  }
  const query = params.toString();
  const response = await fetch(
    `/api/v1/assignments/${assignmentId}/schedule${query ? `?${query}` : ""}`,
  );
  return parseResponse<AssignmentScheduleResponse>(response);
}

export async function patchSessionScheduleRequest(
  assignmentId: string,
  sessionId: string,
  scheduledDate: string,
): Promise<AssignmentScheduleResponse> {
  const response = await fetch(
    `/api/v1/assignments/${assignmentId}/sessions/${sessionId}/schedule`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate }),
    },
  );
  return parseResponse<AssignmentScheduleResponse>(response);
}
