import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/integrations/webhooks", () => ({
  listActiveWebhooksForEvent: vi.fn(),
  createWebhookDelivery: vi.fn(),
}));

vi.mock("@/lib/integrations/deliver", () => ({
  deliverWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { handleWebhookEvent } from "@/lib/integrations/dispatcher";
import { deliverWebhook } from "@/lib/integrations/deliver";
import {
  createWebhookDelivery,
  listActiveWebhooksForEvent,
} from "@/lib/integrations/webhooks";

describe("handleWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores non-webhook events", async () => {
    await handleWebhookEvent("message.new", {
      organizationId: "org_1",
      conversationId: "conv_1",
      conversationType: "direct",
      senderClerkUserId: "user_1",
      messageId: "msg_1",
    });

    expect(listActiveWebhooksForEvent).not.toHaveBeenCalled();
  });

  it("dispatches to active endpoints for webhook events", async () => {
    vi.mocked(listActiveWebhooksForEvent).mockResolvedValue([
      { id: "wh_1", url: "https://example.com/hook", secret: "whsec_x" },
    ]);
    vi.mocked(createWebhookDelivery).mockResolvedValue("del_1");

    await handleWebhookEvent("client.created", {
      organizationId: "org_1",
      clientId: "client_1",
      source: "manual",
    });

    expect(listActiveWebhooksForEvent).toHaveBeenCalledWith(
      "org_1",
      "client.created",
    );
    expect(createWebhookDelivery).toHaveBeenCalled();
    expect(deliverWebhook).toHaveBeenCalledWith("del_1");
  });
});
