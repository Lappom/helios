import { describe, expect, it } from "vitest";
import {
  addGroupParticipantsSchema,
  createConversationSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
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

  it("accepts group conversation creation", () => {
    const parsed = createGroupConversationSchema.parse({
      type: "group",
      name: "Team Alpha",
      clientIds: ["client_1", "client_2"],
    });
    expect(parsed.name).toBe("Team Alpha");
    expect(parsed.clientIds).toHaveLength(2);
  });

  it("rejects group with more than 49 clients", () => {
    expect(() =>
      createGroupConversationSchema.parse({
        type: "group",
        name: "Too big",
        clientIds: Array.from({ length: 50 }, (_, index) => `client_${index}`),
      }),
    ).toThrow();
  });

  it("accepts createConversationSchema union", () => {
    const direct = createConversationSchema.parse({
      clientId: "client_123",
    });
    expect(direct.type).toBe("direct");

    const group = createConversationSchema.parse({
      type: "group",
      name: "Broadcast",
      clientIds: ["client_1"],
    });
    expect(group.type).toBe("group");
  });

  it("accepts addGroupParticipantsSchema", () => {
    const parsed = addGroupParticipantsSchema.parse({
      clientIds: ["client_1", "client_2"],
    });
    expect(parsed.clientIds).toHaveLength(2);
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
