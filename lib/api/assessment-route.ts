export function getAssessmentTemplateIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("assessment-templates");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (next === "fields") {
    return "";
  }

  return next;
}

export function getAssessmentTemplateFieldIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("fields");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  return segments[index + 1]!;
}

export function getAssessmentIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("assessments");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (
    next === "photos" ||
    next === "submit" ||
    next === "review" ||
    next.endsWith(".pdf")
  ) {
    return "";
  }

  return next;
}

export function getAssessmentResponseIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const photosIndex = segments.indexOf("photos");

  if (photosIndex === -1 || !segments[photosIndex + 1]) {
    return "";
  }

  return segments[photosIndex + 1]!;
}

export function getClientIdFromAssessmentsPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const clientsIndex = segments.indexOf("clients");

  if (clientsIndex === -1 || !segments[clientsIndex + 1]) {
    return "";
  }

  return segments[clientsIndex + 1]!;
}
