import type {
  NutritionAssignmentItem,
  NutritionAssignmentWithPlan,
  NutritionPlanListItem,
  NutritionPlanTree,
  PlanAdherenceReport,
} from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchNutritionPlan(
  planId: string,
): Promise<NutritionPlanTree> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}`);
  return parseResponse<NutritionPlanTree>(response);
}

export async function createNutritionPlanRequest(input: {
  name: string;
  targetCalories?: number;
  targetProteinG?: number;
  targetCarbsG?: number;
  targetFatG?: number;
}): Promise<NutritionPlanTree> {
  const response = await fetch("/api/v1/nutrition-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<NutritionPlanTree>(response);
}

export async function patchNutritionPlanRequest(
  planId: string,
  input: Record<string, unknown>,
): Promise<NutritionPlanTree> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<NutritionPlanTree>(response);
}

export async function publishNutritionPlanRequest(
  planId: string,
): Promise<NutritionPlanTree> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}/publish`, {
    method: "POST",
  });
  return parseResponse<NutritionPlanTree>(response);
}

export async function unpublishNutritionPlanRequest(
  planId: string,
): Promise<NutritionPlanTree> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}/unpublish`, {
    method: "POST",
  });
  return parseResponse<NutritionPlanTree>(response);
}

export async function createMealRequest(
  planId: string,
  input?: { name?: string; timeSlot?: string | null },
): Promise<NutritionPlanTree> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}/meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  return parseResponse<NutritionPlanTree>(response);
}

export async function patchMealRequest(
  planId: string,
  mealId: string,
  input: Record<string, unknown>,
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function deleteMealRequest(
  planId: string,
  mealId: string,
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}`,
    { method: "DELETE" },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function reorderMealsRequest(
  planId: string,
  mealIds: string[],
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealIds }),
    },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function createMealItemRequest(
  planId: string,
  mealId: string,
  input: {
    itemType: "food" | "recipe";
    foodId?: string;
    recipeId?: string;
    quantity: number;
    unit: string;
  },
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function patchMealItemRequest(
  planId: string,
  mealId: string,
  itemId: string,
  input: Record<string, unknown>,
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}/items/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function deleteMealItemRequest(
  planId: string,
  mealId: string,
  itemId: string,
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}/items/${itemId}`,
    { method: "DELETE" },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function reorderMealItemsRequest(
  planId: string,
  mealId: string,
  itemIds: string[],
): Promise<NutritionPlanTree> {
  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/meals/${mealId}/items/reorder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds }),
    },
  );
  return parseResponse<NutritionPlanTree>(response);
}

export async function assignNutritionPlanRequest(
  planId: string,
  input: { clientIds: string[]; startDate: string },
): Promise<{
  created: NutritionAssignmentItem[];
  skipped: { clientId: string; reason: string }[];
}> {
  const response = await fetch(`/api/v1/nutrition-plans/${planId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchPlanAdherence(
  planId: string,
  params: { start: string; end: string; clientId?: string },
): Promise<PlanAdherenceReport> {
  const query = new URLSearchParams({
    start: params.start,
    end: params.end,
  });
  if (params.clientId) {
    query.set("clientId", params.clientId);
  }

  const response = await fetch(
    `/api/v1/nutrition-plans/${planId}/adherence?${query.toString()}`,
  );
  return parseResponse<PlanAdherenceReport>(response);
}

export async function fetchActiveClientNutrition(
  clientId: string,
): Promise<NutritionAssignmentWithPlan | null> {
  const response = await fetch(`/api/v1/clients/${clientId}/nutrition/active`);
  return parseResponse<NutritionAssignmentWithPlan | null>(response);
}

export type { NutritionPlanListItem };
