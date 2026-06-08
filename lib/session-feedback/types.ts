export type FeedbackQuestionDetail = {
  id: string;
  sortOrder: number;
  type: "scale" | "text" | "boolean";
  label: string;
  required: boolean;
  options: string[] | null;
  config: Record<string, unknown> | null;
};

export type FeedbackTemplateTree = {
  id: string;
  name: string;
  isDefault: boolean;
  questions: FeedbackQuestionDetail[];
  createdAt: string;
  updatedAt: string;
};

export type FeedbackTemplateListItem = {
  id: string;
  name: string;
  isDefault: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionFeedbackListItem = {
  id: string;
  sessionLogId: string;
  sessionName: string | null;
  scheduledDate: string;
  feeling: number;
  difficulty: number;
  fatigue: number;
  motivation: number;
  painReported: boolean;
  painDetails: string | null;
  comment: string | null;
  submittedAt: string;
  customResponses: Array<{
    questionId: string;
    label: string;
    textValue: string | null;
    numberValue: number | null;
    booleanValue: boolean | null;
  }>;
};

export type ClientFeedbacksSummary = {
  feelingAverageLast4: number | null;
  items: SessionFeedbackListItem[];
  total: number;
};

export type FeedbackAlertItem = {
  id: string;
  clientId: string;
  clientName: string;
  sessionLogId: string;
  sessionName: string | null;
  scheduledDate: string;
  painDetails: string | null;
  feeling: number;
  submittedAt: string;
};

export type SessionFeedbackDetail = SessionFeedbackListItem;
