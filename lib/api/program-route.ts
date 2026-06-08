export function getProgramIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const programsIndex = segments.indexOf("programs");

  if (programsIndex === -1 || !segments[programsIndex + 1]) {
    return "";
  }

  const next = segments[programsIndex + 1]!;
  if (
    next === "weeks" ||
    next === "sessions" ||
    next === "blocks" ||
    next === "mesocycles" ||
    next === "macrocycles" ||
    next === "microcycles"
  ) {
    return "";
  }

  return next;
}

export function getWeekIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const weeksIndex = segments.indexOf("weeks");

  if (weeksIndex === -1 || !segments[weeksIndex + 1]) {
    return "";
  }

  const next = segments[weeksIndex + 1]!;
  if (next === "reorder" || next === "sessions") {
    return "";
  }

  return next;
}

export function getSessionIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const sessionsIndex = segments.indexOf("sessions");

  if (sessionsIndex === -1 || !segments[sessionsIndex + 1]) {
    return "";
  }

  const next = segments[sessionsIndex + 1]!;
  if (next === "reorder" || next === "blocks") {
    return "";
  }

  return next;
}

export function getBlockIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const blocksIndex = segments.indexOf("blocks");

  if (blocksIndex === -1 || !segments[blocksIndex + 1]) {
    return "";
  }

  const next = segments[blocksIndex + 1]!;
  if (next === "reorder") {
    return "";
  }

  return next;
}

function getSegmentAfter(request: Request, key: string, reserved: string[] = []) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf(key);
  if (index === -1 || !segments[index + 1]) return "";
  const next = segments[index + 1]!;
  if (reserved.includes(next)) return "";
  return next;
}

export function getMesocycleIdFromPath(request: Request): string {
  return getSegmentAfter(request, "mesocycles", ["reorder", "macrocycles"]);
}

export function getMacrocycleIdFromPath(request: Request): string {
  return getSegmentAfter(request, "macrocycles", ["reorder", "microcycles"]);
}

export function getMicrocycleIdFromPath(request: Request): string {
  return getSegmentAfter(request, "microcycles", ["reorder"]);
}

export function getProgramWeekIdFromPath(request: Request): string {
  return getSegmentAfter(request, "program-weeks");
}

export function getBlockExerciseIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const blockExercisesIndex = segments.indexOf("block-exercises");

  if (blockExercisesIndex === -1 || !segments[blockExercisesIndex + 1]) {
    return "";
  }

  return segments[blockExercisesIndex + 1]!;
}
