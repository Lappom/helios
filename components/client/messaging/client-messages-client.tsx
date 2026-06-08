"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ConversationList } from "@/components/messaging/conversation-list";
import { MessageThread } from "@/components/messaging/message-thread";
import { useConversationRealtime } from "@/components/messaging/use-conversation-realtime";
import { Button } from "@/components/ui/button";
import {
  fetchMessages,
  markConversationReadRequest,
  sendMessageRequest,
  uploadMessageMedia,
} from "@/lib/messaging/api-client";
import type { ConversationListItem, MessageItem } from "@/lib/messaging/types";

type ClientMessagesClientProps = {
  organizationId: string;
  clerkUserId: string;
  initialConversations: ConversationListItem[];
};

export function ClientMessagesClient({
  organizationId,
  clerkUserId,
  initialConversations,
}: ClientMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] =
    useState<ConversationListItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversationId") ??
      initialConversations[0]?.id ??
      null,
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const isGroupSelected = selectedConversation?.type === "group";
  const showSidebar = conversations.length > 1;

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    let cancelled = false;

    fetchMessages(selectedId, { limit: 50 })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setMessages(payload.items);
        return markConversationReadRequest(selectedId).catch(() => undefined);
      })
      .then(() => {
        if (cancelled) {
          return;
        }
        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId ? { ...item, unreadCount: 0 } : item,
          ),
        );
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Messages indisponibles.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const threadMessages = selectedId
    ? messages.filter((message) => message.conversationId === selectedId)
    : [];

  const { publishTyping } = useConversationRealtime(
    organizationId,
    selectedId,
    clerkUserId,
    {
      onMessageNew: (message) => {
        if (message.senderClerkUserId === clerkUserId) {
          return;
        }

        setMessages((current) => {
          if (current.some((item) => item.id === message.id)) {
            return current;
          }
          return [...current, message];
        });

        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId
              ? {
                  ...item,
                  lastMessageAt: message.createdAt,
                  lastMessagePreview:
                    message.type === "text"
                      ? (message.content ?? "")
                      : message.type,
                  unreadCount: 0,
                }
              : {
                  ...item,
                  unreadCount:
                    item.id === selectedId ? 0 : item.unreadCount + 1,
                },
          ),
        );

        if (selectedId) {
          void markConversationReadRequest(selectedId, {
            messageId: message.id,
          });
        }
      },
      onMessageRead: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setConversations((current) =>
          current.map((item) =>
            item.id === selectedId
              ? { ...item, coachLastReadAt: payload.lastReadAt }
              : item,
          ),
        );
      },
      onTyping: (payload) => {
        if (payload.clerkUserId === clerkUserId) {
          return;
        }

        setTypingLabel(
          payload.isTyping
            ? isGroupSelected
              ? "Quelqu'un écrit"
              : "Votre coach écrit"
            : null,
        );
      },
    },
  );

  async function handleSend() {
    if (!selectedId || !text.trim()) {
      return;
    }

    setSending(true);
    try {
      const message = await sendMessageRequest(selectedId, {
        type: "text",
        content: text.trim(),
      });
      setMessages((current) => [...current, message]);
      setText("");
      setConversations((current) =>
        current.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                lastMessageAt: message.createdAt,
                lastMessagePreview: message.content,
              }
            : item,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  async function handleMediaFile(file: File, durationSeconds?: number) {
    if (!selectedId) {
      return;
    }

    setSending(true);
    try {
      const uploaded = await uploadMessageMedia(selectedId, file);
      const message = await sendMessageRequest(selectedId, {
        type: uploaded.mediaType,
        mediaPathname: uploaded.pathname,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        durationSeconds,
      });
      setMessages((current) => [...current, message]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
            Messages
          </h1>
          <p className="text-body-md text-muted mt-2">
            Votre fil de discussion avec votre coach apparaîtra ici.
          </p>
        </div>
        <div className="border-hairline bg-surface-card flex min-h-[420px] flex-col items-center justify-center rounded-lg border px-6 text-center">
          <p className="text-title-sm text-on-dark font-semibold">
            Pas encore de conversation
          </p>
          <p className="text-body-md text-muted mt-2 max-w-md">
            Votre coach vous contactera bientôt. Vous pourrez aussi lui écrire
            dès qu&apos;une conversation sera ouverte.
          </p>
          <Button type="button" className="mt-6" disabled>
            Écrire à mon coach
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6">
      <div>
        <h1 className="text-title-lg text-on-dark font-bold tracking-tight">
          Messages
        </h1>
        <p className="text-body-md text-muted mt-2">
          Échangez avec votre coach et consultez les annonces de groupe.
        </p>
      </div>

      <div className="border-hairline flex min-h-[560px] flex-1 overflow-hidden rounded-lg border">
        {showSidebar ? (
          <aside className="border-hairline bg-surface-card w-full max-w-[320px] shrink-0 border-r">
            <ConversationList
              items={conversations}
              selectedId={selectedId}
              onSelect={(conversation) => {
                setSelectedId(conversation.id);
                router.replace(
                  `/client/messages?conversationId=${conversation.id}`,
                );
              }}
            />
          </aside>
        ) : null}
        <MessageThread
          conversation={selectedConversation}
          messages={threadMessages}
          text={text}
          onTextChange={setText}
          onSend={() => void handleSend()}
          onFileSelect={(file) => void handleMediaFile(file)}
          onVoiceRecorded={(file, durationSeconds) =>
            void handleMediaFile(file, durationSeconds)
          }
          onTyping={(isTyping) => void publishTyping(isTyping)}
          sending={sending}
          typingLabel={typingLabel}
          peerReadAt={
            isGroupSelected ? null : selectedConversation?.coachLastReadAt
          }
          showVoice
          emptyTitle="Conversation"
          emptyDescription="Votre fil s'affichera ici."
        />
      </div>
    </div>
  );
}
