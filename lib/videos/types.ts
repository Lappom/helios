export type VideoSource = "youtube" | "upload";
export type VideoVisibility = "all_clients" | "selected";

export type VideoCategoryItem = {
  id: string;
  name: string;
  sortOrder: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  source: VideoSource;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  visibility: VideoVisibility;
  categoryId: string | null;
  categoryName: string | null;
  sizeBytes: number | null;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VideoAccessItem = {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
};

export type VideoFeedItem = {
  id: string;
  title: string;
  description: string | null;
  source: VideoSource;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type VideoFeedCategory = {
  id: string | null;
  name: string;
  sortOrder: number;
  videos: VideoFeedItem[];
};

export type VideoStreamInfo = {
  source: VideoSource;
  embedUrl: string | null;
  playUrl: string | null;
  expiresAt: string;
};

export type VideoPlayback = {
  mimeType: string;
  blobPathname: string;
  title: string;
};

export type VideoActor =
  | { role: "coach" }
  | { role: "client"; clientId: string };
