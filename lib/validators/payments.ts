import { z } from "zod";
import { problem } from "@/lib/api/response";

export const PAYMENT_TYPES = ["subscription", "one_time", "external"] as const;
export const PAYMENT_SOURCES = ["manual", "booking", "import"] as const;
export const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "refunded",
  "failed",
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const paymentTypeSchema = z.enum(PAYMENT_TYPES);
export const paymentSourceSchema = z.enum(PAYMENT_SOURCES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  clientId: z.string().trim().min(1).optional(),
  type: paymentTypeSchema.optional(),
  status: paymentStatusSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;

export const createManualPaymentSchema = z.object({
  clientId: z.string().trim().min(1).optional(),
  amountCents: z.number().int().positive(),
  type: paymentTypeSchema.optional().default("external"),
  paidAt: z.string().datetime({ offset: true }),
  description: z.string().trim().max(500).optional(),
  serviceId: z.string().trim().min(1).optional(),
  externalReference: z.string().trim().max(200).optional(),
});

export type CreateManualPaymentInput = z.infer<
  typeof createManualPaymentSchema
>;

export const revenueDashboardQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional().default(12),
});

export type RevenueDashboardQuery = z.infer<
  typeof revenueDashboardQuerySchema
>;

export const revenueExportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RevenueExportQuery = z.infer<typeof revenueExportQuerySchema>;

export const revenueByClientQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type RevenueByClientQuery = z.infer<typeof revenueByClientQuerySchema>;

export function parseListPaymentsQuery(
  searchParams: URLSearchParams,
): ListPaymentsQuery {
  const result = listPaymentsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!result.success) {
    throw problem({
      type: "validation-error",
      title: "Invalid query",
      status: 400,
      detail: result.error.issues[0]?.message ?? "Invalid query parameters.",
    });
  }

  return result.data;
}

export function parseRevenueDashboardQuery(
  searchParams: URLSearchParams,
): RevenueDashboardQuery {
  const result = revenueDashboardQuerySchema.safeParse({
    months: searchParams.get("months") ?? undefined,
  });

  if (!result.success) {
    throw problem({
      type: "validation-error",
      title: "Invalid query",
      status: 400,
      detail: result.error.issues[0]?.message ?? "Invalid query parameters.",
    });
  }

  return result.data;
}

export function parseRevenueExportQuery(
  searchParams: URLSearchParams,
): RevenueExportQuery {
  const result = revenueExportQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!result.success) {
    throw problem({
      type: "validation-error",
      title: "Invalid query",
      status: 400,
      detail: "Query parameters from and to (YYYY-MM-DD) are required.",
    });
  }

  return result.data;
}

export function parseRevenueByClientQuery(
  searchParams: URLSearchParams,
): RevenueByClientQuery {
  const result = revenueByClientQuerySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!result.success) {
    throw problem({
      type: "validation-error",
      title: "Invalid query",
      status: 400,
      detail: result.error.issues[0]?.message ?? "Invalid query parameters.",
    });
  }

  return result.data;
}
