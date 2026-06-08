import type {
  ClientFeedbacksSummary,
  FeedbackAlertItem,
  FeedbackTemplateTree,
} from "./types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      (payload as { detail?: string }).detail ??
        `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchFeedbackTemplates(): Promise<{
  items: Array<{ id: string; name: string; isDefault: boolean }>;
}> {
  const response = await fetch("/api/v1/feedback-templates");
  return parseResponse(response);
}

export async function fetchFeedbackTemplate(
  templateId: string,
): Promise<FeedbackTemplateTree> {
  const response = await fetch(`/api/v1/feedback-templates/${templateId}`);
  return parseResponse(response);
}

export async function createFeedbackTemplateRequest(payload: {
  name: string;
  isDefault?: boolean;
}): Promise<FeedbackTemplateTree> {
  const response = await fetch("/api/v1/feedback-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function patchFeedbackTemplateRequest(
  templateId: string,
  payload: { name?: string; isDefault?: boolean },
): Promise<FeedbackTemplateTree> {
  const response = await fetch(`/api/v1/feedback-templates/${templateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function createFeedbackQuestionRequest(
  templateId: string,
  payload: {
    type: "scale" | "text" | "boolean";
    label: string;
    required?: boolean;
  },
): Promise<FeedbackTemplateTree> {
  const response = await fetch(
    `/api/v1/feedback-templates/${templateId}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return parseResponse(response);
}

export async function deleteFeedbackQuestionRequest(
  templateId: string,
  questionId: string,
): Promise<FeedbackTemplateTree> {
  const response = await fetch(
    `/api/v1/feedback-templates/${templateId}/questions/${questionId}`,
    { method: "DELETE" },
  );
  return parseResponse(response);
}

export async function fetchClientFeedbacks(
  clientId: string,
  params?: { page?: number; limit?: number },
): Promise<ClientFeedbacksSummary> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await fetch(
    `/api/v1/clients/${clientId}/feedbacks${suffix}`,
  );
  return parseResponse(response);
}

export async function fetchFeedbackAlerts(params?: {
  page?: number;
  limit?: number;
}): Promise<{ items: FeedbackAlertItem[]; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const response = await fetch(`/api/v1/feedbacks/alerts${suffix}`);
  return parseResponse(response);
}
