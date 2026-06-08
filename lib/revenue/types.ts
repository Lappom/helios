import type {
  PaymentSource,
  PaymentStatus,
  PaymentType,
} from "@/lib/validators/payments";

export type PaymentListItem = {
  id: string;
  organizationId: string;
  coachClerkUserId: string;
  clientId: string | null;
  clientName: string | null;
  serviceId: string | null;
  serviceName: string | null;
  bookingId: string | null;
  amountCents: number;
  currency: string;
  type: PaymentType;
  source: PaymentSource;
  externalReference: string | null;
  description: string | null;
  paidAt: string;
  status: PaymentStatus;
  createdAt: string;
};

export type RevenueMonthPoint = {
  month: string;
  totalRevenueCents: number;
  mrrCents: number;
  oneTimeRevenueCents: number;
};

export type RevenueDashboard = {
  currentMonth: {
    totalRevenueCents: number;
    mrrCents: number;
    oneTimeRevenueCents: number;
    paymentCount: number;
  };
  series: RevenueMonthPoint[];
};

export type RevenueByClientItem = {
  clientId: string | null;
  clientName: string;
  totalRevenueCents: number;
  paymentCount: number;
};

export type RevenueByServiceItem = {
  serviceId: string | null;
  serviceName: string;
  totalRevenueCents: number;
  paymentCount: number;
};

export type RevenueByClientReport = {
  clients: RevenueByClientItem[];
  services: RevenueByServiceItem[];
};
