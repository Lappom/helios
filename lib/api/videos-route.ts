export function getVideoIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("videos");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (
    next === "categories" ||
    next === "upload" ||
    next === "feed" ||
    next === "play" ||
    next === "stream" ||
    next === "thumbnail" ||
    next === "access"
  ) {
    return "";
  }

  return next;
}

export function getVideoCategoryIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("categories");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (next === "reorder") {
    return "";
  }

  return next;
}
