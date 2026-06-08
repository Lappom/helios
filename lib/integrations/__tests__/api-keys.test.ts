import { afterEach, describe, expect, it } from "vitest";
import { hashApiKey } from "@/lib/integrations/api-keys";

describe("hashApiKey", () => {
  afterEach(() => {
    delete process.env.API_KEY_PEPPER;
  });

  it("returns a stable sha256 hex hash for the same secret", () => {
    process.env.API_KEY_PEPPER = "test-pepper";
    const secret = "hls_abc123secret";
    expect(hashApiKey(secret)).toBe(hashApiKey(secret));
    expect(hashApiKey(secret)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when pepper changes", () => {
    process.env.API_KEY_PEPPER = "pepper-a";
    const hashA = hashApiKey("hls_same");
    process.env.API_KEY_PEPPER = "pepper-b";
    const hashB = hashApiKey("hls_same");
    expect(hashA).not.toBe(hashB);
  });
});
