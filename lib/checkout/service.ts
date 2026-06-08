import { eq } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import type { PlanTier } from "@/lib/auth/types";
import { createBooking } from "@/lib/bookings/service";
import { createClient, findClientByEmail } from "@/lib/clients/service";
import { inviteClientToPortal } from "@/lib/clients/invite";
import { db } from "@/lib/db";
import { bookings, coachServices } from "@/lib/db/schema";
import { emitHeliosEvent } from "@/lib/events/emit-event";
import { assignProgram } from "@/lib/programs/assignments";
import {
  incrementPromoRedemption,
  validatePromoCode,
} from "@/lib/promo-codes/service";
import type { CreateCheckoutBookingInput } from "@/lib/validators/checkout";
import { normalizePromoCode } from "@/lib/validators/checkout";

const SHOP_ELIGIBLE_PLANS: PlanTier[] = ["PRO", "BUSINESS", "TEAM"];

export type CheckoutResult = {
  bookingId: string;
  clientId: string;
  clientCreated: boolean;
  invitationSent: boolean;
  programAssigned: boolean;
  originalPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
  paymentInstructions: string | null;
  coachName: string;
  coachSlug: string;
  serviceName: string;
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

async function createNonScheduledBooking(
  service: typeof coachServices.$inferSelect & {
    profile: { clerkUserId: string; timezone: string };
  },
  input: CreateCheckoutBookingInput,
  pricing: {
    promoCodeId: string | null;
    discountCents: number;
    finalPriceCents: number;
  },
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
      discountCents: pricing.discountCents,
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

  let promoCodeId: string | null = null;
  let discountCents = 0;
  let finalPriceCents = service.priceCents;

  if (input.promoCode) {
    const validation = await validatePromoCode(
      service.organizationId,
      service.id,
      normalizePromoCode(input.promoCode),
      service.priceCents,
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
    finalPriceCents = validation.finalPriceCents;
  }

  const pricing = { promoCodeId, discountCents, finalPriceCents };

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
        discountCents: pricing.discountCents,
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

  if (promoCodeId) {
    await incrementPromoRedemption(service.organizationId, promoCodeId);
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
    discountCents,
    finalPriceCents,
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
