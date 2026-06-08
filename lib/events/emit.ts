export type HeliosEventName =
  | "client.created"
  | "assessment.submitted"
  | "payment.received";

export type ClientCreatedPayload = {
  organizationId: string;
  clientId: string;
  source: "checkout" | "manual" | "import";
  bookingId?: string;
};

export type PaymentReceivedPayload = {
  organizationId: string;
  paymentId: string;
  clientId?: string;
  amountCents: number;
  type: "subscription" | "one_time" | "external";
  source: "manual" | "booking" | "import";
};

export type HeliosEventPayload = {
  "client.created": ClientCreatedPayload;
  "assessment.submitted": {
    organizationId: string;
    assessmentId: string;
    clientId: string;
  };
  "payment.received": PaymentReceivedPayload;
};

export function emitHeliosEvent<T extends HeliosEventName>(
  name: T,
  payload: HeliosEventPayload[T],
): void {
  if (process.env.NODE_ENV === "development") {
    console.info(`[helios:event] ${name}`, payload);
  }
}
