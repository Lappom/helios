import { describe, expect, it } from "vitest";
import {
  createFolderSchema,
  driveShareTargetSchema,
  shareDriveSchema,
} from "@/lib/validators/drive";

describe("drive validators", () => {
  it("accepts folder creation", () => {
    const parsed = createFolderSchema.parse({ name: "Client docs" });
    expect(parsed.name).toBe("Client docs");
  });

  it("rejects empty folder name", () => {
    expect(() => createFolderSchema.parse({ name: "   " })).toThrow();
  });

  it("accepts share with clientId", () => {
    const parsed = shareDriveSchema.parse({ clientId: "client_123" });
    expect(parsed.clientId).toBe("client_123");
  });

  it("requires exactly one share target", () => {
    expect(() =>
      driveShareTargetSchema.parse({ fileId: "f1", folderId: "d1" }),
    ).toThrow();

    expect(() => driveShareTargetSchema.parse({})).toThrow();

    expect(driveShareTargetSchema.parse({ fileId: "f1" }).fileId).toBe("f1");
    expect(driveShareTargetSchema.parse({ folderId: "d1" }).folderId).toBe("d1");
  });
});
