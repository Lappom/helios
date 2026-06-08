"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CheckCheck } from "lucide-react";
import type { ConversationListItem, MessageItem } from "@/lib/messaging/types";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { MessageInput } from "@/components/messaging/message-input";
import { TypingIndicator } from "@/components/messaging/typing-indicator";

type MessageThreadProps = {
  conversation: ConversationListItem | null;
  messages: MessageItem[];
  text: string;
  onTextChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (file: File) => void;
  onVoiceRecorded: (file: File, durationSeconds: number) => void;
  onTyping?: (isTyping: boolean) => void;
  sending?: boolean;
  typingLabel?: string | null;
  peerReadAt?: string | null;
  showVoice?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  headerActions?: ReactNode;
};

function threadTitle(conversation: ConversationListItem): string {
  if (conversation.type === "group") {
    return conversation.name ?? "Groupe";
  }
  return conversation.clientName ?? "Conversation";
}

function threadSubtitle(conversation: ConversationListItem): string {
  if (conversation.type === "group") {
    const count = conversation.participantCount ?? 0;
    return `${count} participant${count > 1 ? "s" : ""}`;
  }
  return conversation.clientEmail ?? "";
}

export function MessageThread({
  conversation,
  messages,
  text,
  onTextChange,
  onSend,
  onFileSelect,
  onVoiceRecorded,
  onTyping,
  sending,
  typingLabel,
  peerReadAt,
  showVoice = true,
  emptyTitle = "Sélectionnez une conversation",
  emptyDescription = "Choisissez un client dans la liste pour afficher le fil.",
  headerActions,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isGroup = conversation?.type === "group";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div className="bg-surface-card flex flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="text-title-md text-on-dark font-semibold">{emptyTitle}</p>
        <p className="text-body-md text-muted mt-2 max-w-md">{emptyDescription}</p>
      </div>
    );
  }

  const lastMessageAt = messages.at(-1)?.createdAt ?? null;
  const isRead =
    !isGroup &&
    peerReadAt &&
    lastMessageAt &&
    Date.parse(peerReadAt) >= Date.parse(lastMessageAt);

  return (
    <div className="bg-surface-card flex min-h-0 flex-1 flex-col">
      <div className="border-hairline flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-title-sm text-on-dark truncate font-semibold">
            {threadTitle(conversation)}
          </h2>
          <p className="text-body-sm text-muted truncate">
            {threadSubtitle(conversation)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {isRead ? (
            <div className="text-accent-emerald flex items-center gap-1 text-xs">
              <CheckCheck className="size-4" />
              Lu
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-body-sm text-muted py-8 text-center">
            {isGroup
              ? "Aucun message dans ce groupe. Envoyez une annonce à tous les participants."
              : "Aucun message pour l'instant. Lancez la conversation."}
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              showSenderName={isGroup}
            />
          ))
        )}
        {typingLabel ? <TypingIndicator label={typingLabel} /> : null}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        text={text}
        onTextChange={onTextChange}
        onSend={onSend}
        onTyping={onTyping}
        onFileSelect={onFileSelect}
        onVoiceRecorded={onVoiceRecorded}
        sending={sending}
        showVoice={showVoice}
      />
    </div>
  );
}
