import type { PromoDiscountType } from "@/lib/validators/checkout";
import { calculateDiscountCents } from "@/lib/promo-codes/service";

export function calculateCommissionCents(
  paymentAmountCents: number,
  commissionType: PromoDiscountType,
  commissionValue: number,
): number {
  return calculateDiscountCents(
    paymentAmountCents,
    commissionType,
    commissionValue,
  );
}

export function calculateReferralCreditToApply(
  balanceCents: number,
  priceAfterDiscountCents: number,
): number {
  if (balanceCents <= 0 || priceAfterDiscountCents <= 0) {
    return 0;
  }
  return Math.min(balanceCents, priceAfterDiscountCents);
}
