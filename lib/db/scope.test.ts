import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, transaction } = vi.hoisted(() => {
  const execute = vi.fn().mockResolvedValue(undefined);
  const transaction = vi.fn(
    async (callback: (tx: { execute: typeof execute }) => Promise<unknown>) =>
      callback({ execute }),
  );
  return { execute, transaction };
});

vi.mock("./client", () => ({
  db: { transaction },
}));

vi.mock("./context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context")>();
  return {
    ...actual,
    getDbContextStore: vi.fn().mockReturnValue(undefined),
  };
});

import { runWithDbScope } from "./scope";

describe("runWithDbScope", () => {
  beforeEach(() => {
    execute.mockClear();
    transaction.mockClear();
  });

  it("runs handler inside a transaction with tenant config", async () => {
    const result = await runWithDbScope(
      { organizationId: "org_123" },
      async () => "ok",
    );

    expect(result).toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalled();
  });

  it("runs handler with bypass config", async () => {
    await runWithDbScope({ bypass: true }, async () => "ok");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalled();
  });
});
