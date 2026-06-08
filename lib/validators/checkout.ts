import { z } from "zod";

export const PROMO_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type PromoDiscountType = (typeof PROMO_DISCOUNT_TYPES)[number];
export const promoDiscountTypeSchema = z.enum(PROMO_DISCOUNT_TYPES);

export const createCheckoutBookingSchema = z
  .object({
    serviceId: z.string().trim().min(1),
    startAt: z.string().datetime({ offset: true }).optional(),
    prospectEmail: z.string().trim().email().max(320),
    prospectName: z.string().trim().min(1).max(200),
    promoCode: z.string().trim().min(1).max(50).optional(),
    referralCode: z.string().trim().min(1).max(50).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.promoCode && value.referralCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Promo code and referral code cannot be combined.",
        path: ["referralCode"],
      });
    }
  });

export type CreateCheckoutBookingInput = z.infer<
  typeof createCheckoutBookingSchema
>;

export const validatePromoCodeSchema = z.object({
  serviceId: z.string().trim().min(1),
  code: z.string().trim().min(1).max(50),
});

export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;

export const createPromoCodeSchema = z
  .object({
    code: z.string().trim().min(2).max(50),
    label: z.string().trim().max(200).optional(),
    discountType: promoDiscountTypeSchema,
    discountValue: z.number().int().positive(),
    maxRedemptions: z.number().int().positive().optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    isActive: z.boolean().default(true),
    serviceIds: z.array(z.string().trim().min(1)).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "percent" && value.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percent discount cannot exceed 100.",
        path: ["discountValue"],
      });
    }
    if (value.discountType === "fixed" && value.discountValue > 1_000_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fixed discount is too large.",
        path: ["discountValue"],
      });
    }
  });

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;

export const patchPromoCodeSchema = z
  .object({
    code: z.string().trim().min(2).max(50).optional(),
    label: z.string().trim().max(200).nullable().optional(),
    discountType: promoDiscountTypeSchema.optional(),
    discountValue: z.number().int().positive().optional(),
    maxRedemptions: z.number().int().positive().nullable().optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    isActive: z.boolean().optional(),
    serviceIds: z.array(z.string().trim().min(1)).max(50).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export type PatchPromoCodeInput = z.infer<typeof patchPromoCodeSchema>;

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}
