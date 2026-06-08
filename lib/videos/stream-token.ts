import { createHmac, timingSafeEqual } from "node:crypto";

const STREAM_TOKEN_TTL_MS = 60 * 60 * 1000;

function getStreamSecret(): string {
  const secret = process.env.VIDEO_STREAM_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return "dev-video-stream-secret";
    }
    throw new Error("VIDEO_STREAM_SECRET is not configured");
  }
  return secret;
}

export function getStreamTokenExpiry(): number {
  return Date.now() + STREAM_TOKEN_TTL_MS;
}

export function createVideoStreamToken(
  videoId: string,
  expiresAt: number,
): string {
  const payload = `${videoId}:${expiresAt}`;
  return createHmac("sha256", getStreamSecret()).update(payload).digest("hex");
}

export function verifyVideoStreamToken(
  videoId: string,
  expiresAt: number,
  token: string,
): boolean {
  if (Date.now() > expiresAt) {
    return false;
  }

  const expected = createVideoStreamToken(videoId, expiresAt);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildPlayUrl(
  videoId: string,
  expiresAt: number,
  token: string,
): string {
  return `/api/v1/videos/${videoId}/play?token=${encodeURIComponent(token)}&exp=${expiresAt}`;
}
