"use client";

import { cn } from "@/lib/utils";
import type { MessageItem } from "@/lib/messaging/types";
import { messageMediaUrl } from "@/lib/messaging/api-client";
import { MediaAttachment } from "@/components/messaging/media-attachment";

type MessageBubbleProps = {
  message: MessageItem;
  showSenderName?: boolean;
};

export function MessageBubble({
  message,
  showSenderName = false,
}: MessageBubbleProps) {
  const isDeleted = Boolean(message.deletedAt);

  return (
    <div
      className={cn(
        "flex w-full",
        message.isOwn ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[min(85%,420px)] rounded-lg px-4 py-3 text-body-sm",
          message.isOwn
            ? "border-primary/30 bg-primary/10 border text-on-dark"
            : "bg-surface-elevated text-body",
          isDeleted && "opacity-60 italic",
        )}
      >
        {showSenderName && !message.isOwn && message.senderDisplayName ? (
          <p className="text-primary mb-1 text-xs font-semibold">
            {message.senderDisplayName}
          </p>
        ) : null}
        {isDeleted ? (
          <p>Message supprimé</p>
        ) : message.type === "text" ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MediaAttachment
            message={message}
            mediaUrl={messageMediaUrl(message.conversationId, message.id)}
          />
        )}
        <p className="text-muted mt-2 text-xs">
          {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
