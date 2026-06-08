import type {
  AssessmentDetail,
  ClientPendingAssessment,
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

export async function fetchMyPendingAssessments(): Promise<{
  items: ClientPendingAssessment[];
}> {
  const response = await fetch("/api/v1/assessments?mine=true");
  return parseResponse(response);
}

export async function fetchMyAssessment(
  assessmentId: string,
): Promise<AssessmentDetail> {
  const response = await fetch(`/api/v1/assessments/${assessmentId}`);
  return parseResponse(response);
}

export async function submitAssessmentRequest(
  assessmentId: string,
  responses: Array<{
    fieldId: string;
    textValue?: string | null;
    numberValue?: number | null;
    jsonValue?: Record<string, number> | null;
    photoBlobPath?: string | null;
  }>,
): Promise<AssessmentDetail> {
  const response = await fetch(`/api/v1/assessments/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  });
  return parseResponse(response);
}

export async function uploadAssessmentPhotoRequest(
  assessmentId: string,
  fieldId: string,
  file: File,
): Promise<{ pathname: string; responseId: string | null }> {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("fieldId", fieldId);

  const response = await fetch(`/api/v1/assessments/${assessmentId}/photos`, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}

export function clientAssessmentPhotoUrl(
  assessmentId: string,
  responseId: string,
): string {
  return `/api/v1/assessments/${assessmentId}/photos/${responseId}`;
}
