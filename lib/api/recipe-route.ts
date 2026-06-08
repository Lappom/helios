export function getRecipeIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const recipesIndex = segments.indexOf("recipes");

  if (recipesIndex === -1 || !segments[recipesIndex + 1]) {
    return "";
  }

  const nextSegment = segments[recipesIndex + 1]!;
  if (nextSegment === "scale") {
    return "";
  }

  return nextSegment;
}
