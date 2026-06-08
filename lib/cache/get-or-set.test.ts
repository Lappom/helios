import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./redis", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

import { cacheGet, cacheSet } from "./redis";
import { getOrSet } from "./get-or-set";

describe("getOrSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached value on hit without calling fetcher", async () => {
    vi.mocked(cacheGet).mockResolvedValue({ id: "cached" });
    const fetcher = vi.fn().mockResolvedValue({ id: "fresh" });

    const result = await getOrSet("key", 60, fetcher);

    expect(result).toEqual({ id: "cached" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(cacheSet).not.toHaveBeenCalled();
  });

  it("calls fetcher and caches on miss", async () => {
    vi.mocked(cacheGet).mockResolvedValue(null);
    const fetcher = vi.fn().mockResolvedValue({ id: "fresh" });

    const result = await getOrSet("key", 120, fetcher);

    expect(result).toEqual({ id: "fresh" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cacheSet).toHaveBeenCalledWith("key", { id: "fresh" }, 120);
  });
});
