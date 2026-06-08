"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/messaging/types";

type ConversationListProps = {
  items: ConversationListItem[];
  selectedId: string | null;
  onSelect: (conversation: ConversationListItem) => void;
};

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "À l'instant";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  if (diffMinutes < 1440) {
    return `${Math.floor(diffMinutes / 60)} h`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function conversationTitle(item: ConversationListItem): string {
  if (item.type === "group") {
    return item.name ?? "Groupe";
  }
  return item.clientName ?? "Conversation";
}

export function ConversationList({
  items,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (items.length === 0) {
    return (
      <div className="text-body-sm text-muted p-6 text-center">
        Aucune conversation pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => {
        const active = item.id === selectedId;
        const unread = item.unreadCount > 0;
        const title = conversationTitle(item);
        const isGroup = item.type === "group";

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "border-hairline hover:bg-surface-elevated flex w-full items-start gap-3 border-b px-4 py-4 text-left transition-colors",
              active && "bg-surface-elevated border-l-primary border-l-2",
              unread && !active && "bg-surface-soft/40",
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                isGroup
                  ? "bg-surface-elevated text-primary"
                  : "bg-surface-elevated text-primary",
              )}
            >
              {isGroup ? (
                <Users className="size-4" aria-hidden />
              ) : (
                initials(title)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    unread
                      ? "text-on-dark font-semibold"
                      : "text-body-strong font-medium",
                  )}
                >
                  {title}
                </p>
                <span className="text-muted shrink-0 text-xs">
                  {formatRelativeTime(item.lastMessageAt)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-muted truncate text-sm">
                  {isGroup ? (
                    <span>
                      Groupe · {item.participantCount ?? 0} participant
                      {(item.participantCount ?? 0) > 1 ? "s" : ""}
                      {item.lastMessagePreview
                        ? ` · ${item.lastMessagePreview}`
                        : ""}
                    </span>
                  ) : (
                    (item.lastMessagePreview ?? "Nouvelle conversation")
                  )}
                </p>
                {unread ? (
                  <span className="bg-primary text-on-primary flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                    {item.unreadCount > 9 ? "9+" : item.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
