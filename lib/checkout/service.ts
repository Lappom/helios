import { eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { createBooking } from "@/lib/bookings/service";
import { createClient, findClientByEmail } from "@/lib/clients/service";
import { inviteClientToPortal } from "@/lib/clients/invite";
import { db } from "@/lib/db";
import { bookings, coachServices, referralCodes } from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import { assignProgram } from "@/lib/programs/assignments";
import {
  incrementPromoRedemption,
  validatePromoCode,
} from "@/lib/promo-codes/service";
import {
  applyReferralCreditToPrice,
  estimateCommissionCents,
  getReferralCreditBalance,
  recordPendingConversion,
  validateReferralCode,
} from "@/lib/referrals/service";
import type { CreateCheckoutBookingInput } from "@/lib/validators/checkout";
import {
  normalizePromoCode,
  normalizeReferralCode,
} from "@/lib/validators/checkout";

const SHOP_ELIGIBLE_PLANS: PlanTier[] = ["PRO", "BUSINESS", "TEAM"];

export type CheckoutResult = {
  bookingId: string;
  clientId: string;
  clientCreated: boolean;
  invitationSent: boolean;
  programAssigned: boolean;
  originalPriceCents: number;
  discountCents: number;
  referralCreditAppliedCents: number;
  finalPriceCents: number;
  paymentInstructions: string | null;
  coachName: string;
  coachSlug: string;
  serviceName: string;
};

type CheckoutPricing = {
  promoCodeId: string | null;
  referralCodeId: string | null;
  discountCents: number;
  referralCreditAppliedCents: number;
  finalPriceCents: number;
};

function parseProspectName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Client", lastName: "-" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: "-" };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

function assertShopEligible(planTier: PlanTier): void {
  if (!SHOP_ELIGIBLE_PLANS.includes(planTier)) {
    throw problem({
      type: "forbidden",
      title: "Shop not available",
      status: 403,
      detail: "This coach's plan does not include the online shop.",
    });
  }
}

async function loadCheckoutService(serviceId: string) {
  const service = await db.query.coachServices.findFirst({
    where: eq(coachServices.id, serviceId),
    with: {
      profile: true,
      organization: true,
    },
  });

  if (!service?.profile || !service.organization) {
    throw problem({
      type: "not-found",
      title: "Service not found",
      status: 404,
      detail: `Service ${serviceId} was not found.`,
    });
  }

  if (!service.profile.isPublished) {
    throw problem({
      type: "not-found",
      title: "Service not available",
      status: 404,
      detail: "This service is not available for checkout.",
    });
  }

  assertShopEligible(service.organization.planTier);

  return service;
}

async function resolveCheckoutPricing(
  organizationId: string,
  serviceId: string,
  priceCents: number,
  input: CreateCheckoutBookingInput,
): Promise<CheckoutPricing> {
  let promoCodeId: string | null = null;
  let referralCodeId: string | null = null;
  let discountCents = 0;
  let priceAfterDiscount = priceCents;

  if (input.promoCode) {
    const validation = await validatePromoCode(
      organizationId,
      serviceId,
      normalizePromoCode(input.promoCode),
      priceCents,
    );

    if (!validation.valid) {
      throw problem({
        type: "validation-error",
        title: "Invalid promo code",
        status: 400,
        detail: validation.reason ?? "This promo code cannot be applied.",
      });
    }

    promoCodeId = validation.promoCodeId ?? null;
    discountCents = validation.discountCents;
    priceAfterDiscount = validation.finalPriceCents;
  } else if (input.referralCode) {
    const validation = await validateReferralCode(
      organizationId,
      serviceId,
      normalizeReferralCode(input.referralCode),
      priceCents,
      input.prospectEmail,
    );

    if (!validation.valid) {
      throw problem({
        type: "validation-error",
        title: "Invalid referral code",
        status: 400,
        detail: validation.reason ?? "This referral code cannot be applied.",
      });
    }

    referralCodeId = validation.referralCodeId ?? null;
    discountCents = validation.discountCents;
    priceAfterDiscount = validation.finalPriceCents;
  }

  let referralCreditAppliedCents = 0;
  let finalPriceCents = priceAfterDiscount;

  const existingClient = await findClientByEmail(
    organizationId,
    input.prospectEmail,
  );

  if (existingClient) {
    const balanceCents = await getReferralCreditBalance(
      organizationId,
      existingClient.id,
    );
    const creditResult = applyReferralCreditToPrice(
      priceAfterDiscount,
      balanceCents,
    );
    referralCreditAppliedCents = creditResult.creditAppliedCents;
    finalPriceCents = creditResult.finalPriceCents;
  }

  return {
    promoCodeId,
    referralCodeId,
    discountCents,
    referralCreditAppliedCents,
    finalPriceCents,
  };
}

async function createNonScheduledBooking(
  service: typeof coachServices.$inferSelect & {
    profile: { clerkUserId: string; timezone: string };
  },
  input: CreateCheckoutBookingInput,
  pricing: CheckoutPricing,
) {
  const timezone = service.profile.timezone ?? "Europe/Paris";
  const startAt = new Date(Date.now() + Math.floor(Math.random() * 60_000));
  const endAt = new Date(
    startAt.getTime() + service.durationMinutes * 60 * 1000,
  );

  const [created] = await db
    .insert(bookings)
    .values({
      organizationId: service.organizationId,
      coachClerkUserId: service.profile.clerkUserId,
      serviceId: service.id,
      prospectEmail: input.prospectEmail,
      prospectName: input.prospectName,
      startAt,
      endAt,
      timezone,
      status: "confirmed",
      paymentStatus: "unpaid",
      notes: input.notes ?? null,
      promoCodeId: pricing.promoCodeId,
      referralCodeId: pricing.referralCodeId,
      discountCents: pricing.discountCents,
      referralCreditAppliedCents: pricing.referralCreditAppliedCents,
      finalPriceCents: pricing.finalPriceCents,
    })
    .returning();

  return created!;
}

export async function completeCheckoutBooking(
  input: CreateCheckoutBookingInput,
): Promise<CheckoutResult> {
  const service = await loadCheckoutService(input.serviceId);
  const organization = service.organization!;
  const profile = service.profile!;

  if (service.bookingEnabled && !input.startAt) {
    throw problem({
      type: "validation-error",
      title: "Slot required",
      status: 400,
      detail: "A time slot is required for this service.",
    });
  }

  const pricing = await resolveCheckoutPricing(
    service.organizationId,
    service.id,
    service.priceCents,
    input,
  );

  let bookingId: string;

  if (service.bookingEnabled && input.startAt) {
    const booking = await createBooking(
      {
        serviceId: input.serviceId,
        startAt: input.startAt,
        prospectEmail: input.prospectEmail,
        prospectName: input.prospectName,
        notes: input.notes,
      },
      { organizationId: service.organizationId },
    );
    bookingId = booking.id;

    await db
      .update(bookings)
      .set({
        promoCodeId: pricing.promoCodeId,
        referralCodeId: pricing.referralCodeId,
        discountCents: pricing.discountCents,
        referralCreditAppliedCents: pricing.referralCreditAppliedCents,
        finalPriceCents: pricing.finalPriceCents,
      })
      .where(eq(bookings.id, bookingId));
  } else {
    const created = await createNonScheduledBooking(service, input, pricing);
    bookingId = created.id;
  }

  const { firstName, lastName } = parseProspectName(input.prospectName);
  const existingClient = await findClientByEmail(
    service.organizationId,
    input.prospectEmail,
  );

  let clientId: string;
  let clientCreated = false;

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const createdClient = await createClient(
      service.organizationId,
      organization.planTier,
      {
        email: input.prospectEmail,
        firstName,
        lastName,
        status: "TRIAL",
      },
    );
    clientId = createdClient.id;
    clientCreated = true;
  }

  await db
    .update(bookings)
    .set({ clientId })
    .where(eq(bookings.id, bookingId));

  if (pricing.promoCodeId) {
    await incrementPromoRedemption(
      service.organizationId,
      pricing.promoCodeId,
    );
  }

  if (pricing.referralCodeId) {
    const referralCode = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.id, pricing.referralCodeId),
    });

    if (referralCode) {
      const commissionCents = await estimateCommissionCents(
        service.organizationId,
        pricing.referralCodeId,
        pricing.finalPriceCents,
      );

      await recordPendingConversion({
        organizationId: service.organizationId,
        referralCodeId: pricing.referralCodeId,
        referrerClientId: referralCode.clientId,
        referredClientId: clientId,
        bookingId,
        refereeDiscountCents: pricing.discountCents,
        commissionCents,
      });
    }
  }

  let programAssigned = false;
  if (service.defaultProgramId) {
    const result = await assignProgram(
      service.organizationId,
      service.defaultProgramId,
      profile.clerkUserId,
      {
        clientIds: [clientId],
        startDate: new Date(),
      },
    );
    programAssigned = result.created.length > 0;
  }

  let invitationSent = false;
  if (clientCreated || !existingClient?.clerkUserId) {
    try {
      await inviteClientToPortal(
        service.organizationId,
        organization.clerkOrgId,
        clientId,
      );
      invitationSent = true;
    } catch {
      invitationSent = false;
    }
  }

  if (clientCreated) {
    emitHeliosEvent("client.created", {
      organizationId: service.organizationId,
      clientId,
      source: "checkout",
      bookingId,
    });
  }

  return {
    bookingId,
    clientId,
    clientCreated,
    invitationSent,
    programAssigned,
    originalPriceCents: service.priceCents,
    discountCents: pricing.discountCents,
    referralCreditAppliedCents: pricing.referralCreditAppliedCents,
    finalPriceCents: pricing.finalPriceCents,
    paymentInstructions: service.paymentInstructions,
    coachName: profile.displayName,
    coachSlug: profile.slug,
    serviceName: service.name,
  };
}

export async function validateCheckoutPromoCode(
  serviceId: string,
  code: string,
) {
  const service = await loadCheckoutService(serviceId);
  return validatePromoCode(
    service.organizationId,
    service.id,
    code,
    service.priceCents,
  );
}

export async function validateCheckoutReferralCode(
  serviceId: string,
  code: string,
  prospectEmail?: string,
) {
  const service = await loadCheckoutService(serviceId);
  return validateReferralCode(
    service.organizationId,
    service.id,
    code,
    service.priceCents,
    prospectEmail,
  );
}
