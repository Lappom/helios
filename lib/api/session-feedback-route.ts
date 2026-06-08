export function getFeedbackTemplateIdFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("feedback-templates");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  return segments[index + 1] ?? null;
}

export function getFeedbackQuestionIdFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("questions");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  return segments[index + 1] ?? null;
}

export function getSessionLogIdFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("session-logs");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  return segments[index + 1] ?? null;
}

export function getClientIdFromPath(request: Request): string | null {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("clients");
  if (index === -1 || index + 1 >= segments.length) {
    return null;
  }
  return segments[index + 1] ?? null;
}
