export function getNutritionPlanIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const plansIndex = segments.indexOf("nutrition-plans");

  if (plansIndex === -1 || !segments[plansIndex + 1]) {
    return "";
  }

  const next = segments[plansIndex + 1]!;
  if (next === "meals") {
    return "";
  }

  return next;
}

export function getMealIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const mealsIndex = segments.indexOf("meals");

  if (mealsIndex === -1 || !segments[mealsIndex + 1]) {
    return "";
  }

  const next = segments[mealsIndex + 1]!;
  if (next === "reorder" || next === "items") {
    return "";
  }

  return next;
}

export function getMealItemIdFromPath(request: Request): string {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  const itemsIndex = segments.indexOf("items");

  if (itemsIndex === -1 || !segments[itemsIndex + 1]) {
    return "";
  }

  const next = segments[itemsIndex + 1]!;
  if (next === "reorder") {
    return "";
  }

  return next;
}
