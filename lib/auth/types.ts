import type { planTierEnum } from "@/lib/db/schema/enums";

export type OrgRole =
  | "org_owner"
  | "org_admin"
  | "coach"
  | "assistant"
  | "client";

export type PlanTier = (typeof planTierEnum.enumValues)[number];

export type OrgContext = {
  clerkUserId: string;
  clerkOrgId: string;
  organizationId: string;
  role: OrgRole;
  planTier: PlanTier;
  clientId?: string;
};
