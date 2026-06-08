import { z } from "zod";
import { promoDiscountTypeSchema } from "@/lib/validators/checkout";

export const patchReferralProgramSchema = z
  .object({
    refereeDiscountType: promoDiscountTypeSchema.optional(),
    refereeDiscountValue: z.number().int().positive().optional(),
    commissionType: promoDiscountTypeSchema.optional(),
    commissionValue: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.refereeDiscountType === "percent" &&
      value.refereeDiscountValue !== undefined &&
      value.refereeDiscountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percent discount cannot exceed 100.",
        path: ["refereeDiscountValue"],
      });
    }
    if (
      value.commissionType === "percent" &&
      value.commissionValue !== undefined &&
      value.commissionValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percent commission cannot exceed 100.",
        path: ["commissionValue"],
      });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export type PatchReferralProgramInput = z.infer<
  typeof patchReferralProgramSchema
>;

export const validateReferralCodeSchema = z.object({
  serviceId: z.string().trim().min(1),
  code: z.string().trim().min(1).max(50),
  prospectEmail: z.string().trim().email().max(320).optional(),
});

export type ValidateReferralCodeInput = z.infer<
  typeof validateReferralCodeSchema
>;

export const listReferralCodesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  clientId: z.string().trim().min(1).optional(),
});

export type ListReferralCodesQuery = z.infer<
  typeof listReferralCodesQuerySchema
>;

export const listReferralConversionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "converted", "cancelled"]).optional(),
});

export type ListReferralConversionsQuery = z.infer<
  typeof listReferralConversionsQuerySchema
>;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export function parseListReferralCodesQuery(
  searchParams: URLSearchParams,
): ListReferralCodesQuery {
  return listReferralCodesQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
  });
}

export function parseListReferralConversionsQuery(
  searchParams: URLSearchParams,
): ListReferralConversionsQuery {
  return listReferralConversionsQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
}
