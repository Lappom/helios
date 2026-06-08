import type { FeedbackTemplateTree, SessionFeedbackDetail } from "./types";
import type { SubmitSessionFeedbackInput } from "@/lib/validators/session-feedback";

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

export async function fetchActiveFeedbackTemplate(): Promise<FeedbackTemplateTree> {
  const response = await fetch("/api/v1/me/feedback-template");
  return parseResponse(response);
}

export async function submitSessionFeedbackRequest(
  sessionLogId: string,
  payload: SubmitSessionFeedbackInput,
): Promise<SessionFeedbackDetail> {
  const response = await fetch(`/api/v1/session-logs/${sessionLogId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}
