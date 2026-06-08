"use client";

import { useEffect, useState } from "react";
import { fetchVideoStream } from "@/lib/videos/api-client";

type VideoStreamPlayerProps = {
  videoId: string;
  title: string;
  autoPlay?: boolean;
};

export function VideoStreamPlayer({
  videoId,
  title,
  autoPlay = false,
}: VideoStreamPlayerProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchVideoStream(videoId)
      .then((stream) => {
        if (cancelled) {
          return;
        }
        setEmbedUrl(stream.embedUrl);
        setPlayUrl(stream.playUrl);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPlayUrl(null);
        setEmbedUrl(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (loading) {
    return (
      <div className="text-muted flex aspect-video items-center justify-center">
        Chargement…
      </div>
    );
  }

  if (embedUrl) {
    return (
      <iframe
        title={title}
        src={embedUrl}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (playUrl) {
    return (
      <video
        src={playUrl}
        controls
        autoPlay={autoPlay}
        className="aspect-video w-full"
      />
    );
  }

  return (
    <div className="text-muted flex aspect-video items-center justify-center">
      Lecture indisponible
    </div>
  );
}
