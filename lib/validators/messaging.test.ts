import { describe, expect, it } from "vitest";
import {
  createDirectConversationSchema,
  markReadSchema,
  sendMessageSchema,
} from "@/lib/validators/messaging";

describe("messaging validators", () => {
  it("accepts direct conversation creation", () => {
    const parsed = createDirectConversationSchema.parse({
      clientId: "client_123",
    });
    expect(parsed.clientId).toBe("client_123");
  });

  it("requires text content for text messages", () => {
    expect(() =>
      sendMessageSchema.parse({
        type: "text",
        content: "   ",
      }),
    ).toThrow();
  });

  it("requires mediaPathname for media messages", () => {
    expect(() =>
      sendMessageSchema.parse({
        type: "image",
      }),
    ).toThrow();

    const parsed = sendMessageSchema.parse({
      type: "image",
      mediaPathname: "messages/org/conv/file.jpg",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
    });

    expect(parsed.mediaPathname).toContain("messages/");
  });

  it("accepts optional messageId for mark read", () => {
    expect(markReadSchema.parse({})).toEqual({});
    expect(markReadSchema.parse({ messageId: "msg_1" })).toEqual({
      messageId: "msg_1",
    });
  });
});
