export type HeliosEventName =
  | "client.created"
  | "assessment.submitted"
  | "payment.received"
  | "program.published"
  | "message.new";

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

export type ProgramPublishedPayload = {
  organizationId: string;
  programId: string;
  clientId: string;
  assignmentId: string;
};

export type MessageNewPayload = {
  organizationId: string;
  conversationId: string;
  clientId: string;
  senderClerkUserId: string;
  messageId: string;
};

export type HeliosEventPayload = {
  "client.created": ClientCreatedPayload;
  "assessment.submitted": {
    organizationId: string;
    assessmentId: string;
    clientId: string;
  };
  "payment.received": PaymentReceivedPayload;
  "program.published": ProgramPublishedPayload;
  "message.new": MessageNewPayload;
};

export function emitHeliosEvent<T extends HeliosEventName>(
  name: T,
  payload: HeliosEventPayload[T],
): void {
  if (process.env.NODE_ENV === "development") {
    console.info(`[helios:event] ${name}`, payload);
  }

  void import("@/lib/notifications/listeners").then(({ handleHeliosNotificationEvent }) =>
    handleHeliosNotificationEvent(name, payload).catch((error) => {
      console.error(`[helios:event] notification listener failed for ${name}`, error);
    }),
  );
}
