"use client";

import { Film, Play } from "lucide-react";
import { formatDuration } from "@/lib/videos/format";
import type { VideoFeedItem } from "@/lib/videos/types";

type VideoCardProps = {
  video: VideoFeedItem;
  onClick: () => void;
};

export function VideoCard({ video, onClick }: VideoCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-hairline bg-surface-card group overflow-hidden rounded-lg border text-left transition-colors"
    >
      <div className="relative">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="bg-surface-elevated flex aspect-video items-center justify-center">
            <Film className="text-muted size-10" />
          </div>
        )}
        <span className="bg-canvas/80 text-on-dark absolute right-2 bottom-2 rounded px-2 py-0.5 text-xs font-medium">
          {formatDuration(video.durationSeconds)}
        </span>
        <span className="bg-primary text-on-primary absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="size-5 fill-current" />
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-title-sm text-on-dark line-clamp-2 font-semibold">
          {video.title}
        </h3>
        {video.description ? (
          <p className="text-body-sm text-muted mt-1 line-clamp-2">
            {video.description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
