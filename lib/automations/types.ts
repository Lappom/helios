import type {
  AutomationActionType,
  AutomationExecutionStatus,
  AutomationTriggerType,
} from "@/lib/validators/automations";

export type AutomationActionDetail = {
  id: string;
  sortOrder: number;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
};

export type AutomationListItem = {
  id: string;
  name: string;
  description: string | null;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  isActive: boolean;
  isSystem: boolean;
  actionCount: number;
  lastExecutionAt: string | null;
  lastExecutionStatus: AutomationExecutionStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationTree = AutomationListItem & {
  actions: AutomationActionDetail[];
};

export type AutomationExecutionItem = {
  id: string;
  automationId: string;
  clientId: string | null;
  clientName: string | null;
  triggerEventId: string;
  triggerType: AutomationTriggerType;
  status: AutomationExecutionStatus;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  actionLogs: {
    id: string;
    actionId: string;
    actionType: AutomationActionType;
    status: string;
    error: string | null;
    durationMs: number | null;
  }[];
};

export type RunAutomationInput = {
  executionId: string;
  organizationId: string;
  automationId: string;
  clientId: string | null;
  coachClerkUserId: string;
  planTier: import("@/lib/auth/types").PlanTier;
  actions: AutomationActionDetail[];
};

export type ActionPreview = {
  actionType: AutomationActionType;
  valid: boolean;
  message: string;
  resolved?: Record<string, unknown>;
};

export type AutomationTestResult = {
  automationId: string;
  clientId: string | null;
  previews: ActionPreview[];
};
