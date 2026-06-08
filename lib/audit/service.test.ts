import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn().mockResolvedValue(undefined);
const insert = vi.fn(() => ({ values: insertValues }));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert,
    query: {
      auditLogs: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
  }),
}));

import { logAuditEvent } from "./service";

describe("logAuditEvent", () => {
  beforeEach(() => {
    insert.mockClear();
    insertValues.mockClear();
  });

  it("inserts audit row with actor and action", async () => {
    await logAuditEvent({
      organizationId: "org_1",
      actor: { type: "coach", clerkUserId: "user_1" },
      action: "client.export",
      resourceType: "client",
      resourceId: "client_1",
    });

    expect(insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        action: "client.export",
        resourceType: "client",
        resourceId: "client_1",
        actorType: "coach",
      }),
    );
  });
});
