import type { CheckoutResult } from "./service";
import type { ReferralValidationResult } from "@/lib/referrals/types";
import type {
  CreateCheckoutBookingInput,
  ValidatePromoCodeInput,
} from "@/lib/validators/checkout";
import type { ValidateReferralCodeInput } from "@/lib/validators/referrals";
import type { PromoValidationResult } from "@/lib/promo-codes/service";

async function parseApiError(response: Response): Promise<never> {
  let detail = "Request failed.";
  try {
    const payload = (await response.json()) as {
      detail?: string;
      title?: string;
    };
    detail = payload.detail ?? payload.title ?? detail;
  } catch {
    // ignore
  }
  throw new Error(detail);
}

export async function validatePromoCodeRequest(
  input: ValidatePromoCodeInput,
): Promise<PromoValidationResult> {
  const response = await fetch("/api/v1/promo-codes/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as PromoValidationResult;
}

export async function validateReferralCodeRequest(
  input: ValidateReferralCodeInput,
): Promise<ReferralValidationResult> {
  const response = await fetch("/api/v1/referrals/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as ReferralValidationResult;
}

export async function completeCheckoutRequest(
  input: CreateCheckoutBookingInput,
): Promise<CheckoutResult> {
  const response = await fetch("/api/v1/checkout/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) await parseApiError(response);
  return (await response.json()) as CheckoutResult;
}
