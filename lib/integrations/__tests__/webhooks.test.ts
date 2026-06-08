import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/integrations/webhooks";

describe("webhook signatures", () => {
  it("signs and verifies payload", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ event: "client.created", data: {} });
    const timestamp = Math.floor(Date.now() / 1000);
    const header = signWebhookPayload(secret, payload, timestamp);

    expect(verifyWebhookSignature(secret, payload, header)).toBe(true);
  });

  it("rejects tampered payload", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ event: "client.created" });
    const header = signWebhookPayload(secret, payload, 1_700_000_000);

    expect(
      verifyWebhookSignature(secret, '{"event":"payment.received"}', header),
    ).toBe(false);
  });
});
