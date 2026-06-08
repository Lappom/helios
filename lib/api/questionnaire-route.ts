export function getQuestionnaireIdFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("questionnaires");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  const next = segments[index + 1];
  if (!next || next === "submissions" || next === "stats") {
    return null;
  }
  return next;
}

export function getQuestionnaireQuestionIdFromPath(
  request: Request,
): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("questions");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  const next = segments[index + 1];
  if (!next || next === "reorder") {
    return null;
  }
  return next;
}

export function getQuestionnaireSubmissionIdFromPath(
  request: Request,
): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("submissions");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  return segments[index + 1] ?? null;
}
