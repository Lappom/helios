import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { problem } from "@/lib/api/response";
import { db } from "@/lib/db";
import {
  bookings,
  clients,
  coachProfiles,
  referralCodes,
  referralConversions,
  referralCreditBalances,
  referralCreditLedger,
  referralPrograms,
} from "@/lib/db/schema";
import type { PaymentReceivedPayload } from "@/lib/events/types";
import { calculateDiscountCents } from "@/lib/promo-codes/service";
import {
  calculateCommissionCents,
  calculateReferralCreditToApply,
} from "@/lib/referrals/calculations";
import type {
  ClientReferralInfo,
  ReferralCodeListItem,
  ReferralConversionListItem,
  ReferralDashboard,
  ReferralProgramDto,
  ReferralValidationResult,
} from "@/lib/referrals/types";
import type { PromoDiscountType } from "@/lib/validators/checkout";
import type {
  ListReferralCodesQuery,
  ListReferralConversionsQuery,
  PatchReferralProgramInput,
} from "@/lib/validators/referrals";
import { normalizeReferralCode } from "@/lib/validators/referrals";

const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ELIGIBLE_CLIENT_STATUSES = ["TRIAL", "ACTIVE"] as const;

function mapProgram(row: typeof referralPrograms.$inferSelect): ReferralProgramDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    coachClerkUserId: row.coachClerkUserId,
    refereeDiscountType: row.refereeDiscountType,
    refereeDiscountValue: row.refereeDiscountValue,
    commissionType: row.commissionType,
    commissionValue: row.commissionValue,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatClientName(
  firstName: string,
  lastName: string,
): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function generateReferralCodeValue(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix +=
      REFERRAL_CODE_CHARS[
        Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)
      ]!;
  }
  return `REF-${suffix}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export async function getOrCreateProgram(
  organizationId: string,
  coachClerkUserId: string,
): Promise<ReferralProgramDto> {
  const existing = await db.query.referralPrograms.findFirst({
    where: and(
      eq(referralPrograms.organizationId, organizationId),
      eq(referralPrograms.coachClerkUserId, coachClerkUserId),
    ),
  });

  if (existing) {
    return mapProgram(existing);
  }

  const [created] = await db
    .insert(referralPrograms)
    .values({
      organizationId,
      coachClerkUserId,
    })
    .returning();

  return mapProgram(created!);
}

export async function updateProgram(
  organizationId: string,
  coachClerkUserId: string,
  input: PatchReferralProgramInput,
): Promise<ReferralProgramDto> {
  const program = await getOrCreateProgram(organizationId, coachClerkUserId);

  const [updated] = await db
    .update(referralPrograms)
    .set({
      ...(input.refereeDiscountType !== undefined
        ? { refereeDiscountType: input.refereeDiscountType }
        : {}),
      ...(input.refereeDiscountValue !== undefined
        ? { refereeDiscountValue: input.refereeDiscountValue }
        : {}),
      ...(input.commissionType !== undefined
        ? { commissionType: input.commissionType }
        : {}),
      ...(input.commissionValue !== undefined
        ? { commissionValue: input.commissionValue }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(
      and(
        eq(referralPrograms.id, program.id),
        eq(referralPrograms.organizationId, organizationId),
      ),
    )
    .returning();

  if (input.isActive === true) {
    await ensureCodesForEligibleClients(organizationId, updated!.id);
  }

  return mapProgram(updated!);
}

async function ensureCodesForEligibleClients(
  organizationId: string,
  programId: string,
): Promise<void> {
  const eligibleClients = await db.query.clients.findMany({
    where: and(
      eq(clients.organizationId, organizationId),
      inArray(clients.status, [...ELIGIBLE_CLIENT_STATUSES]),
    ),
    columns: { id: true },
  });

  await Promise.all(
    eligibleClients.map((client) =>
      generateCodeForClient(organizationId, programId, client.id),
    ),
  );
}

export async function generateCodeForClient(
  organizationId: string,
  programId: string,
  clientId: string,
): Promise<typeof referralCodes.$inferSelect | null> {
  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.clientId, clientId),
  });

  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCodeValue();
    try {
      const [created] = await db
        .insert(referralCodes)
        .values({
          organizationId,
          programId,
          clientId,
          code,
        })
        .returning();
      return created!;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw problem({
    type: "internal-error",
    title: "Referral code generation failed",
    status: 500,
    detail: "Unable to generate a unique referral code.",
  });
}

export async function regenerateCodeForClient(
  organizationId: string,
  coachClerkUserId: string,
  clientId: string,
): Promise<ReferralCodeListItem> {
  const program = await getOrCreateProgram(organizationId, coachClerkUserId);

  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, clientId),
      eq(clients.organizationId, organizationId),
    ),
  });

  if (!client) {
    throw problem({
      type: "not-found",
      title: "Client not found",
      status: 404,
      detail: `Client ${clientId} was not found.`,
    });
  }

  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.clientId, clientId),
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCodeValue();
    try {
      if (existing) {
        const [updated] = await db
          .update(referralCodes)
          .set({ code, isActive: true })
          .where(eq(referralCodes.id, existing.id))
          .returning();
        return {
          id: updated!.id,
          clientId,
          clientName: formatClientName(client.firstName, client.lastName),
          code: updated!.code,
          isActive: updated!.isActive,
          conversionCount: updated!.conversionCount,
          createdAt: updated!.createdAt.toISOString(),
        };
      }

      const created = await generateCodeForClient(
        organizationId,
        program.id,
        clientId,
      );
      return {
        id: created!.id,
        clientId,
        clientName: formatClientName(client.firstName, client.lastName),
        code: created!.code,
        isActive: created!.isActive,
        conversionCount: created!.conversionCount,
        createdAt: created!.createdAt.toISOString(),
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw problem({
    type: "internal-error",
    title: "Referral code regeneration failed",
    status: 500,
    detail: "Unable to regenerate referral code.",
  });
}

export async function listReferralCodes(
  organizationId: string,
  query: ListReferralCodesQuery,
): Promise<{ items: ReferralCodeListItem[]; total: number }> {
  const offset = (query.page - 1) * query.limit;
  const conditions = [eq(referralCodes.organizationId, organizationId)];

  if (query.clientId) {
    conditions.push(eq(referralCodes.clientId, query.clientId));
  }

  const whereClause = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        code: referralCodes,
        firstName: clients.firstName,
        lastName: clients.lastName,
      })
      .from(referralCodes)
      .innerJoin(clients, eq(referralCodes.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(referralCodes.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(referralCodes)
      .where(whereClause),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.code.id,
      clientId: row.code.clientId,
      clientName: formatClientName(row.firstName, row.lastName),
      code: row.code.code,
      isActive: row.code.isActive,
      conversionCount: row.code.conversionCount,
      createdAt: row.code.createdAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function listReferralConversions(
  organizationId: string,
  query: ListReferralConversionsQuery,
): Promise<{ items: ReferralConversionListItem[]; total: number }> {
  const offset = (query.page - 1) * query.limit;
  const conditions = [eq(referralConversions.organizationId, organizationId)];

  if (query.status) {
    conditions.push(eq(referralConversions.status, query.status));
  }

  const whereClause = and(...conditions);
  const referrerClient = alias(clients, "referrer_client");
  const referredClient = alias(clients, "referred_client");

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        conversion: referralConversions,
        referrerFirstName: referrerClient.firstName,
        referrerLastName: referrerClient.lastName,
        referredFirstName: referredClient.firstName,
        referredLastName: referredClient.lastName,
      })
      .from(referralConversions)
      .innerJoin(
        referrerClient,
        eq(referralConversions.referrerClientId, referrerClient.id),
      )
      .innerJoin(
        referredClient,
        eq(referralConversions.referredClientId, referredClient.id),
      )
      .where(whereClause)
      .orderBy(desc(referralConversions.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(referralConversions)
      .where(whereClause),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.conversion.id,
      referrerClientId: row.conversion.referrerClientId,
      referrerName: formatClientName(
        row.referrerFirstName,
        row.referrerLastName,
      ),
      referredClientId: row.conversion.referredClientId,
      referredName: formatClientName(
        row.referredFirstName,
        row.referredLastName,
      ),
      bookingId: row.conversion.bookingId,
      status: row.conversion.status,
      refereeDiscountCents: row.conversion.refereeDiscountCents,
      commissionCents: row.conversion.commissionCents,
      convertedAt: row.conversion.convertedAt?.toISOString() ?? null,
      createdAt: row.conversion.createdAt.toISOString(),
    })),
    total: totalRow[0]?.total ?? 0,
  };
}

export async function validateReferralCode(
  organizationId: string,
  serviceId: string,
  code: string,
  priceCents: number,
  prospectEmail?: string,
): Promise<ReferralValidationResult> {
  const normalized = normalizeReferralCode(code);
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.organizationId, organizationId),
      eq(referralCodes.code, normalized),
    ),
    with: {
      program: true,
      client: true,
    },
  });

  if (!referralCode?.program?.isActive || !referralCode.isActive) {
    return {
      valid: false,
      discountCents: 0,
      finalPriceCents: priceCents,
      originalPriceCents: priceCents,
      reason: "This referral code is not active.",
    };
  }

  if (
    prospectEmail &&
    referralCode.client.email.toLowerCase() === prospectEmail.toLowerCase()
  ) {
    return {
      valid: false,
      discountCents: 0,
      finalPriceCents: priceCents,
      originalPriceCents: priceCents,
      reason: "You cannot use your own referral code.",
    };
  }

  const discountCents = calculateDiscountCents(
    priceCents,
    referralCode.program.refereeDiscountType as PromoDiscountType,
    referralCode.program.refereeDiscountValue,
  );

  return {
    valid: true,
    referralCodeId: referralCode.id,
    discountCents,
    finalPriceCents: Math.max(0, priceCents - discountCents),
    originalPriceCents: priceCents,
  };
}

export async function getReferralCreditBalance(
  organizationId: string,
  clientId: string,
): Promise<number> {
  const balance = await db.query.referralCreditBalances.findFirst({
    where: and(
      eq(referralCreditBalances.organizationId, organizationId),
      eq(referralCreditBalances.clientId, clientId),
    ),
  });

  return balance?.balanceCents ?? 0;
}

export function applyReferralCreditToPrice(
  priceAfterDiscountCents: number,
  balanceCents: number,
): { creditAppliedCents: number; finalPriceCents: number } {
  const creditAppliedCents = calculateReferralCreditToApply(
    balanceCents,
    priceAfterDiscountCents,
  );

  return {
    creditAppliedCents,
    finalPriceCents: Math.max(0, priceAfterDiscountCents - creditAppliedCents),
  };
}

export async function recordPendingConversion(input: {
  organizationId: string;
  referralCodeId: string;
  referrerClientId: string;
  referredClientId: string;
  bookingId: string;
  refereeDiscountCents: number;
  commissionCents: number;
}): Promise<void> {
  await db.insert(referralConversions).values({
    organizationId: input.organizationId,
    referralCodeId: input.referralCodeId,
    referrerClientId: input.referrerClientId,
    referredClientId: input.referredClientId,
    bookingId: input.bookingId,
    status: "pending",
    refereeDiscountCents: input.refereeDiscountCents,
    commissionCents: input.commissionCents,
  });
}

async function creditClientBalance(
  organizationId: string,
  clientId: string,
  amountCents: number,
  entryType: "commission_earned" | "credit_applied" | "adjustment",
  refs: {
    conversionId?: string;
    bookingId?: string;
    paymentId?: string;
    note?: string;
  },
): Promise<void> {
  if (amountCents === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(referralCreditLedger).values({
      organizationId,
      clientId,
      amountCents,
      entryType,
      conversionId: refs.conversionId ?? null,
      bookingId: refs.bookingId ?? null,
      paymentId: refs.paymentId ?? null,
      note: refs.note ?? null,
    });

    const existing = await tx.query.referralCreditBalances.findFirst({
      where: and(
        eq(referralCreditBalances.organizationId, organizationId),
        eq(referralCreditBalances.clientId, clientId),
      ),
    });

    const nextBalance = (existing?.balanceCents ?? 0) + amountCents;

    if (existing) {
      await tx
        .update(referralCreditBalances)
        .set({ balanceCents: nextBalance })
        .where(
          and(
            eq(referralCreditBalances.organizationId, organizationId),
            eq(referralCreditBalances.clientId, clientId),
          ),
        );
    } else {
      await tx.insert(referralCreditBalances).values({
        organizationId,
        clientId,
        balanceCents: nextBalance,
      });
    }
  });
}

export async function handleReferralPaymentReceived(
  payload: PaymentReceivedPayload,
  bookingId?: string | null,
): Promise<void> {
  if (!bookingId) {
    return;
  }

  const conversion = await db.query.referralConversions.findFirst({
    where: and(
      eq(referralConversions.organizationId, payload.organizationId),
      eq(referralConversions.bookingId, bookingId),
      eq(referralConversions.status, "pending"),
    ),
    with: { referralCode: { with: { program: true } } },
  });

  if (conversion?.referralCode?.program) {
    const commissionCents = calculateCommissionCents(
      payload.amountCents,
      conversion.referralCode.program.commissionType as PromoDiscountType,
      conversion.referralCode.program.commissionValue,
    );

    await db
      .update(referralConversions)
      .set({
        status: "converted",
        commissionCents,
        paymentId: payload.paymentId,
        convertedAt: new Date(),
      })
      .where(eq(referralConversions.id, conversion.id));

    await db
      .update(referralCodes)
      .set({
        conversionCount: sql`${referralCodes.conversionCount} + 1`,
      })
      .where(eq(referralCodes.id, conversion.referralCodeId));

    if (commissionCents > 0) {
      await creditClientBalance(
        payload.organizationId,
        conversion.referrerClientId,
        commissionCents,
        "commission_earned",
        {
          conversionId: conversion.id,
          bookingId,
          paymentId: payload.paymentId,
        },
      );
    }
  }

  const bookingRow = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.id, bookingId),
      eq(bookings.organizationId, payload.organizationId),
    ),
  });

  if (
    bookingRow &&
    bookingRow.referralCreditAppliedCents > 0 &&
    bookingRow.clientId
  ) {
    await creditClientBalance(
      payload.organizationId,
      bookingRow.clientId,
      -bookingRow.referralCreditAppliedCents,
      "credit_applied",
      {
        bookingId,
        paymentId: payload.paymentId,
        note: "Referral credit applied at checkout",
      },
    );
  }
}

export async function getReferralDashboard(
  organizationId: string,
): Promise<ReferralDashboard> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
  twelveMonthsAgo.setUTCDate(1);
  twelveMonthsAgo.setUTCHours(0, 0, 0, 0);

  const [statusCounts, monthlyRows, topReferrers] = await Promise.all([
    db
      .select({
        status: referralConversions.status,
        total: count(),
        commissions: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)`,
      })
      .from(referralConversions)
      .where(eq(referralConversions.organizationId, organizationId))
      .groupBy(referralConversions.status),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${referralConversions.convertedAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(referralConversions)
      .where(
        and(
          eq(referralConversions.organizationId, organizationId),
          eq(referralConversions.status, "converted"),
          gte(referralConversions.convertedAt, twelveMonthsAgo),
        ),
      )
      .groupBy(sql`date_trunc('month', ${referralConversions.convertedAt})`)
      .orderBy(sql`date_trunc('month', ${referralConversions.convertedAt})`),
    db
      .select({
        clientId: referralConversions.referrerClientId,
        firstName: clients.firstName,
        lastName: clients.lastName,
        conversionCount: count(),
        commissionsCents: sql<number>`coalesce(sum(${referralConversions.commissionCents}), 0)`,
      })
      .from(referralConversions)
      .innerJoin(
        clients,
        eq(referralConversions.referrerClientId, clients.id),
      )
      .where(
        and(
          eq(referralConversions.organizationId, organizationId),
          eq(referralConversions.status, "converted"),
        ),
      )
      .groupBy(
        referralConversions.referrerClientId,
        clients.firstName,
        clients.lastName,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  const converted =
    statusCounts.find((row) => row.status === "converted")?.total ?? 0;
  const pending =
    statusCounts.find((row) => row.status === "pending")?.total ?? 0;
  const totalCommissionsCents = statusCounts
    .filter((row) => row.status === "converted")
    .reduce((sum, row) => sum + Number(row.commissions), 0);
  const totalAttempts = converted + pending;
  const conversionRate =
    totalAttempts > 0 ? Math.round((converted / totalAttempts) * 100) : 0;

  return {
    totalConversions: converted,
    pendingConversions: pending,
    totalCommissionsCents,
    conversionRate,
    monthlyConversions: monthlyRows.map((row) => ({
      month: row.month,
      count: row.count,
    })),
    topReferrers: topReferrers.map((row) => ({
      clientId: row.clientId,
      clientName: formatClientName(row.firstName, row.lastName),
      conversionCount: row.conversionCount,
      commissionsCents: Number(row.commissionsCents),
    })),
  };
}

export async function getClientReferralInfo(
  organizationId: string,
  clientId: string,
): Promise<ClientReferralInfo | null> {
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.organizationId, organizationId),
      eq(referralCodes.clientId, clientId),
      eq(referralCodes.isActive, true),
    ),
    with: { program: true },
  });

  if (!referralCode?.program?.isActive) {
    return null;
  }

  const balanceCents = await getReferralCreditBalance(organizationId, clientId);

  const profile = await db.query.coachProfiles.findFirst({
    where: eq(coachProfiles.organizationId, organizationId),
    columns: { slug: true, isPublished: true },
  });

  const coachSlug =
    profile?.isPublished && profile.slug ? profile.slug : null;
  const shareUrl = coachSlug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://helios.lappom.fr"}/find/coaches/${coachSlug}?ref=${encodeURIComponent(referralCode.code)}`
    : null;

  return {
    code: referralCode.code,
    balanceCents,
    coachSlug,
    shareUrl,
  };
}

export async function handleReferralClientCreated(
  organizationId: string,
  clientId: string,
): Promise<void> {
  const programs = await db.query.referralPrograms.findMany({
    where: and(
      eq(referralPrograms.organizationId, organizationId),
      eq(referralPrograms.isActive, true),
    ),
    columns: { id: true },
  });

  if (programs.length === 0) {
    return;
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: { status: true },
  });

  if (
    !client ||
    !ELIGIBLE_CLIENT_STATUSES.includes(
      client.status as (typeof ELIGIBLE_CLIENT_STATUSES)[number],
    )
  ) {
    return;
  }

  await Promise.all(
    programs.map((program) =>
      generateCodeForClient(organizationId, program.id, clientId),
    ),
  );
}

export async function estimateCommissionCents(
  organizationId: string,
  referralCodeId: string,
  paymentAmountCents: number,
): Promise<number> {
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.id, referralCodeId),
      eq(referralCodes.organizationId, organizationId),
    ),
    with: { program: true },
  });

  if (!referralCode?.program) {
    return 0;
  }

  return calculateCommissionCents(
    paymentAmountCents,
    referralCode.program.commissionType as PromoDiscountType,
    referralCode.program.commissionValue,
  );
}
