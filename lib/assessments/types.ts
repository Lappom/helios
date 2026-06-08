import type {
  assessmentFieldTypeEnum,
  assessmentFrequencyEnum,
  assessmentSourceEnum,
  assessmentStatusEnum,
} from "@/lib/db/schema/enums";

export type AssessmentFieldType =
  (typeof assessmentFieldTypeEnum.enumValues)[number];
export type AssessmentFrequency =
  (typeof assessmentFrequencyEnum.enumValues)[number];
export type AssessmentStatus =
  (typeof assessmentStatusEnum.enumValues)[number];
export type AssessmentSource =
  (typeof assessmentSourceEnum.enumValues)[number];

export type FieldConfig = {
  measurementKeys?: string[];
  photoPose?: string;
  criticalWhen?: { op: "gte" | "lte" | "eq"; value: number | string };
};

export type AssessmentFieldDetail = {
  id: string;
  sortOrder: number;
  type: AssessmentFieldType;
  label: string;
  required: boolean;
  options: string[] | null;
  config: FieldConfig | null;
};

export type AssessmentTemplateListItem = {
  id: string;
  name: string;
  frequency: AssessmentFrequency;
  autoAssignOnProgramStart: boolean;
  daysAfterProgramStart: number;
  isDefault: boolean;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentTemplateTree = {
  id: string;
  name: string;
  frequency: AssessmentFrequency;
  autoAssignOnProgramStart: boolean;
  daysAfterProgramStart: number;
  isDefault: boolean;
  fields: AssessmentFieldDetail[];
  createdAt: string;
  updatedAt: string;
};

export type AssessmentResponseDetail = {
  id: string;
  fieldId: string;
  textValue: string | null;
  numberValue: number | null;
  jsonValue: Record<string, number> | null;
  photoBlobPath: string | null;
  field: AssessmentFieldDetail;
};

export type AssessmentListItem = {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientName: string;
  status: AssessmentStatus;
  source: AssessmentSource;
  dueAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  hasCriticalAlert: boolean;
  criticalSummary: string | null;
  createdAt: string;
};

export type AssessmentDetail = {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientName: string;
  status: AssessmentStatus;
  source: AssessmentSource;
  dueAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  hasCriticalAlert: boolean;
  criticalSummary: string | null;
  coachNotes: string | null;
  fields: AssessmentFieldDetail[];
  responses: AssessmentResponseDetail[];
  createdAt: string;
  updatedAt: string;
};

export type MeasurementDelta = {
  key: string;
  label: string;
  previous: number | null;
  current: number | null;
  delta: number | null;
};

export type PhotoPair = {
  fieldId: string;
  label: string;
  previousPath: string | null;
  currentPath: string | null;
};

export type WeightDataPoint = {
  date: string;
  weight: number;
};

export type AssessmentCompareResult = {
  clientId: string;
  clientName: string;
  current: AssessmentDetail | null;
  previous: AssessmentDetail | null;
  measurementDeltas: MeasurementDelta[];
  photoPairs: PhotoPair[];
  weightHistory: WeightDataPoint[];
};

export type ClientPendingAssessment = {
  id: string;
  templateName: string;
  dueAt: string | null;
  status: AssessmentStatus;
};
