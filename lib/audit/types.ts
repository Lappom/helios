export type AuditActorType = "coach" | "client" | "system" | "api_key";

export type AuditActor = {
  type: AuditActorType;
  clerkUserId?: string | null;
};

export type LogAuditEventInput = {
  organizationId: string;
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: Request;
};
