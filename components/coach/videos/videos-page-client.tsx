"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/lib/auth/types";
import {
  deleteVideoApi,
  fetchVideoCategories,
  fetchVideos,
} from "@/lib/videos/api-client";
import type { VideoCategoryItem, VideoItem } from "@/lib/videos/types";
import { VideoAccessPanel } from "./video-access-panel";
import { VideoCategoryPanel } from "./video-category-panel";
import { VideoFormDialog } from "./video-form-dialog";
import { VideoGrid } from "./video-grid";
import { VideoPreviewDialog } from "./video-preview-dialog";

type VideosPageClientProps = {
  planTier: PlanTier;
  initialCategories: VideoCategoryItem[];
  initialVideos: VideoItem[];
  initialTotal: number;
};

export function VideosPageClient({
  planTier,
  initialCategories,
  initialVideos,
  initialTotal,
}: VideosPageClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [videos, setVideos] = useState(initialVideos);
  const [total, setTotal] = useState(initialTotal);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | null | undefined
  >(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [accessVideo, setAccessVideo] = useState<VideoItem | null>(null);

  const reloadCategories = useCallback(async () => {
    const result = await fetchVideoCategories();
    setCategories(result.items);
  }, []);

  const reloadVideos = useCallback(async () => {
    const result = await fetchVideos({
      categoryId: selectedCategoryId,
      page: 1,
      limit: 100,
    });
    setVideos(result.items);
    setTotal(result.total);
  }, [selectedCategoryId]);

  async function handleCategorySelect(categoryId: string | null | undefined) {
    setSelectedCategoryId(categoryId);
    const result = await fetchVideos({
      categoryId,
      page: 1,
      limit: 100,
    });
    setVideos(result.items);
    setTotal(result.total);
  }

  async function handleDelete(video: VideoItem) {
    if (!window.confirm(`Supprimer « ${video.title} » ?`)) {
      return;
    }

    try {
      await deleteVideoApi(video.id);
      await reloadVideos();
      await reloadCategories();
      toast.success("Vidéo supprimée.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible.",
      );
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-caption-uppercase text-muted tracking-widest uppercase">
            Vidéothèque
          </p>
          <h1 className="text-display-sm text-on-dark mt-1 font-bold tracking-tight">
            Bibliothèque VOD
          </h1>
          <p className="text-body-sm text-muted mt-1">
            {total} vidéo{total > 1 ? "s" : ""} — YouTube et uploads privés
          </p>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Ajouter une vidéo
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <VideoCategoryPanel
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleCategorySelect}
          onCategoriesChange={async () => {
            await reloadCategories();
            await reloadVideos();
          }}
        />
        <VideoGrid
          videos={videos}
          onPreview={setPreviewVideo}
          onManageAccess={setAccessVideo}
          onDelete={handleDelete}
        />
      </div>

      <VideoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        planTier={planTier}
        onCreated={async () => {
          await reloadCategories();
          await reloadVideos();
        }}
      />

      <VideoPreviewDialog
        video={previewVideo}
        open={previewVideo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewVideo(null);
          }
        }}
      />

      <VideoAccessPanel
        video={accessVideo}
        open={accessVideo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAccessVideo(null);
          }
        }}
        onUpdated={reloadVideos}
      />
    </div>
  );
}
