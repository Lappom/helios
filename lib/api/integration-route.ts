export function getIntegrationResourceIdFromPath(
  request: Request,
  resource: "api-keys" | "webhooks",
): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const index = segments.indexOf(resource);

  if (index === -1 || !segments[index + 1]) {
    return "";
  }

  return segments[index + 1]!;
}

export function getPublicResourceIdFromPath(
  request: Request,
  resource: "clients" | "programs" | "sessions",
): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const publicIndex = segments.indexOf("public");

  if (publicIndex === -1) {
    return "";
  }

  const resourceIndex = segments.indexOf(resource, publicIndex);
  if (resourceIndex === -1 || !segments[resourceIndex + 1]) {
    return "";
  }

  return segments[resourceIndex + 1]!;
}
