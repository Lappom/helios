import type { PromoDiscountType } from "@/lib/validators/checkout";

export type ReferralProgramDto = {
  id: string;
  organizationId: string;
  coachClerkUserId: string;
  refereeDiscountType: PromoDiscountType;
  refereeDiscountValue: number;
  commissionType: PromoDiscountType;
  commissionValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReferralCodeListItem = {
  id: string;
  clientId: string;
  clientName: string;
  code: string;
  isActive: boolean;
  conversionCount: number;
  createdAt: string;
};

export type ReferralConversionListItem = {
  id: string;
  referrerClientId: string;
  referrerName: string;
  referredClientId: string;
  referredName: string;
  bookingId: string;
  status: "pending" | "converted" | "cancelled";
  refereeDiscountCents: number;
  commissionCents: number;
  convertedAt: string | null;
  createdAt: string;
};

export type ReferralDashboard = {
  totalConversions: number;
  pendingConversions: number;
  totalCommissionsCents: number;
  conversionRate: number;
  monthlyConversions: Array<{ month: string; count: number }>;
  topReferrers: Array<{
    clientId: string;
    clientName: string;
    conversionCount: number;
    commissionsCents: number;
  }>;
};

export type ClientReferralInfo = {
  code: string;
  balanceCents: number;
  coachSlug: string | null;
  shareUrl: string | null;
};

export type ReferralValidationResult = {
  valid: boolean;
  referralCodeId?: string;
  discountCents: number;
  finalPriceCents: number;
  originalPriceCents: number;
  reason?: string;
};
