"use client";

import { Eye, Film, Lock, Trash2, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/videos/format";
import type { VideoItem } from "@/lib/videos/types";
import { cn } from "@/lib/utils";

type VideoGridProps = {
  videos: VideoItem[];
  onPreview: (video: VideoItem) => void;
  onManageAccess: (video: VideoItem) => void;
  onDelete: (video: VideoItem) => void;
};

export function VideoGrid({
  videos,
  onPreview,
  onManageAccess,
  onDelete,
}: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="border-hairline bg-surface-card flex flex-col items-center justify-center rounded-lg border px-6 py-16 text-center">
        <Film className="text-muted-soft mb-4 size-12" />
        <h3 className="text-title-md text-on-dark font-semibold">
          Aucune vidéo
        </h3>
        <p className="text-body-sm text-muted mt-2 max-w-sm">
          Ajoutez une vidéo YouTube ou uploadez un fichier pour alimenter votre
          vidéothèque.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <article
          key={video.id}
          className="border-hairline bg-surface-card group overflow-hidden rounded-lg border"
        >
          <button
            type="button"
            onClick={() => onPreview(video)}
            className="relative block w-full"
          >
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
            <span className="text-caption bg-canvas/80 text-on-dark absolute right-2 bottom-2 rounded px-2 py-0.5">
              {formatDuration(video.durationSeconds)}
            </span>
          </button>

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-title-sm text-on-dark truncate font-semibold">
                  {video.title}
                </h3>
                {video.categoryName ? (
                  <p className="text-caption text-muted mt-1">
                    {video.categoryName}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "text-caption-uppercase inline-flex items-center gap-1 rounded px-2 py-1",
                  video.source === "youtube"
                    ? "bg-accent-rose/10 text-accent-rose"
                    : "bg-accent-emerald/10 text-accent-emerald",
                )}
              >
                {video.source === "youtube" ? (
                  <Video className="size-3" />
                ) : (
                  <Film className="size-3" />
                )}
                {video.source === "youtube" ? "YT" : "Upload"}
              </span>
            </div>

            <div className="text-caption text-muted flex items-center gap-2">
              {video.visibility === "all_clients" ? (
                <>
                  <Users className="size-3.5" />
                  Tous les clients
                </>
              ) : (
                <>
                  <Lock className="size-3.5" />
                  {video.accessCount} client
                  {video.accessCount > 1 ? "s" : ""}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onPreview(video)}
              >
                <Eye className="size-4" />
                Aperçu
              </Button>
              {video.visibility === "selected" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onManageAccess(video)}
                >
                  <Users className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onDelete(video)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
