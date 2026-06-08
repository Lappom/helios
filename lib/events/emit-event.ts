import "server-only";

import type { HeliosEventName, HeliosEventPayload } from "./types";

export function emitHeliosEvent<T extends HeliosEventName>(
  name: T,
  payload: HeliosEventPayload[T],
): void {
  if (process.env.NODE_ENV === "development") {
    console.info(`[helios:event] ${name}`, payload);
  }

  void import("@/lib/notifications/listeners").then(
    ({ handleHeliosNotificationEvent }) =>
      handleHeliosNotificationEvent(name, payload).catch((error) => {
        console.error(
          `[helios:event] notification listener failed for ${name}`,
          error,
        );
      }),
  );

  void import("@/lib/automations/dispatcher").then(({ handleAutomationEvent }) =>
    handleAutomationEvent(name, payload).catch((error) => {
      console.error(
        `[helios:event] automation listener failed for ${name}`,
        error,
      );
    }),
  );

  void import("@/lib/integrations/dispatcher").then(({ handleWebhookEvent }) =>
    handleWebhookEvent(name, payload).catch((error) => {
      console.error(
        `[helios:event] webhook listener failed for ${name}`,
        error,
      );
    }),
  );

  if (name === "client.created") {
    const clientCreatedPayload = payload as HeliosEventPayload["client.created"];
    void import("@/lib/questionnaires/listeners").then(
      ({ handleQuestionnaireClientCreated }) =>
        handleQuestionnaireClientCreated(clientCreatedPayload).catch((error) => {
          console.error(
            "[helios:event] questionnaire listener failed for client.created",
            error,
          );
        }),
    );
    void import("@/lib/pathways/listeners").then(
      ({ handlePathwayClientCreated }) =>
        handlePathwayClientCreated(clientCreatedPayload).catch((error) => {
          console.error(
            "[helios:event] pathway listener failed for client.created",
            error,
          );
        }),
    );
    void import("@/lib/referrals/service").then(
      ({ handleReferralClientCreated }) =>
        handleReferralClientCreated(
          clientCreatedPayload.organizationId,
          clientCreatedPayload.clientId,
        ).catch((error) => {
          console.error(
            "[helios:event] referral listener failed for client.created",
            error,
          );
        }),
    );
  }

  if (name === "payment.received") {
    const paymentPayload = payload as HeliosEventPayload["payment.received"];
    void import("@/lib/referrals/listeners").then(
      ({ handleReferralPaymentEvent }) =>
        handleReferralPaymentEvent(paymentPayload).catch((error) => {
          console.error(
            "[helios:event] referral listener failed for payment.received",
            error,
          );
        }),
    );
  }
}
