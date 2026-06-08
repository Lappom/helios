import type {
  ClientPendingQuestionnaire,
  QuestionnaireListItem,
  QuestionnaireSubmissionDetail,
  QuestionnaireSubmissionListItem,
  QuestionnaireSubmissionStats,
  QuestionnaireTree,
} from "./types";
import type {
  CreateQuestionnaireInput,
  CreateQuestionnaireQuestionInput,
  PatchQuestionnaireInput,
  PatchQuestionnaireQuestionInput,
  PatchQuestionnaireScheduleInput,
  SubmitQuestionnaireInput,
} from "@/lib/validators/questionnaires";

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { detail?: string };
  if (!response.ok) {
    throw new Error(
      (payload as { detail?: string }).detail ?? "Request failed",
    );
  }
  return payload;
}

export async function fetchQuestionnaires(params?: {
  search?: string;
  type?: string;
}): Promise<PaginatedResponse<QuestionnaireListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.type) searchParams.set("type", params.type);

  const response = await fetch(
    `/api/v1/questionnaires?${searchParams.toString()}`,
  );
  return parseResponse(response);
}

export async function fetchQuestionnaireStats(): Promise<QuestionnaireSubmissionStats> {
  const response = await fetch("/api/v1/questionnaires/stats");
  return parseResponse(response);
}

export async function createQuestionnaireRequest(
  input: CreateQuestionnaireInput,
): Promise<QuestionnaireTree> {
  const response = await fetch("/api/v1/questionnaires", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function patchQuestionnaireRequest(
  id: string,
  input: PatchQuestionnaireInput,
): Promise<QuestionnaireTree> {
  const response = await fetch(`/api/v1/questionnaires/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteQuestionnaireRequest(id: string): Promise<void> {
  const response = await fetch(`/api/v1/questionnaires/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = (await response.json()) as { detail?: string };
    throw new Error(payload.detail ?? "Request failed");
  }
}

export async function createQuestionnaireQuestionRequest(
  questionnaireId: string,
  input: CreateQuestionnaireQuestionInput,
): Promise<QuestionnaireTree> {
  const response = await fetch(
    `/api/v1/questionnaires/${questionnaireId}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function patchQuestionnaireQuestionRequest(
  questionnaireId: string,
  questionId: string,
  input: PatchQuestionnaireQuestionInput,
): Promise<QuestionnaireTree> {
  const response = await fetch(
    `/api/v1/questionnaires/${questionnaireId}/questions/${questionId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function deleteQuestionnaireQuestionRequest(
  questionnaireId: string,
  questionId: string,
): Promise<QuestionnaireTree> {
  const response = await fetch(
    `/api/v1/questionnaires/${questionnaireId}/questions/${questionId}`,
    { method: "DELETE" },
  );
  return parseResponse(response);
}

export async function reorderQuestionnaireQuestionsRequest(
  questionnaireId: string,
  questionIds: string[],
): Promise<QuestionnaireTree> {
  const response = await fetch(
    `/api/v1/questionnaires/${questionnaireId}/questions/reorder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds }),
    },
  );
  return parseResponse(response);
}

export async function patchQuestionnaireScheduleRequest(
  questionnaireId: string,
  input: PatchQuestionnaireScheduleInput,
): Promise<QuestionnaireTree> {
  const response = await fetch(
    `/api/v1/questionnaires/${questionnaireId}/schedule`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function fetchQuestionnaireSubmissions(params?: {
  status?: string;
  questionnaireId?: string;
  clientId?: string;
}): Promise<PaginatedResponse<QuestionnaireSubmissionListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.questionnaireId) {
    searchParams.set("questionnaireId", params.questionnaireId);
  }
  if (params?.clientId) searchParams.set("clientId", params.clientId);

  const response = await fetch(
    `/api/v1/questionnaires/submissions?${searchParams.toString()}`,
  );
  return parseResponse(response);
}

export async function fetchQuestionnaireSubmissionDetail(
  submissionId: string,
): Promise<QuestionnaireSubmissionDetail> {
  const response = await fetch(
    `/api/v1/questionnaires/submissions/${submissionId}`,
  );
  return parseResponse(response);
}

export async function submitQuestionnaireRequest(
  submissionId: string,
  input: SubmitQuestionnaireInput,
): Promise<QuestionnaireSubmissionDetail> {
  const response = await fetch(
    `/api/v1/questionnaires/submissions/${submissionId}/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseResponse(response);
}

export async function fetchClientPendingQuestionnaires(): Promise<
  ClientPendingQuestionnaire[]
> {
  const response = await fetch("/api/v1/client/questionnaires/pending");
  return parseResponse(response);
}
