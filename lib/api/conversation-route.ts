export function getConversationIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("conversations");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (
    next === "messages" ||
    next === "read" ||
    next === "upload" ||
    next === "media"
  ) {
    return "";
  }

  return next;
}

export function getMessageIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("messages");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (next === "media") {
    return "";
  }

  return next;
}
