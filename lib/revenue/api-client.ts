import type {
  PaymentListItem,
  RevenueByClientReport,
  RevenueDashboard,
} from "@/lib/revenue/types";
import type { CreateManualPaymentInput } from "@/lib/validators/payments";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchRevenueDashboard(
  months = 12,
): Promise<RevenueDashboard> {
  const response = await fetch(
    `/api/v1/revenue/dashboard?months=${months}`,
    { cache: "no-store" },
  );
  return parseResponse<RevenueDashboard>(response);
}

export async function fetchRevenueByClient(): Promise<RevenueByClientReport> {
  const response = await fetch("/api/v1/revenue/by-client", {
    cache: "no-store",
  });
  return parseResponse<RevenueByClientReport>(response);
}

export type PaymentsListResponse = {
  items: PaymentListItem[];
  page: number;
  limit: number;
};

export async function fetchPayments(params: {
  page?: number;
  limit?: number;
  clientId?: string;
  type?: string;
  from?: string;
  to?: string;
}): Promise<PaymentsListResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.type) search.set("type", params.type);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);

  const response = await fetch(`/api/v1/payments?${search.toString()}`, {
    cache: "no-store",
  });
  return parseResponse<PaymentsListResponse>(response);
}

export async function createManualPaymentRequest(
  input: CreateManualPaymentInput,
): Promise<PaymentListItem> {
  const response = await fetch("/api/v1/payments/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<PaymentListItem>(response);
}

export function getRevenueExportUrl(from: string, to: string): string {
  const search = new URLSearchParams({ from, to });
  return `/api/v1/revenue/export.csv?${search.toString()}`;
}
