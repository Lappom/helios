import { describe, expect, it } from "vitest";
import {
  createAutomationSchema,
  validateActionConfig,
  validateTriggerConfig,
} from "./automations";

describe("createAutomationSchema", () => {
  it("accepts a valid automation payload", () => {
    const result = createAutomationSchema.safeParse({
      name: "Onboarding",
      triggerType: "payment_received",
      triggerConfig: {},
      actions: [
        {
          actionType: "send_message",
          actionConfig: { content: "Hello" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects automations without actions", () => {
    const result = createAutomationSchema.safeParse({
      name: "Empty",
      triggerType: "client_created",
      triggerConfig: {},
      actions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateActionConfig", () => {
  it("validates assign_program config", () => {
    expect(() =>
      validateActionConfig("assign_program", { programId: "prog_1" }),
    ).not.toThrow();
  });

  it("validates schedule cron trigger config", () => {
    expect(() =>
      validateTriggerConfig("schedule_cron", { cron: "0 8 * * *" }),
    ).not.toThrow();
  });
});
