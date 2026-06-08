import { describe, expect, it } from "vitest";
import {
  buildDriveUploadPathname,
  buildVodThumbnailPathname,
  buildVodUploadPathname,
  parseDriveUploadPathname,
  parseVodUploadPathname,
} from "./client-upload";

describe("client upload pathnames", () => {
  it("builds and parses drive pathnames", () => {
    const pathname = buildDriveUploadPathname("org_1", "file_1", "application/pdf");
    expect(pathname).toBe("drive/org_1/file_1.pdf");
    expect(parseDriveUploadPathname(pathname)).toEqual({
      organizationId: "org_1",
      fileId: "file_1",
    });
  });

  it("builds and parses vod pathnames", () => {
    const pathname = buildVodUploadPathname("org_1", "vid_1", "video/mp4");
    expect(pathname).toBe("vod/org_1/vid_1.mp4");
    expect(parseVodUploadPathname(pathname)).toEqual({
      organizationId: "org_1",
      videoId: "vid_1",
      isThumbnail: false,
    });
  });

  it("parses vod thumbnail pathnames", () => {
    const pathname = buildVodThumbnailPathname("org_1", "vid_1");
    expect(pathname).toBe("vod/org_1/vid_1-thumb.jpg");
    expect(parseVodUploadPathname(pathname)).toEqual({
      organizationId: "org_1",
      videoId: "vid_1",
      isThumbnail: true,
    });
  });

  it("rejects invalid drive pathnames", () => {
    expect(parseDriveUploadPathname("vod/org_1/vid.mp4")).toBeNull();
    expect(parseDriveUploadPathname("drive/other-org/file.pdf")).toEqual({
      organizationId: "other-org",
      fileId: "file",
    });
  });
});
