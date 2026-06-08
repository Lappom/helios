"use client";

import { Film } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { VideoFeedCategory, VideoFeedItem } from "@/lib/videos/types";
import { VideoCard } from "./video-card";
import { VideoPlayerDialog } from "./video-player-dialog";

type ClientVideosPageClientProps = {
  initialCategories: VideoFeedCategory[];
};

export function ClientVideosPageClient({
  initialCategories,
}: ClientVideosPageClientProps) {
  const [categories] = useState(initialCategories);
  const [activeCategoryId, setActiveCategoryId] = useState<
    string | "all" | "uncategorized"
  >("all");
  const [selectedVideo, setSelectedVideo] = useState<VideoFeedItem | null>(
    null,
  );

  const totalVideos = useMemo(
    () => categories.reduce((sum, category) => sum + category.videos.length, 0),
    [categories],
  );

  const visibleCategories = useMemo(() => {
    if (activeCategoryId === "all") {
      return categories;
    }

    if (activeCategoryId === "uncategorized") {
      return categories.filter((category) => category.id === null);
    }

    return categories.filter((category) => category.id === activeCategoryId);
  }, [activeCategoryId, categories]);

  if (totalVideos === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="border-hairline bg-surface-card mx-auto flex max-w-lg flex-col items-center rounded-lg border px-6 py-12 text-center">
          <Film className="text-muted-soft mb-4 size-12" />
          <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
            Aucune vidéo disponible
          </h1>
          <p className="text-body-sm text-muted mt-2">
            Votre coach n&apos;a pas encore publié de contenu vidéo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6">
      <div>
        <p className="text-caption-uppercase text-muted tracking-widest uppercase">
          Vidéothèque
        </p>
        <h1 className="text-display-sm text-on-dark mt-1 font-bold tracking-tight">
          Mes vidéos
        </h1>
        <p className="text-body-sm text-muted mt-1">
          {totalVideos} vidéo{totalVideos > 1 ? "s" : ""} disponible
          {totalVideos > 1 ? "s" : ""}
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-4 bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveCategoryId("all")}
            className={cn(
              "text-body-sm shrink-0 rounded-md px-3 py-2 font-medium transition-colors",
              activeCategoryId === "all"
                ? "bg-surface-card text-primary"
                : "text-muted hover:bg-surface-card hover:text-on-dark",
            )}
          >
            Tout
          </button>
          {categories.map((category) => (
            <button
              key={category.id ?? "uncategorized"}
              type="button"
              onClick={() =>
                setActiveCategoryId(
                  category.id === null ? "uncategorized" : category.id,
                )
              }
              className={cn(
                "text-body-sm shrink-0 rounded-md px-3 py-2 font-medium transition-colors",
                (category.id === null &&
                  activeCategoryId === "uncategorized") ||
                  activeCategoryId === category.id
                  ? "bg-surface-card text-primary"
                  : "text-muted hover:bg-surface-card hover:text-on-dark",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {visibleCategories.map((category) => (
        <section key={category.id ?? "uncategorized"} className="space-y-4">
          {activeCategoryId === "all" ? (
            <h2 className="text-title-sm text-on-dark font-semibold">
              {category.name}
            </h2>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {category.videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setSelectedVideo(video)}
              />
            ))}
          </div>
        </section>
      ))}

      <VideoPlayerDialog
        video={selectedVideo}
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideo(null);
          }
        }}
      />
    </div>
  );
}
