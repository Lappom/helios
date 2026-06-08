import type { ClientNutritionPayload, MealLogDetail } from "./types";
import type { LogMealInput } from "@/lib/validators/nutrition-plans";

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

export async function fetchMyNutrition(
  date?: string,
): Promise<ClientNutritionPayload | null> {
  const query = date ? `?date=${date}` : "";
  const response = await fetch(`/api/v1/me/nutrition${query}`);
  return parseResponse<ClientNutritionPayload | null>(response);
}

export async function logMealRequest(
  input: LogMealInput,
): Promise<MealLogDetail> {
  const response = await fetch("/api/v1/me/meals/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<MealLogDetail>(response);
}
