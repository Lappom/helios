import type {
  AssessmentCompareResult,
  AssessmentDetail,
  AssessmentListItem,
  AssessmentTemplateListItem,
  AssessmentTemplateTree,
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

export async function fetchAssessmentTemplates(): Promise<{
  items: AssessmentTemplateListItem[];
}> {
  const response = await fetch("/api/v1/assessment-templates?limit=100");
  return parseResponse(response);
}

export async function createAssessmentTemplateRequest(input: {
  name: string;
  frequency?: string;
  autoAssignOnProgramStart?: boolean;
  daysAfterProgramStart?: number;
  isDefault?: boolean;
}): Promise<AssessmentTemplateTree> {
  const response = await fetch("/api/v1/assessment-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchAssessmentTemplate(
  templateId: string,
): Promise<AssessmentTemplateTree> {
  const response = await fetch(`/api/v1/assessment-templates/${templateId}`);
  return parseResponse(response);
}

export async function patchAssessmentTemplateRequest(
  templateId: string,
  input: Record<string, unknown>,
): Promise<AssessmentTemplateTree> {
  const response = await fetch(`/api/v1/assessment-templates/${templateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteAssessmentTemplateRequest(
  templateId: string,
): Promise<void> {
  const response = await fetch(`/api/v1/assessment-templates/${templateId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function createAssessmentFieldRequest(
  templateId: string,
  input: Record<string, unknown>,
): Promise<AssessmentTemplateTree> {
  const response = await fetch(
    `/api/v1/assessment-templates/${templateId}/fields`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function patchAssessmentFieldRequest(
  templateId: string,
  fieldId: string,
  input: Record<string, unknown>,
): Promise<AssessmentTemplateTree> {
  const response = await fetch(
    `/api/v1/assessment-templates/${templateId}/fields/${fieldId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function deleteAssessmentFieldRequest(
  templateId: string,
  fieldId: string,
): Promise<AssessmentTemplateTree> {
  const response = await fetch(
    `/api/v1/assessment-templates/${templateId}/fields/${fieldId}`,
    { method: "DELETE" },
  );
  return parseResponse(response);
}

export async function reorderAssessmentFieldsRequest(
  templateId: string,
  fieldIds: string[],
): Promise<AssessmentTemplateTree> {
  const response = await fetch(
    `/api/v1/assessment-templates/${templateId}/fields`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldIds }),
    },
  );
  return parseResponse(response);
}

export async function fetchAssessments(params?: {
  status?: string;
  criticalOnly?: boolean;
}): Promise<{ items: AssessmentListItem[] }> {
  const search = new URLSearchParams({ limit: "100" });
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.criticalOnly) {
    search.set("criticalOnly", "true");
  }
  const response = await fetch(`/api/v1/assessments?${search.toString()}`);
  return parseResponse(response);
}

export async function createAssessmentRequest(input: {
  clientId: string;
  templateId: string;
  dueAt?: string;
}): Promise<AssessmentDetail> {
  const response = await fetch("/api/v1/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchAssessment(
  assessmentId: string,
): Promise<AssessmentDetail> {
  const response = await fetch(`/api/v1/assessments/${assessmentId}`);
  return parseResponse(response);
}

export async function reviewAssessmentRequest(
  assessmentId: string,
  coachNotes?: string,
): Promise<AssessmentDetail> {
  const response = await fetch(`/api/v1/assessments/${assessmentId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachNotes }),
  });
  return parseResponse(response);
}

export async function compareClientAssessmentsRequest(
  clientId: string,
  a?: string,
  b?: string,
): Promise<AssessmentCompareResult> {
  const search = new URLSearchParams();
  if (a) {
    search.set("a", a);
  }
  if (b) {
    search.set("b", b);
  }
  const query = search.toString();
  const response = await fetch(
    `/api/v1/clients/${clientId}/assessments/compare${query ? `?${query}` : ""}`,
  );
  return parseResponse(response);
}

export function assessmentPhotoUrl(
  assessmentId: string,
  responseId: string,
): string {
  return `/api/v1/assessments/${assessmentId}/photos/${responseId}`;
}

export function assessmentReportPdfUrl(assessmentId: string): string {
  return `/api/v1/assessments/${assessmentId}/report.pdf`;
}
