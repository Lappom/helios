import type { QuotaCheckResult } from "@/lib/billing/access";
import { AI_CREDIT_COSTS } from "@/lib/billing/ai-credit-costs";
import type { ProgramTree } from "@/lib/programs/types";

export type AiCreditsResponse = {
  quota: QuotaCheckResult;
  costs: typeof AI_CREDIT_COSTS;
};

export type GenerateProgramResponse = {
  program: ProgramTree;
  unresolvedExercises: string[];
  credits: QuotaCheckResult;
};

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

export async function fetchAiCredits(): Promise<AiCreditsResponse> {
  const response = await fetch("/api/v1/ai/credits");
  return parseResponse<AiCreditsResponse>(response);
}

export async function generateProgramRequest(input: {
  prompt: string;
  clientId?: string;
  durationWeeks?: number;
}): Promise<GenerateProgramResponse> {
  const response = await fetch("/api/v1/ai/generate-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<GenerateProgramResponse>(response);
}
