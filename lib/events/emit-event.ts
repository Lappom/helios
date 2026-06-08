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
}
