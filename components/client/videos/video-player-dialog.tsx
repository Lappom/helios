"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoStreamPlayer } from "@/components/videos/video-stream-player";
import type { VideoFeedItem } from "@/lib/videos/types";

type VideoPlayerDialogProps = {
  video: VideoFeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VideoPlayerDialog({
  video,
  open,
  onOpenChange,
}: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-hairline bg-surface-card max-w-5xl border p-0 sm:p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-title-lg text-on-dark font-bold tracking-tight">
            {video?.title ?? "Lecture"}
          </DialogTitle>
        </DialogHeader>

        <div className="border-hairline bg-surface-elevated mx-6 mb-6 overflow-hidden rounded-lg border">
          {open && video ? (
            <VideoStreamPlayer
              key={video.id}
              videoId={video.id}
              title={video.title}
              autoPlay
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
