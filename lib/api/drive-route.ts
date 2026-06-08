export function getDriveFileIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("files");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (next === "share" || next === "download") {
    return "";
  }

  return next;
}

export function getDriveFolderIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("folders");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  const next = segments[index + 1]!;
  if (next === "share") {
    return "";
  }

  return next;
}

export function getDriveShareIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf("shares");

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  return segments[index + 1]!;
}
