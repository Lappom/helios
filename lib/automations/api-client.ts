import type {
  AutomationExecutionItem,
  AutomationListItem,
  AutomationTestResult,
  AutomationTree,
} from "./types";
import type {
  CreateAutomationInput,
  PatchAutomationInput,
  TestAutomationInput,
} from "@/lib/validators/automations";

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

export async function fetchAutomations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<{ items: AutomationListItem[]; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.isActive !== undefined) {
    searchParams.set("isActive", String(params.isActive));
  }

  const query = searchParams.toString();
  const response = await fetch(
    `/api/v1/automations${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export async function fetchAutomation(
  automationId: string,
): Promise<AutomationTree> {
  const response = await fetch(`/api/v1/automations/${automationId}`);
  return parseResponse(response);
}

export async function createAutomationRequest(
  input: CreateAutomationInput,
): Promise<AutomationTree> {
  const response = await fetch("/api/v1/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function patchAutomationRequest(
  automationId: string,
  input: PatchAutomationInput,
): Promise<AutomationTree> {
  const response = await fetch(`/api/v1/automations/${automationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteAutomationRequest(
  automationId: string,
): Promise<void> {
  const response = await fetch(`/api/v1/automations/${automationId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function toggleAutomationRequest(
  automationId: string,
  isActive: boolean,
): Promise<AutomationTree> {
  const response = await fetch(`/api/v1/automations/${automationId}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  return parseResponse(response);
}

export async function fetchAutomationExecutions(
  automationId: string,
  params?: { page?: number; limit?: number; status?: string },
): Promise<{ items: AutomationExecutionItem[]; page: number; limit: number }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.status) searchParams.set("status", params.status);

  const query = searchParams.toString();
  const response = await fetch(
    `/api/v1/automations/${automationId}/executions${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export async function testAutomationRequest(
  automationId: string,
  input: TestAutomationInput,
): Promise<AutomationTestResult> {
  const response = await fetch(`/api/v1/automations/${automationId}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}
