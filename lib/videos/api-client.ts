import type {
  VideoAccessItem,
  VideoCategoryItem,
  VideoFeedCategory,
  VideoItem,
  VideoStreamInfo,
} from "@/lib/videos/types";
import type {
  CreateCategoryInput,
  CreateYoutubeVideoInput,
  SetVideoAccessInput,
  UpdateCategoryInput,
  UpdateVideoInput,
} from "@/lib/validators/videos";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export async function fetchVideoCategories(): Promise<{
  items: VideoCategoryItem[];
}> {
  const response = await fetch("/api/v1/videos/categories");
  return parseResponse(response);
}

export async function createVideoCategory(
  input: CreateCategoryInput,
): Promise<VideoCategoryItem> {
  const response = await fetch("/api/v1/videos/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function updateVideoCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<VideoCategoryItem> {
  const response = await fetch(`/api/v1/videos/categories/${categoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteVideoCategory(categoryId: string): Promise<void> {
  const response = await fetch(`/api/v1/videos/categories/${categoryId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function reorderVideoCategories(
  categoryIds: string[],
): Promise<{ items: VideoCategoryItem[] }> {
  const response = await fetch("/api/v1/videos/categories/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ categoryIds }),
  });
  return parseResponse(response);
}

export async function fetchVideos(params?: {
  categoryId?: string | null;
  page?: number;
  limit?: number;
}): Promise<{ items: VideoItem[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.categoryId === null) {
    search.set("categoryId", "null");
  } else if (params?.categoryId) {
    search.set("categoryId", params.categoryId);
  }
  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const query = search.toString();
  const response = await fetch(`/api/v1/videos${query ? `?${query}` : ""}`);
  const payload = await parseResponse<{
    items: VideoItem[];
    total: number;
  }>(response);
  return payload;
}

export async function createYoutubeVideo(
  input: CreateYoutubeVideoInput,
): Promise<VideoItem> {
  const response = await fetch("/api/v1/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function uploadVideoWithProgress(
  file: File,
  metadata: {
    title: string;
    description?: string | null;
    categoryId?: string | null;
    visibility: "all_clients" | "selected";
    clientIds?: string[];
    durationSeconds?: number | null;
  },
  thumbnail: File | null,
  onProgress?: (percent: number) => void,
): Promise<VideoItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    }
    formData.append("title", metadata.title);
    if (metadata.description) {
      formData.append("description", metadata.description);
    }
    if (metadata.categoryId) {
      formData.append("categoryId", metadata.categoryId);
    }
    formData.append("visibility", metadata.visibility);
    if (metadata.clientIds?.length) {
      formData.append("clientIds", JSON.stringify(metadata.clientIds));
    }
    if (metadata.durationSeconds != null) {
      formData.append("durationSeconds", String(metadata.durationSeconds));
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as VideoItem);
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as { detail?: string };
        reject(new Error(payload.detail ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open("POST", "/api/v1/videos/upload");
    xhr.send(formData);
  });
}

export async function updateVideo(
  videoId: string,
  input: UpdateVideoInput,
): Promise<VideoItem> {
  const response = await fetch(`/api/v1/videos/${videoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function deleteVideoApi(videoId: string): Promise<void> {
  const response = await fetch(`/api/v1/videos/${videoId}`, {
    method: "DELETE",
  });
  await parseResponse(response);
}

export async function fetchVideoAccess(
  videoId: string,
): Promise<{ items: VideoAccessItem[] }> {
  const response = await fetch(`/api/v1/videos/${videoId}/access`);
  return parseResponse(response);
}

export async function setVideoAccessApi(
  videoId: string,
  input: SetVideoAccessInput,
): Promise<{ items: VideoAccessItem[] }> {
  const response = await fetch(`/api/v1/videos/${videoId}/access`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function fetchVideoStream(
  videoId: string,
): Promise<VideoStreamInfo> {
  const response = await fetch(`/api/v1/videos/${videoId}/stream`);
  return parseResponse(response);
}

export async function fetchClientVideoFeed(): Promise<{
  categories: VideoFeedCategory[];
}> {
  const response = await fetch("/api/v1/videos/feed");
  return parseResponse(response);
}
