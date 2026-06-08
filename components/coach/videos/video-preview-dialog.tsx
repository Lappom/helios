"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoStreamPlayer } from "@/components/videos/video-stream-player";
import type { VideoItem } from "@/lib/videos/types";

type VideoPreviewDialogProps = {
  video: VideoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VideoPreviewDialog({
  video,
  open,
  onOpenChange,
}: VideoPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface-card max-w-4xl border">
        <DialogHeader>
          <DialogTitle className="text-title-lg text-on-dark font-bold tracking-tight">
            {video?.title ?? "Aperçu"}
          </DialogTitle>
        </DialogHeader>

        <div className="border-hairline bg-surface-elevated overflow-hidden rounded-lg border">
          {open && video ? (
            <VideoStreamPlayer
              key={video.id}
              videoId={video.id}
              title={video.title}
            />
          ) : (
            <div className="text-muted flex aspect-video items-center justify-center">
              Lecture indisponible
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
