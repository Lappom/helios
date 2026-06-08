"use client";

import type { MessageItem } from "@/lib/messaging/types";
import { FileText, Mic } from "lucide-react";

type MediaAttachmentProps = {
  message: MessageItem;
  mediaUrl: string;
};

export function MediaAttachment({ message, mediaUrl }: MediaAttachmentProps) {
  if (message.type === "image") {
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={message.fileName ?? "Image"}
          className="max-h-64 rounded-md object-cover"
        />
      </a>
    );
  }

  if (message.type === "video") {
    return (
      <video
        controls
        className="max-h-64 w-full rounded-md"
        src={mediaUrl}
      />
    );
  }

  if (message.type === "audio") {
    return (
      <div className="flex items-center gap-3">
        <Mic className="text-primary size-4 shrink-0" />
        <audio controls className="w-full min-w-[220px]" src={mediaUrl} />
        {message.durationSeconds ? (
          <span className="text-muted text-xs">
            {Math.floor(message.durationSeconds / 60)}:
            {String(message.durationSeconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="border-hairline bg-surface-card flex items-center gap-2 rounded-md border px-3 py-2"
    >
      <FileText className="text-primary size-4" />
      <span>{message.fileName ?? "Fichier"}</span>
    </a>
  );
}
