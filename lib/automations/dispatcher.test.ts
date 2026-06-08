import { describe, expect, it } from "vitest";
import { resolveTriggerEventId } from "./dispatcher";

describe("resolveTriggerEventId", () => {
  it("uses payment id for payment_received", () => {
    const id = resolveTriggerEventId("payment_received", {
      organizationId: "org_1",
      triggerEventId: "",
      clientId: "client_1",
      metadata: { paymentId: "pay_123" },
    });
    expect(id).toBe("pay_123");
  });

  it("uses explicit triggerEventId when provided", () => {
    const id = resolveTriggerEventId("schedule_cron", {
      organizationId: "org_1",
      triggerEventId: "cron:fixed",
    });
    expect(id).toBe("cron:fixed");
  });
});
