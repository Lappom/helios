import type { ProgramTree } from "./types";

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

export async function createWeekRequest(
  programId: string,
  input?: { label?: string },
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
