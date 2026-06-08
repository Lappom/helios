import { describe, expect, it } from "vitest";
import {
  calculateCommissionCents,
  calculateReferralCreditToApply,
} from "@/lib/referrals/calculations";
import { applyReferralCreditToPrice } from "@/lib/referrals/service";
import { createCheckoutBookingSchema } from "@/lib/validators/checkout";

describe("referral calculations", () => {
  it("calculates percent commission from payment amount", () => {
    expect(calculateCommissionCents(10_000, "percent", 10)).toBe(1_000);
  });

  it("calculates fixed commission capped by payment amount", () => {
    expect(calculateCommissionCents(2_000, "fixed", 5_000)).toBe(2_000);
  });

  it("applies referral credit up to remaining price", () => {
    expect(calculateReferralCreditToApply(3_000, 5_000)).toBe(3_000);
    expect(calculateReferralCreditToApply(8_000, 5_000)).toBe(5_000);
    expect(calculateReferralCreditToApply(0, 5_000)).toBe(0);
  });

  it("reduces final price when referral credit is applied", () => {
    const result = applyReferralCreditToPrice(8_000, 2_500);
    expect(result.creditAppliedCents).toBe(2_500);
    expect(result.finalPriceCents).toBe(5_500);
  });
});

describe("checkout schema", () => {
  it("rejects promo and referral codes together", () => {
    const result = createCheckoutBookingSchema.safeParse({
      serviceId: "svc_1",
      prospectEmail: "a@example.com",
      prospectName: "Alice",
      promoCode: "PROMO",
      referralCode: "REF-ABC",
    });

    expect(result.success).toBe(false);
  });

  it("accepts referral code without promo", () => {
    const result = createCheckoutBookingSchema.safeParse({
      serviceId: "svc_1",
      prospectEmail: "a@example.com",
      prospectName: "Alice",
      referralCode: "REF-ABC",
    });

    expect(result.success).toBe(true);
  });
});
