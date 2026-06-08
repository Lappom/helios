import type {
  QUESTIONNAIRE_QUESTION_TYPES,
  QUESTIONNAIRE_SUBMISSION_STATUSES,
  QUESTIONNAIRE_TYPES,
} from "@/lib/validators/questionnaires";

export type QuestionnaireType = (typeof QUESTIONNAIRE_TYPES)[number];
export type QuestionnaireQuestionType =
  (typeof QUESTIONNAIRE_QUESTION_TYPES)[number];
export type QuestionnaireSubmissionStatus =
  (typeof QUESTIONNAIRE_SUBMISSION_STATUSES)[number];

export type QuestionnaireQuestionDetail = {
  id: string;
  sortOrder: number;
  type: QuestionnaireQuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  config: Record<string, unknown> | null;
};

export type QuestionnaireScheduleDetail = {
  id: string;
  triggerType: "on_client_created" | "weekly_cron";
  sendDayOfWeek: number | null;
  sendHourUtc: number | null;
  reminderDayOfWeek: number | null;
  reminderHourUtc: number | null;
  isActive: boolean;
};

export type QuestionnaireListItem = {
  id: string;
  name: string;
  type: QuestionnaireType;
  isActive: boolean;
  isDefault: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireTree = {
  id: string;
  name: string;
  type: QuestionnaireType;
  isActive: boolean;
  isDefault: boolean;
  questions: QuestionnaireQuestionDetail[];
  schedule: QuestionnaireScheduleDetail | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireResponseDetail = {
  questionId: string;
  label: string;
  type: QuestionnaireQuestionType;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
};

export type QuestionnaireSubmissionListItem = {
  id: string;
  questionnaireId: string;
  questionnaireName: string;
  clientId: string;
  clientName: string;
  status: QuestionnaireSubmissionStatus;
  periodKey: string;
  dueAt: string | null;
  remindedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type QuestionnaireSubmissionDetail = {
  id: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireType: QuestionnaireType;
  clientId: string;
  clientName: string;
  status: QuestionnaireSubmissionStatus;
  periodKey: string;
  dueAt: string | null;
  remindedAt: string | null;
  submittedAt: string | null;
  questions: QuestionnaireQuestionDetail[];
  responses: QuestionnaireResponseDetail[];
  createdAt: string;
};

export type QuestionnaireSubmissionStats = {
  completionRate: number;
  pendingCount: number;
  overdueCount: number;
  submittedThisWeek: number;
};

export type ClientPendingQuestionnaire = {
  id: string;
  questionnaireId: string;
  questionnaireName: string;
  questionnaireType: QuestionnaireType;
  periodKey: string;
  dueAt: string | null;
};
