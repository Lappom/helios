import { describe, expect, it } from "vitest";
import {
  createCategorySchema,
  createYoutubeVideoSchema,
  reorderCategoriesSchema,
  setVideoAccessSchema,
} from "@/lib/validators/videos";

describe("videos validators", () => {
  it("accepts category creation", () => {
    const parsed = createCategorySchema.parse({ name: "Warm-up" });
    expect(parsed.name).toBe("Warm-up");
  });

  it("rejects empty category name", () => {
    expect(() => createCategorySchema.parse({ name: "   " })).toThrow();
  });

  it("accepts youtube video with all_clients visibility", () => {
    const parsed = createYoutubeVideoSchema.parse({
      title: "Intro",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      visibility: "all_clients",
    });
    expect(parsed.title).toBe("Intro");
  });

  it("requires clientIds for selected visibility", () => {
    expect(() =>
      createYoutubeVideoSchema.parse({
        title: "Private",
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
        visibility: "selected",
      }),
    ).toThrow();
  });

  it("rejects invalid youtube url", () => {
    expect(() =>
      createYoutubeVideoSchema.parse({
        title: "Bad",
        youtubeUrl: "https://example.com/video",
        visibility: "all_clients",
      }),
    ).toThrow();
  });

  it("accepts category reorder", () => {
    const parsed = reorderCategoriesSchema.parse({
      categoryIds: ["cat_1", "cat_2"],
    });
    expect(parsed.categoryIds).toHaveLength(2);
  });

  it("accepts video access list", () => {
    const parsed = setVideoAccessSchema.parse({ clientIds: ["client_1"] });
    expect(parsed.clientIds).toEqual(["client_1"]);
  });
});
