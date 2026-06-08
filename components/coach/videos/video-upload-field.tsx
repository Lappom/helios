"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlanTier } from "@/lib/auth/types";
import { getVodVideoLimitMb } from "@/lib/billing/plans";
import {
  extractVideoThumbnail,
  getVideoDurationSeconds,
} from "@/lib/videos/thumbnail";

type VideoUploadFieldProps = {
  planTier: PlanTier;
  onFileReady: (payload: {
    file: File;
    thumbnail: File | null;
    durationSeconds: number | null;
    previewUrl: string;
  }) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function VideoUploadField({
  planTier,
  onFileReady,
  onClear,
  disabled,
}: VideoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const limitMb = getVodVideoLimitMb(planTier);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    try {
      const [thumbnail, durationSeconds] = await Promise.all([
        extractVideoThumbnail(file),
        getVideoDurationSeconds(file),
      ]);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onFileReady({
        file,
        thumbnail,
        durationSeconds,
        previewUrl: objectUrl,
      });
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleClear() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onClear();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-body-sm text-body-strong font-medium">
            Fichier vidéo
          </p>
          <p className="text-body-sm text-muted">
            MP4, MOV, WebM — max {limitMb} MB
          </p>
        </div>
        <div className="flex gap-2">
          {previewUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || loading}
              onClick={handleClear}
            >
              Retirer
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
          >
            {loading ? "Analyse…" : "Choisir un fichier"}
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <video
          src={previewUrl}
          controls
          className="border-hairline bg-surface-elevated aspect-video w-full rounded-lg border"
        />
      ) : null}
    </div>
  );
}
