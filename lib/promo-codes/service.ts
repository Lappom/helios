import { and, asc, eq, sql } from "drizzle-orm";
import { problem } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { promoCodes } from "@/lib/db/schema";
import type {
  CreatePromoCodeInput,
  PatchPromoCodeInput,
  PromoDiscountType,
} from "@/lib/validators/checkout";
import { normalizePromoCode } from "@/lib/validators/checkout";

export type PromoCodeDto = {
  id: string;
  organizationId: string;
  code: string;
  label: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  serviceIds: string[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PromoValidationResult = {
  valid: boolean;
  promoCodeId?: string;
  discountCents: number;
  finalPriceCents: number;
  originalPriceCents: number;
  reason?: string;
};

function mapPromoCode(row: typeof promoCodes.$inferSelect): PromoCodeDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    code: row.code,
    label: row.label,
    discountType: row.discountType,
    discountValue: row.discountValue,
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isActive: row.isActive,
    serviceIds: row.serviceIds ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function calculateDiscountCents(
  priceCents: number,
  discountType: PromoDiscountType,
  discountValue: number,
): number {
  if (discountType === "percent") {
    return Math.min(
      priceCents,
      Math.round((priceCents * discountValue) / 100),
    );
  }
  return Math.min(priceCents, discountValue);
}

function assertPromoApplicable(
  promo: typeof promoCodes.$inferSelect,
  serviceId: string,
): string | null {
  if (!promo.isActive) {
    return "This promo code is inactive.";
  }

  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return "This promo code has expired.";
  }

  if (
    promo.maxRedemptions !== null &&
    promo.redemptionCount >= promo.maxRedemptions
  ) {
    return "This promo code has reached its usage limit.";
  }

  const serviceIds = promo.serviceIds;
  if (serviceIds && serviceIds.length > 0 && !serviceIds.includes(serviceId)) {
    return "This promo code does not apply to this service.";
  }

  return null;
}

export async function listPromoCodes(
  organizationId: string,
): Promise<PromoCodeDto[]> {
  const rows = await getDb().query.promoCodes.findMany({
    where: eq(promoCodes.organizationId, organizationId),
    orderBy: [asc(promoCodes.code)],
  });

  return rows.map(mapPromoCode);
}

export async function createPromoCode(
  organizationId: string,
  input: CreatePromoCodeInput,
): Promise<PromoCodeDto> {
  const code = normalizePromoCode(input.code);

  try {
    const [created] = await getDb()
      .insert(promoCodes)
      .values({
        organizationId,
        code,
        label: input.label ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: input.isActive ?? true,
        serviceIds: input.serviceIds ?? null,
      })
      .returning();

    return mapPromoCode(created!);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw problem({
        type: "validation-error",
        title: "Duplicate promo code",
        status: 409,
        detail: `The code "${code}" already exists.`,
      });
    }
    throw error;
  }
}

export async function patchPromoCode(
  organizationId: string,
  promoCodeId: string,
  input: PatchPromoCodeInput,
): Promise<PromoCodeDto> {
  const existing = await getPromoCodeOrThrow(organizationId, promoCodeId);

  const nextCode =
    input.code !== undefined ? normalizePromoCode(input.code) : existing.code;

  try {
    const [updated] = await getDb()
      .update(promoCodes)
      .set({
        ...(input.code !== undefined ? { code: nextCode } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.discountType !== undefined
          ? { discountType: input.discountType }
          : {}),
        ...(input.discountValue !== undefined
          ? { discountValue: input.discountValue }
          : {}),
        ...(input.maxRedemptions !== undefined
          ? { maxRedemptions: input.maxRedemptions }
          : {}),
        ...(input.expiresAt !== undefined
          ? {
              expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.serviceIds !== undefined
          ? { serviceIds: input.serviceIds }
          : {}),
      })
      .where(
        and(
          eq(promoCodes.id, promoCodeId),
          eq(promoCodes.organizationId, organizationId),
        ),
      )
      .returning();

    return mapPromoCode(updated!);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw problem({
        type: "validation-error",
        title: "Duplicate promo code",
        status: 409,
        detail: `The code "${nextCode}" already exists.`,
      });
    }
    throw error;
  }
}

export async function deletePromoCode(
  organizationId: string,
  promoCodeId: string,
): Promise<void> {
  await getPromoCodeOrThrow(organizationId, promoCodeId);

  await getDb()
    .delete(promoCodes)
    .where(
      and(
        eq(promoCodes.id, promoCodeId),
        eq(promoCodes.organizationId, organizationId),
      ),
    );
}

async function getPromoCodeOrThrow(
  organizationId: string,
  promoCodeId: string,
) {
  const promo = await getDb().query.promoCodes.findFirst({
    where: and(
      eq(promoCodes.id, promoCodeId),
      eq(promoCodes.organizationId, organizationId),
    ),
  });

  if (!promo) {
    throw problem({
      type: "not-found",
      title: "Promo code not found",
      status: 404,
      detail: `Promo code ${promoCodeId} was not found.`,
    });
  }

  return promo;
}

export async function validatePromoCode(
  organizationId: string,
  serviceId: string,
  code: string,
  priceCents: number,
): Promise<PromoValidationResult> {
  const normalized = normalizePromoCode(code);

  const promo = await getDb().query.promoCodes.findFirst({
    where: and(
      eq(promoCodes.organizationId, organizationId),
      eq(promoCodes.code, normalized),
    ),
  });

  if (!promo) {
    return {
      valid: false,
      discountCents: 0,
      finalPriceCents: priceCents,
      originalPriceCents: priceCents,
      reason: "Invalid promo code.",
    };
  }

  const reason = assertPromoApplicable(promo, serviceId);
  if (reason) {
    return {
      valid: false,
      discountCents: 0,
      finalPriceCents: priceCents,
      originalPriceCents: priceCents,
      reason,
    };
  }

  const discountCents = calculateDiscountCents(
    priceCents,
    promo.discountType,
    promo.discountValue,
  );

  return {
    valid: true,
    promoCodeId: promo.id,
    discountCents,
    finalPriceCents: Math.max(0, priceCents - discountCents),
    originalPriceCents: priceCents,
  };
}

export async function incrementPromoRedemption(
  organizationId: string,
  promoCodeId: string,
): Promise<void> {
  await getDb()
    .update(promoCodes)
    .set({
      redemptionCount: sql`${promoCodes.redemptionCount} + 1`,
    })
    .where(
      and(
        eq(promoCodes.id, promoCodeId),
        eq(promoCodes.organizationId, organizationId),
      ),
    );
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && (error as { code: string }).code === "23505") {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : "cause" in error && error.cause instanceof Error
        ? error.cause.message
        : "";

  return message.includes("unique") || message.includes("23505");
}
